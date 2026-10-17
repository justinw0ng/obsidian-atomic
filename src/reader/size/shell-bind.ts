// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { registerReaderSize, type ReaderSession } from "../shell/mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { parseReaderSize, type ReaderSizeId, type ReaderSizeSurface } from "./geometry.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { writeReaderSize } from "./frontmatter.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { mountReaderSize, type ReaderSizeControl } from "./mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerReflowBox } from "./reflow.ts";

export type BookSizeHost = {
  data: {
    processNote(path: string, updater: (current: string) => string): Promise<unknown>;
  };
};

/** Settled size for a book, plus the size the shell last passed in. */
export type ReaderSizeMemory = {
  settled: ReaderSizeId;
  shell: ReaderSizeId;
};

type LiveSize = {
  control: ReaderSizeControl;
  root: HTMLElement;
  session: ReaderSession;
};

const sizes = new Map<string, ReaderSizeMemory>();
const live = new Map<string, LiveSize>();
let bookSizePlugin: BookSizeHost | null = null;
let theaterLocked = false;

/**
 * Keep a size chosen in the slot across shell repaints.
 * A new shell size means the note was read again, so that value wins.
 */
export function settleReaderSize(
  prior: ReaderSizeMemory | undefined,
  shellSize: ReaderSizeId,
): ReaderSizeMemory {
  if (!prior || prior.shell !== shellSize) return { settled: shellSize, shell: shellSize };
  return prior;
}

/** Mount S·M·L·XL into the shell's `[data-reader-slot="size"]`. */
export function registerBookSize(plugin: BookSizeHost): void {
  bookSizePlugin = plugin;
  registerReaderSize({
    attach(slot, session) {
      attachBookSize(slot, session);
    },
  });
}

export function resetBookSize(): void {
  for (const entry of live.values()) entry.control.destroy();
  live.clear();
  sizes.clear();
  theaterLocked = false;
  bookSizePlugin = null;
}

/** Theater hides the control and draws XL. The saved size stays put. */
export function setReaderSizeTheaterLocked(locked: boolean): void {
  theaterLocked = locked;
  releaseDisconnected();
  for (const entry of [...live.values()]) {
    const request = readerReflowBox(entry.control.getSize(), locked);
    if (entry.session.relayout) entry.session.relayout(request);
    else entry.control.setTheaterLocked(locked);
  }
}

function attachBookSize(slot: HTMLElement, session: ReaderSession): void {
  if (slot.getAttribute("data-reader-slot") !== "size") return;
  const root = readerRoot(slot);
  if (!root) return;

  const notePath = session.notePath;
  releaseDisconnected();
  live.get(notePath)?.control.destroy();
  live.delete(notePath);

  const shellSize = parseReaderSize(session.size);
  const memory = settleReaderSize(sizes.get(notePath), shellSize);
  sizes.set(notePath, memory);
  const surface = readerSurface(root);
  const pages = readerPages(root);
  const control = mountReaderSize({
    controlEl: slot,
    pageHost: pages.length > 0 ? pages : [root],
    surface,
    chrome: "bar",
    paint: "shell",
    boxEl: root,
    theaterLocked,
    size: memory.settled,
    shortcutRoot: root,
    onChange(next) {
      const current = sizes.get(notePath);
      sizes.set(notePath, { settled: next, shell: current?.shell ?? shellSize });
      saveBookSize(notePath, next);
      session.relayout?.(readerReflowBox(next, theaterLocked));
    },
  });
  live.set(notePath, { control, root, session });
}

function releaseDisconnected(): void {
  for (const [path, entry] of live) {
    if (entry.root.isConnected) continue;
    entry.control.destroy();
    live.delete(path);
  }
}

function saveBookSize(notePath: string, size: ReaderSizeId): void {
  if (!bookSizePlugin || !notePath) return;
  void bookSizePlugin.data
    .processNote(notePath, (markdown) => writeReaderSize(markdown, size))
    .catch((error: unknown) => {
      console.error("Book size save failed", error);
    });
}

function readerRoot(slot: HTMLElement): HTMLElement | null {
  const root = slot.closest(".atomic-reader");
  if (!root || !root.instanceOf(HTMLElement)) return null;
  return root;
}

function readerSurface(root: HTMLElement): ReaderSizeSurface {
  return root.classList.contains("is-phone") ? "phone" : "desk";
}

function readerPages(root: HTMLElement): HTMLElement[] {
  const pages: HTMLElement[] = [];
  root.querySelectorAll(".atomic-reader-page").forEach((node) => {
    if (node.instanceOf(HTMLElement)) pages.push(node);
  });
  return pages;
}
