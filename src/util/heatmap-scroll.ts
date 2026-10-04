// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { HEATMAP_CELL_PX, HEATMAP_PITCH_PX, HEATMAP_TODAY_RING_PX } from "./heatmap-metrics.ts";

/** Column offsets for the scrollport. `todayColumn` and `monthColumns` are 0-based. */
export function heatmapRevealOffsets(
  todayColumn: number,
  monthColumns: readonly number[],
): { todayLeft: number; todayWidth: number; pitch: number; monthStarts: number[] } {
  return {
    todayLeft: todayColumn * HEATMAP_PITCH_PX,
    todayWidth: HEATMAP_CELL_PX,
    pitch: HEATMAP_PITCH_PX,
    monthStarts: monthColumns.map((column) => column * HEATMAP_PITCH_PX),
  };
}

/**
 * Narrow panes open on today, with the left edge on a month label so the
 * first visible month is not cut, and enough room past today for its ring.
 * Wide panes stay at 0.
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

  const minLeft =
    todayLeft + todayWidth + HEATMAP_TODAY_RING_PX + 2 * pitch - clientWidth;
  const start = monthStarts.find((value) => Number.isFinite(value) && value >= minLeft);
  const desired = start ?? minLeft;
  const maxScrollLeft = scrollWidth - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}
