/**
 * Book size scales the page. Type stays put.
 *
 * Page boxes are `BOOK_SIZES` in `design/reader-mockup/reader-mock.html`.
 * Line counts use the journey board clip: 26px padding top and bottom, then
 * whole lines only (Literata 12.5/19 on the desk). That is M = 15 lines,
 * settled XL = 22, theater XL = 23 (`design/reader-journey/journey.source.html`).
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

/** Journey board page padding. Content height is the box minus this pair. */
export const READER_PAGE_PAD_Y = { top: 26, bottom: 26 } as const;

export const READER_SIZE_MOTION_MS = 200;

export const READER_SIZE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

type PageBox = {
  width: number;
  height: number;
  /** Theater is locked to XL, so only the XL theater height is drawn. */
  theaterHeight: number;
};

export const READER_PAGE_BOX: Record<ReaderSizeId, PageBox> = {
  s: { width: 230, height: 280, theaterHeight: 280 },
  m: { width: 270, height: 340, theaterHeight: 340 },
  l: { width: 305, height: 410, theaterHeight: 420 },
  xl: { width: 340, height: 488, theaterHeight: 500 },
};

export type ReaderPageGeometry = {
  /** Size actually drawn. Theater is always XL. */
  size: ReaderSizeId;
  surface: ReaderSizeSurface;
  theater: boolean;
  width: number;
  height: number;
  fontSizePx: number;
  lineHeightPx: number;
  paddingTop: number;
  paddingBottom: number;
  contentHeight: number;
  lines: number;
  /** Whole-line clip. Matches `.lc` on the journey board. */
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
  const box = READER_PAGE_BOX[applied];
  const height = theater ? box.theaterHeight : box.height;
  const type = surface === "phone" ? READER_PHONE_TYPE : READER_DESK_TYPE;
  const contentHeight = height - READER_PAGE_PAD_Y.top - READER_PAGE_PAD_Y.bottom;
  const lines = Math.max(0, Math.floor(contentHeight / type.lineHeightPx));
  return {
    size: applied,
    surface,
    theater,
    width: box.width,
    height,
    fontSizePx: type.fontSizePx,
    lineHeightPx: type.lineHeightPx,
    paddingTop: READER_PAGE_PAD_Y.top,
    paddingBottom: READER_PAGE_PAD_Y.bottom,
    contentHeight,
    lines,
    clipHeight: lines * type.lineHeightPx,
  };
}
