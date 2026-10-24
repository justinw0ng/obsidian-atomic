/** Settled-reader geometry. Sizes match the 1.6.0 mock. Lines use 26px padding and a 19px line. */

export const READER_SIZES = ["s", "m", "l", "xl"] as const;

export type ReaderSizeId = (typeof READER_SIZES)[number];

export type ReaderPageBox = {
  w: number;
  h: number;
  bodyLines: number;
  charsPerLine: number;
};

/** Narrower than a desktop M spread (112 + 270 + 270 + 112). */
export const READER_PHONE_MAX_WIDTH = 780;

const PAGE_PAD = 26;
const LINE_HEIGHT = 19;
/** Literata 12.5 on the 292px XL measure. A full page is about 22 lines. */
const CHAR_WIDTH = 5;

const BOXES: Record<ReaderSizeId, { w: number; h: number }> = {
  s: { w: 230, h: 280 },
  m: { w: 270, h: 340 },
  l: { w: 305, h: 410 },
  xl: { w: 340, h: 488 },
};

export function readerSizeId(value: unknown): ReaderSizeId {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "s" || text === "m" || text === "l" || text === "xl") return text;
  return "m";
}

/**
 * One page box. Padding is 26 and 26, then whole lines.
 * M is 15 lines. Settled XL is 22. Pass `height` for the theater page.
 */
export function readerPageBox(size: ReaderSizeId, height?: number): ReaderPageBox {
  const box = BOXES[size];
  const h = height ?? box.h;
  const textHeight = h - PAGE_PAD - PAGE_PAD;
  return {
    w: box.w,
    h,
    bodyLines: Math.max(1, Math.floor(textHeight / LINE_HEIGHT)),
    charsPerLine: Math.max(8, Math.floor((box.w - 44) / CHAR_WIDTH)),
  };
}

export function isPhoneReaderLayout(width: number): boolean {
  if (!Number.isFinite(width) || width <= 0) return false;
  return width < READER_PHONE_MAX_WIDTH;
}

export type ReaderProgress = {
  page: number;
  total: number;
  percent: number;
};

export function clampReaderPage(page: number, total: number): number {
  if (total <= 0) return 1;
  if (!Number.isFinite(page)) return 1;
  const next = Math.trunc(page);
  if (next < 1) return 1;
  if (next > total) return total;
  return next;
}

export function readerProgress(page: number, total: number): ReaderProgress {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
  const safePage = safeTotal === 0 ? 0 : clampReaderPage(page, safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safePage / safeTotal) * 100);
  return { page: safePage, total: safeTotal, percent };
}

export type ReaderSpread = {
  verso: number | null;
  recto: number | null;
};

/** Odd pages sit on the right. Page 1 is a recto with a blank verso. */
export function spreadPages(page: number, total: number): ReaderSpread {
  if (total <= 0) return { verso: null, recto: null };
  const current = clampReaderPage(page, total);
  if (current % 2 === 1) {
    return { verso: current > 1 ? current - 1 : null, recto: current };
  }
  return { verso: current, recto: current < total ? current + 1 : null };
}

function visiblePage(spread: ReaderSpread, fallback: number): number {
  return spread.recto ?? spread.verso ?? fallback;
}

/**
 * Move one spread. The stored page is the right-hand page when the spread
 * has one, so reopening shows the same pair.
 */
export function pageAfterTurn(page: number, total: number, direction: -1 | 1): number {
  if (total <= 0) return 1;
  const current = clampReaderPage(page, total);
  const spread = spreadPages(current, total);
  if (direction > 0) {
    const last = visiblePage(spread, current);
    const nextStart = last + 1;
    if (nextStart > total) return current;
    return visiblePage(spreadPages(nextStart, total), nextStart);
  }
  const first = spread.verso ?? spread.recto ?? current;
  const prevLast = first - 1;
  if (prevLast < 1) return current;
  return visiblePage(spreadPages(prevLast, total), prevLast);
}

export function canTurnPage(page: number, total: number, direction: -1 | 1): boolean {
  return pageAfterTurn(page, total, direction) !== clampReaderPage(page, Math.max(total, 0));
}

/**
 * Open Book goes straight to the settled reader.
 * Motion and a registered flight do not play an overlay.
 */
export function readerOpenPlan(input: {
  reducedMotion: boolean;
  hasFlight: boolean;
}): "direct" {
  void input.reducedMotion;
  void input.hasFlight;
  return "direct";
}
