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
 * Width of one book so a row of three fills the container.
 * Grows past the preferred size when three books would leave a gap.
 * Shrinks on a narrow pane, even below `minWidth`, so the row still
 * shows three books instead of scrolling down to one or two.
 * `maxWidth` is only the size used before the pane has been measured.
 */
export function bookWidthForContainer(
  containerWidth: number,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
  minWidth = MIN_BOOK_WIDTH_PX,
  maxWidth = DEFAULT_BOOK_WIDTH_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return Math.max(1, maxWidth);
  }
  const available = Math.max(0, containerWidth - padding);
  const gaps = (MIN_BOOKS_PER_ROW - 1) * gap;
  const fill = (available - gaps) / MIN_BOOKS_PER_ROW;
  if (!Number.isFinite(fill) || fill < 1) return Math.max(1, minWidth);
  return Math.max(1, Math.floor(fill));
}

/**
 * How many upright books sit on one plank at a fixed book width.
 * Never wraps below MIN_BOOKS_PER_ROW. The shelf view sizes the book so
 * this stays at three and the row fills the pane.
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
