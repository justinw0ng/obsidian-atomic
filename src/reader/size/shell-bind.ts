// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { registerReaderSize } from "../shell/mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { type ReaderSizeId } from "./geometry.ts";

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

/**
 * Keep a size chosen in the slot across shell repaints.
 * A new shell size means the note was read again, so that value wins.
 * The reader no longer mounts a size slot. This stays for the old memory shape.
 */
export function settleReaderSize(
  prior: ReaderSizeMemory | undefined,
  shellSize: ReaderSizeId,
): ReaderSizeMemory {
  if (!prior || prior.shell !== shellSize) return { settled: shellSize, shell: shellSize };
  return prior;
}

/**
 * Book size is fixed at XL.
 * No S·M·L·XL control, no ⌘− / ⌘+, and no `reader.size` write.
 */
export function registerBookSize(_plugin: BookSizeHost): void {
  registerReaderSize({
    attach() {},
  });
}

export function resetBookSize(): void {}

/** Theater draws XL on its own. There is no settled size control to lock. */
export function setReaderSizeTheaterLocked(_locked: boolean): void {}
