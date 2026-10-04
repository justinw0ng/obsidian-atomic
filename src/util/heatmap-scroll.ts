/**
 * Compute scrollLeft so that targetRightPx aligns with the right edge of the scrollport.
 * Returns 0 when content does not overflow or inputs are invalid.
 */
export function scrollLeftToAlignRight(
  scrollWidth: number,
  clientWidth: number,
  targetRightPx: number,
): number {
  if (
    !Number.isFinite(scrollWidth) ||
    !Number.isFinite(clientWidth) ||
    !Number.isFinite(targetRightPx) ||
    scrollWidth < 0 ||
    clientWidth < 0
  ) {
    return 0;
  }

  if (scrollWidth <= clientWidth) {
    return 0;
  }

  const maxScrollLeft = scrollWidth - clientWidth;
  const desired = targetRightPx - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}

/**
 * Narrow panes open on today, with the left edge on a month label so the
 * first visible month is not cut. Wide panes stay at 0.
 */
export function scrollLeftToRevealToday(params: {
  scrollWidth: number;
  clientWidth: number;
  todayLeft: number;
  todayWidth: number;
  pitch: number;
  monthStarts: readonly number[];
}): number {
  const { scrollWidth, clientWidth, todayLeft, todayWidth, pitch, monthStarts } = params;
  if (
    !Number.isFinite(scrollWidth) ||
    !Number.isFinite(clientWidth) ||
    !Number.isFinite(todayLeft) ||
    !Number.isFinite(todayWidth) ||
    !Number.isFinite(pitch) ||
    scrollWidth < 0 ||
    clientWidth < 0 ||
    pitch < 0
  ) {
    return 0;
  }
  if (scrollWidth <= clientWidth) return 0;

  const minLeft = todayLeft + todayWidth + 2 * pitch - clientWidth;
  const start = monthStarts.find((value) => Number.isFinite(value) && value >= minLeft);
  const desired = start ?? minLeft;
  const maxScrollLeft = scrollWidth - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}
