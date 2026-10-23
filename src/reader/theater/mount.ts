// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_CSS } from "./styles.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_IDLE_MS, resolveTheaterSurface, shouldSuppressControl, type TheaterSurface } from "./rules.ts";

export type { TheaterSurface };

/**
 * Idle clock. Production uses the frame's window. Tests pass a manual clock.
 * The handle is opaque so a fake clock can use an object id.
 */
export interface TheaterClock {
  set(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
}

export interface MountTheaterOptions {
  /**
   * Window frame. Mock: `.ob-window` or `.ob-phone-screen`.
   * Receives `is-theater`, `sz-xl`, and `is-chrome`.
   */
  frame: HTMLElement;
  /**
   * Content pane the room is painted into. Mock: `.ob-content` or `.ob-mcontent`.
   * Defaults to `frame`.
   *
   * When the reader can be torn down by a reading-view re-render, pass a stage
   * the shell already appended to `activeDocument.body`. This module does not
   * register a MarkdownRenderChild and does not parent the room under the
   * post-processor host itself.
   */
  stage?: HTMLElement;
  /** Desk spread or phone column. Inferred from the frame when omitted. */
  surface?: TheaterSurface;
  /** User left via Exit or Esc. Not called from `destroy`. */
  onExit?: () => void;
  /** Pill label. Default "Exit". The key mark stays Esc. */
  exitLabel?: string;
  /** Milliseconds before the Exit pill hides. Default 2000. */
  idleMs?: number;
  /** Force reduced motion. Otherwise read `prefers-reduced-motion` on the frame's window. */
  reducedMotion?: boolean;
  clock?: TheaterClock;
}

export interface TheaterHandle {
  readonly active: boolean;
  readonly surface: TheaterSurface;
  readonly exitButton: HTMLElement;
  readonly root: HTMLElement;
  exit(): void;
  destroy(): void;
}

interface DocSession {
  style: HTMLElement;
  frames: Set<HTMLElement>;
}

const sessions = new WeakMap<Document, DocSession>();
const live = new WeakMap<HTMLElement, TheaterHandle>();

/**
 * Mount theme-matched theater on a reader frame the shell already painted.
 * Locked to XL. The pill is Exit and Esc. Book size, Highlight, Remark, and
 * Ask stay off until Exit. A settled size control can also call
 * `setTheaterLocked(true)` while this session is active so its inline page
 * box matches the XL theater spread.
 *
 * Reads `frame.ownerDocument` (the window that owns the frame, including a
 * popout). Does not read the ambient global object and does not enter fullscreen.
 */
export function mountTheater(options: MountTheaterOptions): TheaterHandle {
  const frame = options.frame;
  const stage = options.stage ?? frame;
  const doc = frame.ownerDocument;
  const surface = options.surface ?? resolveTheaterSurface(
    frame.className,
    frame.getAttribute("data-surface"),
  );
  const reduced = motionReduced(doc.defaultView, options.reducedMotion);
  const idleMs = resolveIdle(options.idleMs);
  const clock = options.clock ?? clockFromView(doc.defaultView);
  const place = theaterPlace(surface, frame, stage);

  live.get(frame)?.destroy();

  const docSession = ensureDoc(doc);
  docSession.frames.add(frame);

  let closed = false;
  let chromeOn = true;
  let timer: unknown = null;
  const unlisten: Array<() => void> = [];
  const saved: Array<{ el: HTMLElement; hidden: boolean }> = [];
  const stageHadRoom = stage.classList.contains("atomic-theater-stage");

  frame.classList.add("atomic-theater-root", "is-theater", "sz-xl", "is-chrome");
  if (reduced) frame.classList.add("is-reduced");
  frame.setAttribute("data-theater", "on");
  frame.setAttribute("data-atomic-theater-surface", surface);
  frame.setAttribute("data-atomic-theater-size", "xl");
  frame.setAttribute("data-atomic-theater-place", place);
  stage.classList.add("atomic-theater-stage");

  const layers = buildLayers(doc, surface, options.exitLabel);
  const first = stage.firstChild;
  if (first) stage.insertBefore(layers.root, first);
  else stage.appendChild(layers.root);
  suppressControls(frame, layers.root, saved);
  syncDocument(doc);

  const arm = (): void => {
    if (timer != null) clock.clear(timer);
    timer = null;
    if (closed || !chromeOn) return;
    timer = clock.set(() => {
      timer = null;
      if (closed) return;
      if (!frame.isConnected || !stage.isConnected) {
        leave(false);
        return;
      }
      setChrome(false);
    }, idleMs);
  };

  const setChrome = (on: boolean): void => {
    chromeOn = on;
    frame.classList.toggle("is-chrome", on);
    if (on) {
      layers.chrome.removeAttribute("aria-hidden");
      layers.exitButton.removeAttribute("tabindex");
    } else {
      layers.chrome.setAttribute("aria-hidden", "true");
      layers.exitButton.setAttribute("tabindex", "-1");
    }
    syncDocument(doc);
  };

  const reveal = (): void => {
    if (closed) return;
    setChrome(true);
    arm();
  };

  const onActivity = (): void => {
    reveal();
  };
  const onExitClick = (event: Event): void => {
    event.preventDefault();
    leave(true);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (closed) return;
    if (event.key !== "Escape" && event.key !== "Esc") return;
    event.preventDefault();
    event.stopPropagation();
    leave(true);
  };

  unlisten.push(listen(frame, "pointermove", onActivity));
  unlisten.push(listen(frame, "pointerdown", onActivity));
  unlisten.push(listen(doc, "pointermove", onActivity));
  unlisten.push(listen(doc, "pointerdown", onActivity));
  unlisten.push(listen(layers.exitButton, "click", onExitClick));
  const view = doc.defaultView;
  if (view) {
    view.addEventListener("keydown", onKey, true);
    unlisten.push(() => view.removeEventListener("keydown", onKey, true));
  }

  const handle: TheaterHandle = {
    surface,
    exitButton: layers.exitButton,
    root: layers.root,
    get active() {
      return !closed;
    },
    exit() {
      leave(true);
    },
    destroy() {
      leave(false);
    },
  };
  live.set(frame, handle);
  arm();

  function leave(user: boolean): void {
    if (closed) return;
    closed = true;
    if (timer != null) clock.clear(timer);
    timer = null;
    for (const off of unlisten) off();
    unlisten.length = 0;
    for (const item of saved) item.el.hidden = item.hidden;
    saved.length = 0;
    layers.root.remove();
    frame.classList.remove("atomic-theater-root", "is-theater", "sz-xl", "is-chrome", "is-reduced");
    frame.removeAttribute("data-theater");
    frame.removeAttribute("data-atomic-theater-surface");
    frame.removeAttribute("data-atomic-theater-size");
    frame.removeAttribute("data-atomic-theater-place");
    if (!stageHadRoom) stage.classList.remove("atomic-theater-stage");
    docSession.frames.delete(frame);
    if (live.get(frame) === handle) live.delete(frame);
    if (docSession.frames.size === 0) {
      docSession.style.remove();
      sessions.delete(doc);
    }
    syncDocument(doc);
    if (user) options.onExit?.();
  }

  return handle;
}

export function isTheaterOn(frame: HTMLElement): boolean {
  return live.get(frame)?.active ?? false;
}

function theaterPlace(
  surface: TheaterSurface,
  frame: HTMLElement,
  stage: HTMLElement,
): "desk" | "content" | "screen" {
  switch (surface) {
    case "desk":
      return "desk";
    case "phone":
      if (stage === frame || stage.classList.contains("ob-phone-screen")) return "screen";
      return "content";
    default: {
      const neverSurface: never = surface;
      return neverSurface;
    }
  }
}

function resolveIdle(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  return THEATER_IDLE_MS;
}

function motionReduced(view: Window | null, forced: boolean | undefined): boolean {
  if (forced === true) return true;
  if (forced === false) return false;
  if (!view?.matchMedia) return false;
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clockFromView(view: Window | null): TheaterClock {
  if (!view) {
    return {
      set: () => 0,
      clear: () => undefined,
    };
  }
  return {
    set: (fn, ms) => view.setTimeout(fn, ms),
    clear: (id) => {
      view.clearTimeout(id as number);
    },
  };
}

function ensureDoc(doc: Document): DocSession {
  const existing = sessions.get(doc);
  if (existing) return existing;
  const style = doc.createElement("style");
  style.setAttribute("data-atomic-theater-style", "on");
  style.textContent = THEATER_CSS;
  const head = doc.head ?? doc.documentElement;
  head.appendChild(style);
  const created: DocSession = { style, frames: new Set() };
  sessions.set(doc, created);
  return created;
}

function syncDocument(doc: Document): void {
  const root = doc.documentElement;
  const frames = sessions.get(doc)?.frames;
  if (!frames || frames.size === 0) {
    root.classList.remove("atomic-theater-dim", "atomic-theater-chrome", "is-reduced");
    return;
  }
  root.classList.add("atomic-theater-dim");
  let chrome = false;
  let reduced = false;
  for (const frame of frames) {
    if (frame.classList.contains("is-chrome")) chrome = true;
    if (frame.classList.contains("is-reduced")) reduced = true;
  }
  root.classList.toggle("atomic-theater-chrome", chrome);
  root.classList.toggle("is-reduced", reduced);
}

interface TheaterLayers {
  root: HTMLElement;
  chrome: HTMLElement;
  exitButton: HTMLElement;
}

function buildLayers(doc: Document, surface: TheaterSurface, exitLabel: string | undefined): TheaterLayers {
  const root = make(doc, "div", "atomic-theater-layers", {
    "data-testid": "atomic-theater",
  });
  root.appendChild(make(doc, "div", "th-ambient", { "aria-hidden": "true" }));
  const key = make(doc, "div", "th-key", { "aria-hidden": "true" });
  const curtainL = make(doc, "div", "curtain is-l", { "aria-hidden": "true" });
  const curtainR = make(doc, "div", "curtain is-r", { "aria-hidden": "true" });
  const poolL = make(doc, "div", "lamp-pool is-l", { "aria-hidden": "true" });
  const poolR = make(doc, "div", "lamp-pool is-r", { "aria-hidden": "true" });
  root.appendChild(key);
  root.appendChild(curtainL);
  root.appendChild(curtainR);
  root.appendChild(poolL);
  root.appendChild(poolR);

  const chrome = make(doc, "div", "th-chrome", {
    "data-testid": "atomic-theater-chrome",
  });
  const exitButton = make(doc, "button", "th-exit", {
    type: "button",
    "data-testid": "atomic-theater-exit",
    "data-act": "theater-exit",
    "aria-label": "Exit theater",
  });
  const label = make(doc, "span", "th-exit-label");
  label.textContent = exitLabel && exitLabel.trim() ? exitLabel.trim() : "Exit";
  const kbd = make(doc, "span", "kbd");
  kbd.textContent = "Esc";
  exitButton.appendChild(label);
  exitButton.appendChild(kbd);
  chrome.appendChild(exitButton);
  root.appendChild(chrome);

  const hint = make(doc, "div", "th-hint", { "aria-hidden": "true" });
  hint.textContent = "Chrome hides after 2 s. Move the mouse to show it.";
  root.appendChild(hint);

  switch (surface) {
    case "desk":
      break;
    case "phone":
      hint.hidden = true;
      key.hidden = true;
      curtainL.hidden = true;
      curtainR.hidden = true;
      poolL.hidden = true;
      poolR.hidden = true;
      break;
    default: {
      const neverSurface: never = surface;
      return neverSurface;
    }
  }

  return { root, chrome, exitButton };
}

function suppressControls(
  frame: HTMLElement,
  layers: HTMLElement,
  saved: Array<{ el: HTMLElement; hidden: boolean }>,
): void {
  walk(frame, layers, (el) => {
    if (!shouldSuppressControl({
      className: el.className,
      testId: el.getAttribute("data-testid"),
      act: el.getAttribute("data-act"),
    })) return;
    saved.push({ el, hidden: el.hidden });
    el.hidden = true;
  });
}

function walk(root: HTMLElement, skip: HTMLElement, visit: (el: HTMLElement) => void): void {
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (!child || !isHtmlElement(child) || child === skip) continue;
    visit(child);
    walk(child, skip, visit);
  }
}

function isHtmlElement(node: Element): node is HTMLElement {
  const probed = node as HTMLElement & { instanceOf?: (ctor: unknown) => boolean };
  if (typeof probed.instanceOf === "function" && typeof HTMLElement === "function") {
    return probed.instanceOf(HTMLElement);
  }
  return node.nodeType === 1;
}

function make(doc: Document, tag: string, className: string, attrs?: Record<string, string>): HTMLElement {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  }
  return el;
}

function listen(target: EventTarget, type: string, fn: (event: Event) => void): () => void {
  target.addEventListener(type, fn);
  return () => target.removeEventListener(type, fn);
}
