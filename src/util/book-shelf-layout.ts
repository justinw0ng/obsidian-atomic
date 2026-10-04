/** Book shelf geometry. Keep in sync with `--atomic-book-*` in styles.css. */

export const DEFAULT_BOOK_WIDTH_PX = 96;
export const DEFAULT_BOOK_HEIGHT_PX = 150;
export const MIN_BOOK_WIDTH_PX = 56;
/** Matches `--atomic-shelf-gap` on `.atomic-shelf-row`. */
export const BOOK_GAP_PX = 12;
/** Matches `.atomic-shelf-row` padding (14px on each side). */
export const ROW_PADDING_PX = 28;
export const MIN_BOOKS_PER_ROW = 3;
export const DEFAULT_BOOK_SHELF_SCALE = 1;
export const MIN_BOOK_SHELF_SCALE = 0.25;
export const MAX_BOOK_SHELF_SCALE = 4;

/** Positive scale ratio for `atomic-bookshelf` (`scale:` / `ratio:`). Default 1. */
export function resolveBookShelfScale(
  opts: Record<string, string> | string | undefined,
): number {
  const raw =
    typeof opts === "string" || opts == null
      ? opts
      : opts.scale ?? opts.ratio;
  if (!raw) return DEFAULT_BOOK_SHELF_SCALE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BOOK_SHELF_SCALE;
  return Math.min(MAX_BOOK_SHELF_SCALE, Math.max(MIN_BOOK_SHELF_SCALE, n));
}

export function scaledBookSize(scale: number): {
  maxWidth: number;
  minWidth: number;
} {
  const ratio = resolveBookShelfScale(String(scale));
  return {
    maxWidth: Math.max(1, Math.round(DEFAULT_BOOK_WIDTH_PX * ratio)),
    minWidth: Math.max(1, Math.round(MIN_BOOK_WIDTH_PX * ratio)),
  };
}

export function bookHeightForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_BOOK_HEIGHT_PX;
  return Math.round((width * DEFAULT_BOOK_HEIGHT_PX) / DEFAULT_BOOK_WIDTH_PX);
}

/**
 * Book width for one shelf row.
 * `maxWidth` is the requested scale. Use it when three books fit, so a
 * small ratio can leave a gap and the row shows more than three books.
 * When the ratio or the pane would fit fewer than three, shrink the book
 * so three still fit. `minWidth` is not a floor: using it would drop the
 * row to one or two books.
 */
export function bookWidthForContainer(
  containerWidth: number,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
  _minWidth = MIN_BOOK_WIDTH_PX,
  maxWidth = DEFAULT_BOOK_WIDTH_PX,
): number {
  const preferred = Math.max(1, maxWidth);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return preferred;
  const available = Math.max(0, containerWidth - padding);
  const gaps = (MIN_BOOKS_PER_ROW - 1) * gap;
  const fitThree = (available - gaps) / MIN_BOOKS_PER_ROW;
  if (!Number.isFinite(fitThree) || fitThree >= preferred) return preferred;
  return Math.max(1, Math.floor(fitThree));
}

/**
 * How many upright books sit on one plank at a fixed book width.
 * Never wraps below MIN_BOOKS_PER_ROW. A small ratio on a wide pane
 * returns more than three.
 */
export function booksPerRow(
  containerWidth: number,
  bookWidth = DEFAULT_BOOK_WIDTH_PX,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return MIN_BOOKS_PER_ROW;
  }
  const available = Math.max(0, containerWidth - padding);
  const fitted = Math.floor((available + gap) / (bookWidth + gap));
  return Math.max(MIN_BOOKS_PER_ROW, fitted);
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const rowSize = Math.max(1, Math.floor(size));
  if (!items.length) return [[]];
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}

export function rowNeedsHorizontalScroll(
  containerWidth: number,
  bookWidth = DEFAULT_BOOK_WIDTH_PX,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
  minCount = MIN_BOOKS_PER_ROW,
): boolean {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return true;
  const needed = padding + minCount * bookWidth + (minCount - 1) * gap;
  return needed > containerWidth;
}
