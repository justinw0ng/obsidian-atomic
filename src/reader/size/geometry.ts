// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageBox } from "../shell/model.ts";

/**
 * Book size scales the page. Type stays put.
 *
 * Width, height, and line count come from `readerPageBox`.
 * The only box number that stays here is the theater page height.
 */

export const READER_SIZE_ORDER = ["s", "m", "l", "xl"] as const;

export type ReaderSizeId = (typeof READER_SIZE_ORDER)[number];

export type ReaderSizeSurface = "desk" | "phone";

/** A new book starts at M. */
export const DEFAULT_READER_SIZE: ReaderSizeId = "m";

export const READER_SIZE_FRONTMATTER_KEY = "reader.size";

/** Desk type. Same at every page size. */
export const READER_DESK_TYPE = { fontSizePx: 12.5, lineHeightPx: 19 } as const;

/** Phone type. Same at every page size. */
export const READER_PHONE_TYPE = { fontSizePx: 15, lineHeightPx: 23 } as const;

/** Theater draws a taller XL page. Settled heights stay on `readerPageBox`. */
export const THEATER_XL_HEIGHT = 500;

export const READER_SIZE_MOTION_MS = 200;

export const READER_SIZE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export type ReaderPageGeometry = {
  /** Size actually drawn. Theater is always XL. */
  size: ReaderSizeId;
  surface: ReaderSizeSurface;
  theater: boolean;
  width: number;
  height: number;
  fontSizePx: number;
  lineHeightPx: number;
  /** Whole lines from `readerPageBox`. M is 15. Settled XL is 22. */
  lines: number;
  /** Whole-line clip. Desk clip matches the journey board. */
  clipHeight: number;
};

export function isReaderSizeId(value: string): value is ReaderSizeId {
  return READER_SIZE_ORDER.some((size) => size === value);
}

/** Unknown values settle on M. */
export function parseReaderSize(value: unknown): ReaderSizeId {
  const token = String(value ?? "")
    .trim()
    .toLowerCase();
  if (isReaderSizeId(token)) return token;
  return DEFAULT_READER_SIZE;
}

export function readerSizeLabel(size: ReaderSizeId): string {
  switch (size) {
    case "s":
      return "S";
    case "m":
      return "M";
    case "l":
      return "L";
    case "xl":
      return "XL";
    default: {
      const unseen: never = size;
      return unseen;
    }
  }
}

export function stepReaderSize(size: ReaderSizeId, direction: -1 | 1): ReaderSizeId {
  const index = READER_SIZE_ORDER.indexOf(size);
  const next = Math.max(0, Math.min(READER_SIZE_ORDER.length - 1, index + direction));
  return READER_SIZE_ORDER[next];
}

/** Theater draws XL and does not change the size saved on the note. */
export function effectiveReaderSize(size: ReaderSizeId, theaterLocked: boolean): ReaderSizeId {
  return theaterLocked ? "xl" : size;
}

export function readerPageGeometry(
  size: ReaderSizeId,
  options?: { surface?: ReaderSizeSurface; theater?: boolean },
): ReaderPageGeometry {
  const surface = options?.surface ?? "desk";
  const theater = options?.theater === true;
  const applied = effectiveReaderSize(size, theater);
  const box = readerPageBox(applied, theater ? THEATER_XL_HEIGHT : undefined);
  const type = surface === "phone" ? READER_PHONE_TYPE : READER_DESK_TYPE;
  return {
    size: applied,
    surface,
    theater,
    width: box.w,
    height: box.h,
    fontSizePx: type.fontSizePx,
    lineHeightPx: type.lineHeightPx,
    lines: box.bodyLines,
    clipHeight: box.bodyLines * type.lineHeightPx,
  };
}
