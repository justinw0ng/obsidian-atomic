/** Heatmap cell geometry. Keep in sync with `--atomic-heat-*` in styles.css. */

export const HEATMAP_CELL_PX = 10;
export const HEATMAP_GAP_PX = 3;
export const HEATMAP_DAY_LABEL_PX = 16;
export const HEATMAP_LABEL_GAP_PX = 6;

/** Distance from one week column to the next. */
export const HEATMAP_PITCH_PX = HEATMAP_CELL_PX + HEATMAP_GAP_PX;

/** Year strip width: cells plus the gap between columns. */
export function heatmapTrackWidth(weekCount: number): number {
  if (!Number.isFinite(weekCount) || weekCount <= 0) return 0;
  const columns = Math.floor(weekCount);
  return columns * HEATMAP_CELL_PX + (columns - 1) * HEATMAP_GAP_PX;
}

export function heatmapBodyMinWidth(weekCount: number): number {
  return HEATMAP_DAY_LABEL_PX + HEATMAP_LABEL_GAP_PX + heatmapTrackWidth(weekCount);
}

/** True when the year grid is wider than the pane and must scroll, not clip. */
export function heatmapNeedsHorizontalScroll(
  containerWidth: number,
  weekCount: number,
): boolean {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return true;
  return heatmapBodyMinWidth(weekCount) > containerWidth;
}
