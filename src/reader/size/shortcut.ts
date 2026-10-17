export type ReaderSizeShortcutDirection = -1 | 1;

type ShortcutEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
};

/**
 * ⌘− / ⌘+ on the settled reader. Ctrl is the Windows and Linux equivalent.
 * `=` is the unshifted plus key. Alt chords are left alone.
 */
export function readerSizeShortcutDirection(
  event: ShortcutEvent,
): ReaderSizeShortcutDirection | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  if (event.key === "-") return -1;
  if (event.key === "=" || event.key === "+") return 1;
  return null;
}
