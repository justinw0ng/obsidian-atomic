// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageBox, type ReaderPageBox } from "../shell/model.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_PAGE_HEIGHT, THEATER_PAGE_WIDTH, resolveTheaterSurface } from "./rules.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { mountTheater, type TheaterHandle } from "./mount.ts";

/** What the shell passes through `[data-reader-slot="theater"]`. */
export interface TheaterSlotSession {
  notePath: string;
  /** Theater is a taller XL page. Settled reading stays the XL page box. */
  relayout?(request: {
    size: "xl";
    width: number;
    height: number;
    bodyLines: number;
    charsPerLine: number;
  }): void;
}

export interface TheaterSlotCopy {
  enterLabel?: string;
  exitLabel?: string;
}

interface LiveTheater {
  root: HTMLElement;
  handle: TheaterHandle;
  unlock: () => void;
}

const wanted = new Set<string>();
const live = new Map<string, LiveTheater>();

const ENTER_TESTID = "atomic-theater-enter";
const PAGE_WIDTH_VAR = "--atomic-page-w";
const PAGE_HEIGHT_VAR = "--atomic-page-h";

/**
 * Shell entry. The view calls this with the theater slot on every paint.
 * The room is the `.atomic-reader` that owns the slot. Exit stays on that
 * reader, because the slot itself sits in the toolbar theater hides.
 */
export function attachReaderTheater(
  slot: HTMLElement,
  session: TheaterSlotSession,
  copy?: TheaterSlotCopy,
): void {
  const root = readerRoot(slot);
  if (!root) return;
  const notePath = session.notePath;
  ensureEnter(slot, root, notePath, copy, session);
  if (!wanted.has(notePath)) return;
  openTheater(root, notePath, copy?.exitLabel, session);
}

/** Open theater on the next attach when the Reader setting asks for it. */
export function preferReaderTheater(notePath: string, on: boolean): void {
  if (!notePath) return;
  if (on) wanted.add(notePath);
}

/** Drop every open room. Plugin unload calls this. Does not count as Exit. */
export function resetReaderTheater(): void {
  for (const notePath of [...live.keys()]) {
    const current = live.get(notePath);
    current?.handle.destroy();
    current?.unlock();
    live.delete(notePath);
  }
  wanted.clear();
}

function ensureEnter(
  slot: HTMLElement,
  root: HTMLElement,
  notePath: string,
  copy: TheaterSlotCopy | undefined,
  session: TheaterSlotSession,
): void {
  if (findEnter(slot)) return;
  const doc = slot.ownerDocument;
  const button = doc.createElement("button");
  button.className = "atomic-btn is-quiet is-small";
  button.setAttribute("type", "button");
  button.setAttribute("data-testid", ENTER_TESTID);
  button.setAttribute("data-act", "theater-enter");
  const label = copy?.enterLabel?.trim() || "Theater";
  button.setAttribute("aria-label", label);
  button.textContent = label;
  button.addEventListener("click", () => {
    wanted.add(notePath);
    openTheater(root, notePath, copy?.exitLabel, session);
  });
  slot.appendChild(button);
}

function openTheater(
  root: HTMLElement,
  notePath: string,
  exitLabel: string | undefined,
  session: TheaterSlotSession,
): void {
  const current = live.get(notePath);
  if (current?.handle.active && current.root === root) return;
  if (current) {
    current.handle.destroy();
    current.unlock();
    live.delete(notePath);
  }
  applyBox(session, readerPageBox("xl", THEATER_PAGE_HEIGHT));
  if (root.isConnected === false) return;
  const unlock = lockPageBox(root);
  const handle = mountTheater({
    frame: root,
    stage: root,
    surface: resolveTheaterSurface(root.className, root.getAttribute("data-surface")),
    exitLabel,
    onExit: () => {
      wanted.delete(notePath);
      unlock();
      if (live.get(notePath)?.handle === handle) live.delete(notePath);
      applyBox(session, readerPageBox("xl"));
    },
  });
  live.set(notePath, { root, handle, unlock });
}

function applyBox(session: TheaterSlotSession, box: ReaderPageBox): void {
  session.relayout?.({
    size: "xl",
    width: box.w,
    height: box.h,
    bodyLines: box.bodyLines,
    charsPerLine: box.charsPerLine,
  });
}

function lockPageBox(root: HTMLElement): () => void {
  const previousWidth = root.style.getPropertyValue(PAGE_WIDTH_VAR);
  const previousHeight = root.style.getPropertyValue(PAGE_HEIGHT_VAR);
  const width = `${THEATER_PAGE_WIDTH}px`;
  const height = `${THEATER_PAGE_HEIGHT}px`;
  root.style.setProperty(PAGE_WIDTH_VAR, width);
  root.style.setProperty(PAGE_HEIGHT_VAR, height);
  return () => {
    restoreProp(root, PAGE_WIDTH_VAR, previousWidth);
    restoreProp(root, PAGE_HEIGHT_VAR, previousHeight);
  };
}

function restoreProp(root: HTMLElement, name: string, previous: string): void {
  if (previous) root.style.setProperty(name, previous);
  else root.style.removeProperty(name);
}

function readerRoot(slot: HTMLElement): HTMLElement | null {
  const found = slot.closest(".atomic-reader");
  if (!found || !isHtmlElement(found)) return null;
  return found;
}

function findEnter(slot: HTMLElement): HTMLElement | null {
  const kids = slot.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (!child || !isHtmlElement(child)) continue;
    if (child.getAttribute("data-testid") === ENTER_TESTID) return child;
  }
  return null;
}

function isHtmlElement(node: Element): node is HTMLElement {
  const probed = node as HTMLElement & { instanceOf?: (ctor: unknown) => boolean };
  if (typeof probed.instanceOf === "function" && typeof HTMLElement === "function") {
    return probed.instanceOf(HTMLElement);
  }
  return node.nodeType === 1;
}
