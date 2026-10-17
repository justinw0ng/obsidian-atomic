import {
  registerReaderFlight,
  type ReaderOpenRequest,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "../shell/mount.ts";
import {
  OPEN_BOOK_PAGE_SELECTOR,
  abortOpenBookFlight,
  mountOpenBookFlight,
  openBookFlightView,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { JOURNEY_LANDING_PAGE } from "./page.ts";

/** How many frames to wait for the live page box before the fallback scale. */
const LIVE_PAGE_FRAMES = 16;

const LIVE_READER_SELECTOR = "[data-testid='atomic-reader']";

/** Opens the reader the shell would open when the flight does not. */
export type OpenBookDirectOpen = (request: ReaderOpenRequest) => Promise<void> | void;

/**
 * Hand the shell this flight. The plugin passes its direct open.
 * Reduced motion returns false and does not call that open.
 */
export function registerOpenBookFlight(openDirect: OpenBookDirectOpen): void {
  registerReaderFlight({
    open(request) {
      return playOpenBookFlight(openDirect, request);
    },
  });
}

/**
 * Full motion reveals the live reader under the body overlay and returns true.
 * Reduced motion, or no tap window, returns false so the shell opens directly.
 */
export async function playOpenBookFlight(
  openDirect: OpenBookDirectOpen,
  request: ReaderOpenRequest,
): Promise<boolean> {
  const view = openBookFlightView();
  if (!view) return false;
  if (prefersReducedMotion(view)) {
    abortOpenBookFlight(view);
    return false;
  }
  await openDirect(request);
  const destination = await waitForLiveReader(view);
  if (destination) {
    mountOpenBookFlight({
      view,
      from: coverBox(request),
      cover: {
        title: request.title,
        color: request.coverRect?.color,
      },
      page: JOURNEY_LANDING_PAGE,
      destination,
    });
  }
  return true;
}

function prefersReducedMotion(view: Window): boolean {
  if (typeof view.matchMedia !== "function") return false;
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function coverBox(request: ReaderOpenRequest): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const cover = request.coverRect;
  if (!cover) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: cover.x,
    y: cover.y,
    width: cover.width,
    height: cover.height,
  };
}

async function waitForLiveReader(view: Window): Promise<HTMLElement | null> {
  const doc = view.document;
  if (!doc) return null;
  let root = readerRoot(doc);
  for (let frame = 0; frame < LIVE_PAGE_FRAMES && !livePageReady(root); frame++) {
    await nextFrame(view);
    root = readerRoot(doc);
  }
  return root;
}

function readerRoot(doc: Document): HTMLElement | null {
  const nodes = htmlElements(doc.querySelectorAll(LIVE_READER_SELECTOR));
  const active = nodes.find((node) => inActiveLeaf(node));
  if (active) return active;
  const shown = nodes.find((node) => livePageReady(node));
  return shown ?? nodes[0] ?? null;
}

function inActiveLeaf(node: HTMLElement): boolean {
  if (typeof node.closest !== "function") return false;
  const leaf = node.closest(".workspace-leaf");
  if (!leaf || !isHtmlElement(leaf)) return false;
  return leaf.classList.contains("mod-active");
}

function livePageReady(root: HTMLElement | null): boolean {
  if (!root) return false;
  const pages = root.querySelectorAll(OPEN_BOOK_PAGE_SELECTOR);
  for (let index = 0; index < pages.length; index++) {
    const node = pages[index];
    if (!node || !isHtmlElement(node)) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }
  return false;
}

function nextFrame(view: Window): Promise<void> {
  return new Promise((resolve) => {
    if (typeof view.requestAnimationFrame === "function") {
      view.requestAnimationFrame(() => resolve());
      return;
    }
    view.setTimeout(() => resolve(), 16);
  });
}

function htmlElements(nodes: NodeListOf<Element> | HTMLElement[]): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node && isHtmlElement(node)) found.push(node);
  }
  return found;
}

function isHtmlElement(node: Node): node is HTMLElement {
  if (typeof node.instanceOf === "function") return node.instanceOf(HTMLElement);
  return node.nodeType === 1;
}
