/** Heatmap cell geometry. Keep in sync with `--atomic-heatmap-*` in styles.css. */

export const HEATMAP_CELL_PX = 11;
export const HEATMAP_GAP_PX = 1;
export const HEATMAP_WEEK_PAD_PX = 1;
export const HEATMAP_DAY_LABEL_PX = 22;
export const HEATMAP_SCROLL_PAD_PX = 4;

/** Week column width: cell plus `.fitness-week` horizontal padding. */
export function heatmapWeekColumnPx(): number {
  return HEATMAP_CELL_PX + 2 * HEATMAP_WEEK_PAD_PX;
}

/** Shared track width for month slots and week columns (gap between columns). */
export function heatmapTrackWidth(weekCount: number): number {
  if (!Number.isFinite(weekCount) || weekCount <= 0) return 0;
  return (
    weekCount * heatmapWeekColumnPx() + (weekCount - 1) * HEATMAP_GAP_PX
  );
}

export function heatmapWeeksWidth(weekCount: number): number {
  if (!Number.isFinite(weekCount) || weekCount <= 0) return 0;
  return heatmapTrackWidth(weekCount) + HEATMAP_SCROLL_PAD_PX;
}

export function heatmapBodyMinWidth(weekCount: number): number {
  return HEATMAP_DAY_LABEL_PX + heatmapWeeksWidth(weekCount);
}

/** True when the year grid is wider than the pane and must scroll, not clip. */
export function heatmapNeedsHorizontalScroll(
  containerWidth: number,
  weekCount: number,
): boolean {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return true;
  return heatmapBodyMinWidth(weekCount) > containerWidth;
}
