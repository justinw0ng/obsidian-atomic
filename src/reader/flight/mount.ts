import {
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  bookPx,
  fallbackScale,
  flightVars,
  resolveFlightLayout,
  resolveFlightMotion,
  safeCoverColor,
  unionBoxes,
  type FlightBox,
  type FlightLayout,
  type FlightMotion,
  type FlightVars,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./geometry.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { spreadFromPainted, type OpenBookPage, type PaintedPage } from "./page.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { OPEN_BOOK_FLIGHT_CSS } from "./styles.ts";

/** Shell pages. Desktop measures both leaves; phone measures the column. */
export const OPEN_BOOK_PAGE_SELECTOR = ".atomic-page";

export const OPEN_BOOK_HINT = "Tap to skip";

const STYLE_ID = "atomic-open-flight-style";

export type OpenBookFlightReason = "landed" | "skipped" | "reduced" | "aborted";

export type OpenBookLandReason = Exclude<OpenBookFlightReason, "aborted">;

export type OpenBookCover = {
  title: string;
  author?: string;
  /** Spine or cover fill. Ignored unless it is a plain color. */
  color?: string;
  ink?: string;
};

export type OpenBookFlightRequest = {
  /**
   * Window that owns the tap. Pass `openBookFlightView()` so the overlay
   * is appended to `activeDocument.body`, including a popout.
   */
  view: Window;
  /** Cover `getBoundingClientRect` copied before the reader opens. */
  from: FlightBox;
  cover: OpenBookCover;
  /** Page the shell would show if the destination has no text yet. */
  page: OpenBookPage;
  /**
   * Reader root that already contains `.atomic-page`. The flight measures
   * those rects and copies their lines. It is not a parent of the overlay.
   */
  destination: HTMLElement;
  layout?: FlightLayout;
  /** `true` forces the instant path. The OS reduced-motion setting does too. */
  reducedMotion?: boolean;
  hint?: string;
};

export type OpenBookFlightHandle = {
  /** Null on the direct-open path. */
  overlay: HTMLElement | null;
  abort: () => void;
  skip: () => void;
  done: Promise<OpenBookFlightReason>;
};

type FlightSession = {
  finish: (reason: OpenBookFlightReason) => void;
};

const sessions = new WeakMap<Document, FlightSession>();

/** Tap window. Reads Obsidian `activeWindow`, then `activeDocument`. */
export function openBookFlightView(): Window | null {
  if (typeof activeWindow !== "undefined" && activeWindow?.document?.body) {
    return activeWindow;
  }
  const active = readActiveDocument();
  const view = active?.defaultView ?? null;
  if (view?.document?.body) return view;
  return null;
}

/**
 * Body for the overlay. Prefers `activeDocument.body` when that document is
 * the tap window, so a MarkdownRenderChild unload cannot remove the flight.
 */
export function flightOverlayBody(view: Window, active: Document | null): HTMLElement {
  if (active?.body && active.defaultView === view) return active.body;
  const body = view.document?.body;
  if (!body) throw new Error("Open Book flight needs a document body");
  return body;
}

export function abortOpenBookFlight(view: Window): void {
  const doc = view.document;
  if (!doc) return;
  sessions.get(doc)?.finish("aborted");
}

export function mountOpenBookFlight(
  request: OpenBookFlightRequest,
  onLand?: (reason: OpenBookLandReason) => void,
): OpenBookFlightHandle {
  const view = request.view;
  const body = flightOverlayBody(view, readActiveDocument());
  const doc = body.ownerDocument ?? view.document;
  sessions.get(doc)?.finish("aborted");

  const layout = resolveFlightLayout(request.layout, view.innerWidth || 0);
  const motion = resolveFlightMotion({
    reducedMotion:
      request.reducedMotion === true ||
      mediaMatches(view, "(prefers-reduced-motion: reduce)"),
    coarsePointer: mediaMatches(view, "(pointer: coarse)"),
    layout,
  });

  if (motion === "reduced") {
    onLand?.("reduced");
    return {
      overlay: null,
      abort() {},
      skip() {},
      done: Promise.resolve("reduced"),
    };
  }

  ensureFlightStyles(doc);
  const built = buildOverlay(doc, request, layout, motion);
  const overlay = built.overlay;
  body.appendChild(overlay);

  let closed = false;
  let timer = 0;
  let frame = 0;
  let resolveDone: (reason: OpenBookFlightReason) => void = () => {};
  const done = new Promise<OpenBookFlightReason>((resolve) => {
    resolveDone = resolve;
  });
  let session: FlightSession | undefined;

  function finish(reason: OpenBookFlightReason): void {
    if (closed) return;
    closed = true;
    if (timer) view.clearTimeout(timer);
    if (frame && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(frame);
    }
    overlay.removeEventListener("click", onClick);
    view.removeEventListener("keydown", onKey, true);
    view.removeEventListener("pagehide", onLeave);
    overlay.remove();
    if (session && sessions.get(doc) === session) sessions.delete(doc);
    resolveDone(reason);
    if (reason !== "aborted") onLand?.(reason);
  }

  function onClick(): void {
    finish("skipped");
  }

  function onLeave(): void {
    finish("aborted");
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    finish("skipped");
  }

  session = { finish };
  sessions.set(doc, session);
  overlay.addEventListener("click", onClick);
  view.addEventListener("keydown", onKey, true);
  view.addEventListener("pagehide", onLeave);

  const start = (spread: FlightBox | null): void => {
    if (closed) return;
    const page = spreadFromPainted(paintedPages(request.destination), request.page);
    fillLeaf(doc, built.left, page.headingLeft, page.left);
    fillLeaf(doc, built.right, page.headingRight, page.right);
    overlay.setAttribute("data-page", String(page.page));
    applyVars(
      built.book,
      flightVars({
        from: request.from,
        dest: spread,
        host: hostSize(view, overlay),
        book: bookPx(layout),
        fallbackToScale: fallbackScale(layout),
      }),
    );
    overlay.classList.add("is-on");
    void overlay.offsetWidth;
    overlay.classList.add("is-playing");
    timer = view.setTimeout(() => finish("landed"), FLIGHT_SKIP_MS);
  };

  const spread = spreadBox(request.destination);
  if (spread || typeof view.requestAnimationFrame !== "function") {
    start(spread);
  } else {
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      if (closed) return;
      start(spreadBox(request.destination));
    });
  }

  return {
    overlay,
    abort: () => finish("aborted"),
    skip: () => finish("skipped"),
    done,
  };
}

function readActiveDocument(): Document | null {
  if (typeof activeDocument === "undefined") return null;
  return activeDocument;
}

function mediaMatches(view: Window, query: string): boolean {
  if (typeof view.matchMedia !== "function") return false;
  return view.matchMedia(query).matches;
}

function ensureFlightStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = OPEN_BOOK_FLIGHT_CSS;
  const head = doc.head ?? doc.body;
  if (head) head.appendChild(style);
}

function hostSize(view: Window, overlay: HTMLElement): { width: number; height: number } {
  const rect = overlay.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) return { width: rect.width, height: rect.height };
  if (view.innerWidth > 0 && view.innerHeight > 0) {
    return { width: view.innerWidth, height: view.innerHeight };
  }
  return { width: 0, height: 0 };
}

function spreadBox(root: ParentNode): FlightBox | null {
  return unionBoxes(pageBoxes(root));
}

function pageBoxes(root: ParentNode): FlightBox[] {
  return elements(root, OPEN_BOOK_PAGE_SELECTOR).map((el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  });
}

function paintedPages(root: ParentNode): PaintedPage[] {
  return elements(root, OPEN_BOOK_PAGE_SELECTOR).map((el) => ({
    page: readPageNumber(el.getAttribute("data-page")),
    lines: paragraphLines(el),
  }));
}

function readPageNumber(value: string | null): number | null {
  if (!value) return null;
  const page = Number(value);
  if (!Number.isFinite(page) || page <= 0) return null;
  return page;
}

function paragraphLines(el: HTMLElement): string[] {
  const lines = elements(el, "p")
    .map((para) => (para.textContent ?? "").trim())
    .filter((line) => line.length > 0);
  if (lines.length > 0) return lines;
  const text = (el.textContent ?? "").trim();
  return text ? [text] : [];
}

function elements(root: ParentNode, selector: string): HTMLElement[] {
  const found: HTMLElement[] = [];
  root.querySelectorAll(selector).forEach((node) => {
    if (isHtmlElement(node)) found.push(node);
  });
  return found;
}

function isHtmlElement(node: Node): node is HTMLElement {
  if (typeof node.instanceOf === "function") return node.instanceOf(HTMLElement);
  return node.nodeType === 1;
}

function applyVars(book: HTMLElement, vars: FlightVars): void {
  book.style.setProperty("--from-x", vars.fromX);
  book.style.setProperty("--from-y", vars.fromY);
  book.style.setProperty("--from-s", vars.fromS);
  book.style.setProperty("--to-x", vars.toX);
  book.style.setProperty("--to-y", vars.toY);
  book.style.setProperty("--to-s", vars.toS);
}

type BuiltOverlay = {
  overlay: HTMLElement;
  book: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
};

function buildOverlay(
  doc: Document,
  request: OpenBookFlightRequest,
  layout: FlightLayout,
  motion: Exclude<FlightMotion, "reduced">,
): BuiltOverlay {
  const overlay = doc.createElement("div");
  overlay.className = "atomic-open-flight";
  overlay.classList.add(layout === "phone" ? "is-phone" : "is-desktop");
  if (motion === "flat") overlay.classList.add("is-flat");
  overlay.setAttribute("data-testid", "atomic-open-flight");
  overlay.setAttribute("data-overlay-host", "window");
  overlay.setAttribute("data-motion", motion);
  overlay.setAttribute("role", "presentation");

  const color = safeCoverColor(request.cover.color);
  const ink = safeCoverColor(request.cover.ink);
  if (color) overlay.style.setProperty("--atomic-open-cover", color);
  if (ink) overlay.style.setProperty("--atomic-open-ink", ink);

  const blur = doc.createElement("div");
  blur.className = "atomic-open-blur";
  const warm = doc.createElement("div");
  warm.className = "atomic-open-warm";
  warm.setAttribute("aria-hidden", "true");
  const stage = doc.createElement("div");
  stage.className = "atomic-open-stage";
  const book = doc.createElement("div");
  book.className = "atomic-open-book";
  book.setAttribute("data-testid", "atomic-open-book");

  const back = doc.createElement("div");
  back.className = "atomic-open-back";
  const left = leaf(doc, "left");
  const right = leaf(doc, "right");
  const gutter = doc.createElement("div");
  gutter.className = "atomic-open-gutter";
  gutter.setAttribute("aria-hidden", "true");
  const stack = doc.createElement("div");
  stack.className = "atomic-open-stack";
  for (let index = 0; index < FLIP_LEAVES.length; index++) {
    const flip = doc.createElement("div");
    flip.className = "atomic-open-flip";
    stack.appendChild(flip);
  }
  const cover = doc.createElement("div");
  cover.className = "atomic-open-cover";
  const face = doc.createElement("div");
  face.className = "atomic-open-cover-face";
  const title = doc.createElement("span");
  title.className = "atomic-open-title";
  title.textContent = request.cover.title;
  face.appendChild(title);
  if (request.cover.author) {
    const author = doc.createElement("span");
    author.className = "atomic-open-author";
    author.textContent = request.cover.author;
    face.appendChild(author);
  }
  const inside = doc.createElement("div");
  inside.className = "atomic-open-cover-in";
  cover.appendChild(face);
  cover.appendChild(inside);

  book.append(back, left, right, gutter, stack, cover);
  stage.appendChild(book);

  const hint = doc.createElement("div");
  hint.className = "atomic-open-hint";
  hint.setAttribute("data-testid", "atomic-open-flight-hint");
  hint.textContent = request.hint?.trim() || OPEN_BOOK_HINT;

  overlay.append(blur, warm, stage, hint);
  return { overlay, book, left, right };
}

function leaf(doc: Document, side: "left" | "right"): HTMLElement {
  const node = doc.createElement("div");
  node.className = `atomic-open-leaf is-${side}`;
  node.setAttribute("data-testid", "atomic-open-leaf");
  node.setAttribute("data-side", side);
  return node;
}

function fillLeaf(
  doc: Document,
  leafNode: HTMLElement,
  heading: string | undefined,
  lines: readonly string[],
): void {
  const nodes: HTMLElement[] = [];
  if (heading) {
    const label = doc.createElement("p");
    label.className = "atomic-open-k";
    label.textContent = heading;
    nodes.push(label);
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line) continue;
    const para = doc.createElement("p");
    para.setAttribute("data-line", String(index));
    para.textContent = line;
    nodes.push(para);
  }
  leafNode.replaceChildren(...nodes);
}
