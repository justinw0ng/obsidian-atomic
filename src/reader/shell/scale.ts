/**
 * Settled book area as a share of the viewport.
 *
 * Desktop XL matches both designs: two 340×488 pages in a 1020×720 window.
 * 680×488 / (1020×720) = 61/135.
 *
 * The phone card matches the journey step 07 `.phone-page`: 350×520 inside
 * the 390×844 screen. The mock phone page is `height: auto`. Its border box
 * overflows the spread. The sized phone book is the journey card.
 *
 * Page-face tokens stay 340×488. `zoom` on the book block paints that share.
 * A field that cannot hold the share clamps the zoom so the block still fits.
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

export type ReaderScaleSurface = "desk" | "phone";

export type ReaderBookScale = {
  /** CSS zoom for the book block. 1 paints the 340×488 tokens. */
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
}): ReaderBookScale {
  const phone = input.surface === "phone";
  const ratio = phone ? PHONE_BOOK_VIEWPORT_RATIO : DESKTOP_BOOK_VIEWPORT_RATIO;
  const pageW = XL_PAGE.width;
  const pageH = XL_PAGE.height;
  const naturalArea = (phone ? pageW : DESKTOP_BOOK.width) * pageH;
  const blockW = phone ? pageW : DESKTOP_GUTTER + pageW + pageW + DESKTOP_GUTTER;
  const blockH = phone ? PHONE_PAGE_MARGIN_TOP + pageH : pageH;
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
  if (input.fieldWidth > 0 && blockW > 0) {
    const fit = input.fieldWidth / blockW;
    if (fit < scale) {
      scale = fit;
      clamped = true;
    }
  }
  const availH = input.fieldHeight - SPREAD_PAD_Y;
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
