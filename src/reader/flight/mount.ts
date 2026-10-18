import {
  FLIGHT_SETTLE_MS,
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  PAGE_RIBS,
  QUIRE_EDGES,
  REDUCED_FADE_MS,
  flightZoom,
  resolveFlightLayout,
  resolveFlightMotion,
  safeCoverColor,
  unionBoxes,
  type FlightBox,
  type FlightLayout,
  type FlightMotion,
  type FlightZoom,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./geometry.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { spreadFromPainted, type OpenBookPage, type PaintedPage } from "./page.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { OPEN_BOOK_FLIGHT_CSS } from "./styles.ts";

/**
 * Pages the flight measures. `.atomic-page` is the fixture host.
 * `.atomic-reader-page` is the live shell page.
 */
export const OPEN_BOOK_PAGE_SELECTOR = ".atomic-page, .atomic-reader-page";

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
   * Reader root that already contains the live page. The flight measures
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

  ensureFlightStyles(doc);
  const built = buildOverlay(doc, request, layout, motion);
  const overlay = built.overlay;
  request.destination.appendChild(overlay);

  let closed = false;
  let timer = 0;
  let settle = 0;
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
    if (settle) view.clearTimeout(settle);
    if (frame && typeof view.cancelAnimationFrame === "function") {
      view.cancelAnimationFrame(frame);
    }
    overlay.removeEventListener("click", onClick);
    view.removeEventListener("keydown", onKey, true);
    view.removeEventListener("pagehide", onLeave);
    overlay.remove();
    request.destination.dispatchEvent(new CustomEvent("atomic-flight-done", { bubbles: true }));
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
    const marked = readPageNumber(request.destination.getAttribute("data-page"));
    overlay.setAttribute("data-page", String(marked ?? page.page));
    if (motion === "reduced") {
      overlay.classList.add("is-on");
      timer = view.setTimeout(() => finish("reduced"), REDUCED_FADE_MS);
      return;
    }
    applyZoom(built.camera, zoomFor(request.destination, spread), request.destination);
    overlay.classList.add("is-on");
    void overlay.offsetWidth;
    overlay.classList.add("is-playing");
    timer = view.setTimeout(() => finish("landed"), FLIGHT_SKIP_MS);
    settle = view.setTimeout(() => {
      settle = 0;
      if (!closed) overlay.classList.add("is-settling");
    }, FLIGHT_SETTLE_MS);
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

function livePages(root: ParentNode): HTMLElement[] {
  return elements(root, OPEN_BOOK_PAGE_SELECTOR).filter((el) => !belongsToFlight(el));
}

function pageBoxes(root: ParentNode): FlightBox[] {
  return livePages(root).map((el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  });
}

function paintedPages(root: ParentNode): PaintedPage[] {
  return livePages(root).map((el) => ({
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

function applyZoom(camera: HTMLElement, zoom: FlightZoom, destination: HTMLElement): void {
  camera.style.setProperty("--flight-ox", zoom.originX);
  camera.style.setProperty("--flight-oy", zoom.originY);
  camera.style.setProperty("--flight-from", zoom.fromScale);
  camera.style.setProperty("--flight-cover-x", zoom.coverX);
  camera.style.setProperty("--flight-cover-y", zoom.coverY);
  camera.style.setProperty("--flight-cover-w", zoom.coverW);
  camera.style.setProperty("--flight-cover-h", zoom.coverH);
  const host = destination.getBoundingClientRect();
  const recto = rectoBox(destination);
  if (!recto || host.width <= 0) return;
  camera.style.setProperty("--flight-recto-x", px(recto.x - host.left));
  camera.style.setProperty("--flight-recto-y", px(recto.y - host.top));
  camera.style.setProperty("--flight-recto-w", px(recto.width));
  camera.style.setProperty("--flight-recto-h", px(recto.height));
}

function px(value: number): string {
  return `${Math.round(value)}px`;
}

function rectoBox(root: ParentNode): FlightBox | null {
  const pages = livePages(root);
  const recto = pages.find((el) => el.classList.contains("is-recto")) ?? pages[pages.length - 1];
  if (!recto) return null;
  const rect = recto.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function zoomFor(destination: HTMLElement, spread: FlightBox | null): FlightZoom {
  const host = destination.getBoundingClientRect();
  return flightZoom({
    host: { x: host.left, y: host.top, width: host.width, height: host.height },
    spread,
  });
}

type BuiltOverlay = {
  overlay: HTMLElement;
  camera: HTMLElement;
};

function buildOverlay(
  doc: Document,
  request: OpenBookFlightRequest,
  layout: FlightLayout,
  motion: FlightMotion,
): BuiltOverlay {
  const overlay = doc.createElement("div");
  overlay.className = "atomic-open-flight";
  overlay.classList.add(layout === "phone" ? "is-phone" : "is-desktop");
  overlay.setAttribute("data-open", layout === "phone" ? "page" : "spread");
  if (motion === "flat") overlay.classList.add("is-flat");
  if (motion === "reduced") overlay.classList.add("is-reduced");
  overlay.setAttribute("data-testid", "atomic-open-flight");
  overlay.setAttribute("data-overlay-host", "leaf");
  overlay.setAttribute("data-motion", motion);
  overlay.setAttribute("data-zoom", motion === "reduced" ? "fade" : "out");
  overlay.setAttribute("role", "presentation");

  const color = safeCoverColor(request.cover.color);
  const ink = safeCoverColor(request.cover.ink);
  if (color) overlay.style.setProperty("--atomic-open-cover", color);
  if (ink) overlay.style.setProperty("--atomic-open-ink", ink);

  if (motion === "reduced") return { overlay, camera: overlay };

  const camera = doc.createElement("div");
  camera.className = "atomic-flight-camera";
  camera.setAttribute("data-testid", "atomic-flight-camera");
  const snapshot = snapshotReader(doc, request.destination);
  snapshot.classList.add("atomic-flight-snapshot");
  snapshot.setAttribute("data-testid", "atomic-flight-snapshot");
  camera.appendChild(snapshot);

  const veil = doc.createElement("div");
  veil.className = "atomic-flight-veil";
  const stage = doc.createElement("div");
  stage.className = "atomic-flight-stage";
  stage.setAttribute("aria-hidden", "true");
  const volume = doc.createElement("div");
  volume.className = "atomic-flight-volume";
  const cast = doc.createElement("div");
  cast.className = "atomic-flight-cast";
  const gutter = doc.createElement("div");
  gutter.className = "atomic-flight-gutter";
  const flips = doc.createElement("div");
  flips.className = "atomic-flight-flips";
  const turning = liveSide(request.destination, "recto");
  for (let leaf = FLIP_LEAVES.length - 1; leaf >= 0; leaf -= 1) {
    flips.appendChild(buildLeaf(doc, turning, leaf));
  }
  volume.append(
    cast,
    buildSheet(doc, request.destination, "left"),
    buildSheet(doc, request.destination, "right"),
    gutter,
    flips,
    buildCover(doc, request.cover),
    buildQuire(doc, "left"),
    buildQuire(doc, "right"),
  );
  stage.appendChild(volume);

  const hint = doc.createElement("div");
  hint.className = "atomic-open-hint";
  hint.setAttribute("data-testid", "atomic-open-flight-hint");
  hint.textContent = request.hint?.trim() || OPEN_BOOK_HINT;

  camera.append(veil, stage);
  overlay.append(camera, hint);
  return { overlay, camera };
}

function buildCover(doc: Document, cover: OpenBookCover): HTMLElement {
  const node = doc.createElement("div");
  node.className = "atomic-flight-cover";
  const edge = doc.createElement("div");
  edge.className = "atomic-flight-cover-edge";
  const face = doc.createElement("div");
  face.className = "atomic-flight-cover-face";
  const title = doc.createElement("span");
  title.className = "atomic-flight-title";
  title.textContent = cover.title;
  face.appendChild(title);
  if (cover.author) {
    const author = doc.createElement("span");
    author.className = "atomic-flight-author";
    author.textContent = cover.author;
    face.appendChild(author);
  }
  const inside = doc.createElement("div");
  inside.className = "atomic-flight-cover-in";
  node.append(edge, face, inside);
  return node;
}

/** Spine rib is the outer joint. Higher ribs chain toward the free edge. */
function buildLeaf(doc: Document, turning: HTMLElement | null, leaf: number): HTMLElement {
  const flip = doc.createElement("div");
  flip.className = "atomic-flight-flip";
  flip.setAttribute("data-leaf", String(leaf));
  const contact = doc.createElement("div");
  contact.className = "atomic-flight-contact";
  flip.append(contact, buildRib(doc, turning, 0));
  return flip;
}

function buildRib(doc: Document, turning: HTMLElement | null, rib: number): HTMLElement {
  const node = doc.createElement("div");
  node.className = "atomic-flight-rib";
  node.setAttribute("data-rib", String(rib));
  node.style.setProperty("--rib", String(rib));
  node.style.setProperty("--rib-shift", `${-rib * 100}%`);
  const face = doc.createElement("div");
  face.className = "atomic-flight-rib-face";
  const clip = doc.createElement("div");
  clip.className = "atomic-flight-rib-clip";
  const page = turning ? clonePage(doc, turning) : null;
  if (page) clip.appendChild(page);
  face.appendChild(clip);
  const back = doc.createElement("div");
  back.className = "atomic-flight-rib-back";
  node.append(face, back);
  if (rib + 1 < PAGE_RIBS) node.appendChild(buildRib(doc, turning, rib + 1));
  else {
    const edge = doc.createElement("div");
    edge.className = "atomic-flight-paper-edge";
    node.appendChild(edge);
  }
  return node;
}

function buildSheet(doc: Document, destination: HTMLElement, side: "left" | "right"): HTMLElement {
  const sheet = doc.createElement("div");
  sheet.className = `atomic-flight-sheet is-${side}`;
  const source = liveSide(destination, side === "left" ? "verso" : "recto");
  const clone = source ? clonePage(doc, source) : null;
  if (clone) sheet.appendChild(clone);
  return sheet;
}

function buildQuire(doc: Document, side: "left" | "right"): HTMLElement {
  const quire = doc.createElement("div");
  quire.className = `atomic-flight-quire is-${side}`;
  for (let edge = 0; edge < QUIRE_EDGES; edge += 1) {
    const sheet = doc.createElement("div");
    sheet.className = "atomic-flight-edge";
    sheet.style.setProperty("--edge-x", `${edge * 1.6}px`);
    sheet.style.setProperty("--edge-inset", `${edge}px`);
    quire.appendChild(sheet);
  }
  return quire;
}

function liveSide(destination: HTMLElement, side: "verso" | "recto"): HTMLElement | null {
  const pages = livePages(destination);
  const found = pages.find((el) => el.classList.contains(`is-${side}`));
  if (found) return found;
  if (side === "recto") return pages[pages.length - 1] ?? null;
  return pages[0] ?? null;
}

function clonePage(doc: Document, source: HTMLElement): HTMLElement | null {
  if (typeof source.cloneNode === "function") {
    const cloned = source.cloneNode(true);
    if (isHtmlElement(cloned)) return cloned;
  }
  return copyElement(doc, source);
}

function snapshotReader(doc: Document, source: HTMLElement): HTMLElement {
  if (typeof source.cloneNode === "function") {
    const cloned = source.cloneNode(true);
    if (isHtmlElement(cloned)) return cloned;
  }
  return copyElement(doc, source);
}

function copyElement(doc: Document, source: HTMLElement): HTMLElement {
  const copy = doc.createElement(source.tagName.toLowerCase());
  copy.className = source.className;
  copyAttributes(source, copy);
  copyStyle(source, copy);
  const kids = source.children;
  if (!kids || kids.length === 0) {
    copy.textContent = source.textContent;
    return copy;
  }
  for (let index = 0; index < kids.length; index++) {
    const child = kids[index];
    if (child && isHtmlElement(child)) copy.appendChild(copyElement(doc, child));
  }
  return copy;
}

function copyStyle(from: HTMLElement, to: HTMLElement): void {
  const style = from.style as CSSStyleDeclaration & { map?: Map<string, string> };
  if (style.map) {
    style.map.forEach((value, key) => {
      to.style.setProperty(key, value);
    });
    return;
  }
  if (typeof style.length !== "number") return;
  for (let index = 0; index < style.length; index++) {
    const name = style.item(index);
    if (!name) continue;
    to.style.setProperty(name, style.getPropertyValue(name));
  }
}

function copyAttributes(from: HTMLElement, to: HTMLElement): void {
  const named = from.attributes;
  if (named && typeof named.length === "number") {
    for (let index = 0; index < named.length; index++) {
      const attr = named.item(index);
      if (!attr || attr.name === "class") continue;
      to.setAttribute(attr.name, attr.value);
    }
    return;
  }
  const bag = (from as HTMLElement & { attrs?: Map<string, string> }).attrs;
  if (!bag) return;
  bag.forEach((value, key) => {
    if (key !== "class") to.setAttribute(key, value);
  });
}

/**
 * Text, page numbers, and page box of a reader, or of the flight snapshot.
 * A signature of the live reader skips the flight overlay, so the snapshot
 * can sit inside that reader and still match the settled frame.
 */
export function readerFrameSignature(root: HTMLElement): string {
  const insideFlight = belongsToFlight(root);
  const parts: string[] = [];
  parts.push(textOf(firstMatch(root, ".atomic-reader-bar", insideFlight)));
  for (const node of matches(root, ".atomic-reader-pn", insideFlight)) {
    parts.push((node.textContent ?? "").trim());
  }
  parts.push(textOf(firstMatch(root, ".atomic-reader-foot", insideFlight)));
  for (const node of matches(root, ".atomic-reader-page, .atomic-page", insideFlight)) {
    parts.push((node.textContent ?? "").replace(/\s+/g, " ").trim());
  }
  parts.push(root.style.getPropertyValue("--atomic-page-w"));
  parts.push(root.style.getPropertyValue("--atomic-page-h"));
  return parts.join("\n");
}

function belongsToFlight(node: Element): boolean {
  let current: Element | null = node;
  while (current) {
    if (current.classList.contains("atomic-open-flight")) return true;
    current = current.parentElement;
  }
  return false;
}

function matches(root: HTMLElement, selector: string, insideFlight: boolean): HTMLElement[] {
  const found: HTMLElement[] = [];
  root.querySelectorAll(selector).forEach((node) => {
    if (!isHtmlElement(node)) return;
    if (!insideFlight && belongsToFlight(node)) return;
    found.push(node);
  });
  return found;
}

function firstMatch(root: HTMLElement, selector: string, insideFlight: boolean): Element | null {
  return matches(root, selector, insideFlight)[0] ?? null;
}

function textOf(node: Element | null): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}
