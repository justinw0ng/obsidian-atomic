/**
 * Book area as a share of the design window.
 *
 * Settled desktop XL matches both designs: two 340×488 pages in a 1020×720
 * window. 680×488 / (1020×720) = 61/135.
 *
 * The settled phone card matches the journey step 07 `.phone-page`: 350×520
 * inside the 390×844 screen. The mock phone page is `height: auto`. Its
 * border box overflows the spread. The sized phone book is the journey card.
 *
 * Theater uses the same window. Desktop theater is the XL pair at 340×500,
 * so 680×500 / (1020×720) = 25/54. Phone theater is one column. The mock
 * paints that page at 326×500 inside the 390×844 screen. The token stays
 * 340×500; zoom paints the share.
 *
 * `zoom` on the book block paints the share. A field that cannot hold it
 * clamps the zoom so the block still fits.
 */

export const DESKTOP_VIEWPORT = { width: 1020, height: 720 } as const;
export const PHONE_VIEWPORT = { width: 390, height: 844 } as const;
export const DESKTOP_BOOK = { width: 680, height: 488 } as const;
export const PHONE_BOOK = { width: 350, height: 520 } as const;
export const XL_PAGE = { width: 340, height: 488 } as const;

/** Margin gutters on either side of a desktop spread. */
export const DESKTOP_GUTTER = 112;

/** Spread padding above and below the book. Not part of the book. */
export const SPREAD_PAD_Y = 16;

/** Phone page offset inside the book block. */
export const PHONE_PAGE_MARGIN_TOP = 12;

export const DESKTOP_BOOK_VIEWPORT_RATIO =
  (DESKTOP_BOOK.width * DESKTOP_BOOK.height) / (DESKTOP_VIEWPORT.width * DESKTOP_VIEWPORT.height);

export const PHONE_BOOK_VIEWPORT_RATIO =
  (PHONE_BOOK.width * PHONE_BOOK.height) / (PHONE_VIEWPORT.width * PHONE_VIEWPORT.height);

/** Theater page faces. Taller than the settled XL page. Gutters stay off. */
export const THEATER_PAGE = { width: 340, height: 500 } as const;
export const DESKTOP_THEATER_BOOK = { width: 680, height: 500 } as const;

/**
 * Mock phone theater page border box. `min(340px, calc(100% - 32px))` on the
 * 390×844 screen resolves to 326×500.
 */
export const PHONE_THEATER_BOOK = { width: 326, height: 500 } as const;

export const DESKTOP_THEATER_BOOK_VIEWPORT_RATIO =
  (DESKTOP_THEATER_BOOK.width * DESKTOP_THEATER_BOOK.height) /
  (DESKTOP_VIEWPORT.width * DESKTOP_VIEWPORT.height);

export const PHONE_THEATER_BOOK_VIEWPORT_RATIO =
  (PHONE_THEATER_BOOK.width * PHONE_THEATER_BOOK.height) /
  (PHONE_VIEWPORT.width * PHONE_VIEWPORT.height);

/** Theater spread padding. The book sits inside it. */
const DESKTOP_THEATER_PAD_Y = 68 + 28;
const PHONE_THEATER_PAD_Y = 48 + 20;
const PHONE_THEATER_PAD_X = 16 + 16;

export type ReaderScaleSurface = "desk" | "phone";

export type ReaderBookScale = {
  /** CSS zoom for the book block. 1 paints the XL tokens. */
  scale: number;
  /** True when the gray field, not the ratio, set the zoom. */
  clamped: boolean;
  /** Book area / viewport area this scale is aiming at. */
  ratio: number;
};

export function readerBookScale(input: {
  surface: ReaderScaleSurface;
  viewportWidth: number;
  viewportHeight: number;
  fieldWidth: number;
  fieldHeight: number;
  /** Theater pages are 340×500. Desktop is two pages. Phone is one column. */
  theater?: boolean;
}): ReaderBookScale {
  const phone = input.surface === "phone";
  const theater = input.theater === true;
  const ratio = theater
    ? phone
      ? PHONE_THEATER_BOOK_VIEWPORT_RATIO
      : DESKTOP_THEATER_BOOK_VIEWPORT_RATIO
    : phone
      ? PHONE_BOOK_VIEWPORT_RATIO
      : DESKTOP_BOOK_VIEWPORT_RATIO;
  const pageW = theater ? THEATER_PAGE.width : XL_PAGE.width;
  const pageH = theater ? THEATER_PAGE.height : XL_PAGE.height;
  const naturalW = phone ? pageW : theater ? DESKTOP_THEATER_BOOK.width : DESKTOP_BOOK.width;
  const naturalArea = naturalW * pageH;
  const blockW = phone
    ? pageW
    : theater
      ? DESKTOP_THEATER_BOOK.width
      : DESKTOP_GUTTER + pageW + pageW + DESKTOP_GUTTER;
  const blockH = !theater && phone ? PHONE_PAGE_MARGIN_TOP + pageH : pageH;
  const padX = theater && phone ? PHONE_THEATER_PAD_X : 0;
  const padY = theater ? (phone ? PHONE_THEATER_PAD_Y : DESKTOP_THEATER_PAD_Y) : SPREAD_PAD_Y;
  if (
    input.viewportWidth <= 0 ||
    input.viewportHeight <= 0 ||
    naturalArea <= 0 ||
    !Number.isFinite(input.viewportWidth) ||
    !Number.isFinite(input.viewportHeight)
  ) {
    return { scale: 1, clamped: false, ratio };
  }
  let scale = Math.sqrt((ratio * input.viewportWidth * input.viewportHeight) / naturalArea);
  let clamped = false;
  const availW = input.fieldWidth - padX;
  if (availW > 0 && blockW > 0) {
    const fit = availW / blockW;
    if (fit < scale) {
      scale = fit;
      clamped = true;
    }
  }
  const availH = input.fieldHeight - padY;
  if (availH > 0 && blockH > 0) {
    const fit = availH / blockH;
    if (fit < scale) {
      scale = fit;
      clamped = true;
    }
  }
  if (!Number.isFinite(scale) || scale <= 0) return { scale: 1, clamped: false, ratio };
  const rounded = clamped ? Math.floor(scale * 1000) / 1000 : Math.round(scale * 1000) / 1000;
  if (rounded <= 0) return { scale: 1, clamped: false, ratio };
  return { scale: rounded, clamped, ratio };
}
