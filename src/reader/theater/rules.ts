/** Theater rules shared by the mount and the stylesheet. No DOM, no Obsidian. */

export const THEATER_IDLE_MS = 2000;
export const THEATER_PAGE_WIDTH = 340;
export const THEATER_PAGE_HEIGHT = 500;

export type TheaterSurface = "desk" | "phone";

export const SUPPRESS_CLASSES: readonly string[] = [
  "atomic-reader-bar",
  "atomic-reader-foot",
  "atomic-gutter",
  "atomic-remark",
  "atomic-selbar",
  "atomic-slip",
  "atomic-mdot",
  "atomic-phone-size",
  "atomic-ask",
  "atomic-sheet",
  "atomic-reader-size",
  "atomic-reader-size-sheet",
  "bsize",
];

export const SUPPRESS_ACTS: readonly string[] = [
  "highlight",
  "remark",
  "ask",
  "book-size",
];

export const SUPPRESS_TESTIDS: readonly string[] = [
  "atomic-reader-highlight",
  "atomic-reader-remark",
  "atomic-reader-ask",
  "atomic-reader-size",
  "atomic-reader-size-sheet",
];

const CLASS_OFF = new Set(SUPPRESS_CLASSES);
const ACT_OFF = new Set(SUPPRESS_ACTS);
const TESTID_OFF = new Set(SUPPRESS_TESTIDS);

const THEATER_OWN = new Set([
  "atomic-theater",
  "atomic-theater-chrome",
  "atomic-theater-exit",
]);

export function resolveTheaterSurface(
  className: string,
  dataSurface: string | null,
): TheaterSurface {
  if (dataSurface === "phone" || dataSurface === "desk") return dataSurface;
  const names = className.split(/\s+/);
  if (names.includes("ob-phone-screen")) return "phone";
  return "desk";
}

/**
 * Controls that leave the book while theater is on.
 * The page card is never in this set.
 */
export function shouldSuppressControl(input: {
  className: string;
  testId: string | null;
  act: string | null;
}): boolean {
  if (input.testId && THEATER_OWN.has(input.testId)) return false;
  const names = input.className.split(/\s+/).filter((name) => name.length > 0);
  if (names.includes("atomic-page")) return false;
  if (names.includes("th-exit") || names.includes("th-chrome") || names.includes("atomic-theater-layers")) {
    return false;
  }
  for (const name of names) {
    if (CLASS_OFF.has(name)) return true;
  }
  if (input.act && ACT_OFF.has(input.act)) return true;
  if (input.testId && TESTID_OFF.has(input.testId)) return true;
  return false;
}
