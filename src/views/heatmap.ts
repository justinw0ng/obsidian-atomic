import type { VaultDataSource } from "../data/vault-source";
import { nowYear, resolveBlockYear, ymdInZone } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, DayActivity } from "../types";
import { labelForLanguage } from "../util/bilingual-label";
import { resolveHeatmapActivities } from "../util/heatmap-activities";
import { heatmapWeekdayLabels } from "../util/heatmap-day-labels";
import {
  effectiveHeatmapColumns,
  resolveHeatmapLayout,
  type HeatmapLayout,
} from "../util/heatmap-layout";
import {
  appendHeatmapWeeks,
  buildHeatmapWeeks,
  heatmapActivityKey,
  heatmapLayoutKey,
  heatmapMonthPlacements,
  sameHeatmapPaintState,
  type HeatmapPaintState,
} from "../util/heatmap-model";
import { measureElementWidth } from "../util/element-width";
import { heatmapRevealOffsets, scrollLeftToRevealToday } from "../util/heatmap-scroll";
import { PaintMemo } from "../util/paint-memo";

type HeatmapObserverRegistry = {
  scrolls: ResizeObserver[];
  grid?: ResizeObserver;
};

const heatmapObserverRegistry = new WeakMap<HTMLElement, HeatmapObserverRegistry>();
const heatmapPaint = new PaintMemo<HeatmapPaintState>(
  '[data-testid="atomic-heatmap"], [data-testid="atomic-heatmap-empty"], [data-testid="atomic-heatmap-invalid"]',
  sameHeatmapPaintState,
);

function cleanupHeatmapObservers(container: HTMLElement): void {
  const registry = heatmapObserverRegistry.get(container);
  if (!registry) return;
  for (const observer of registry.scrolls) observer.disconnect();
  registry.grid?.disconnect();
  heatmapObserverRegistry.delete(container);
}

function wireHeatmapScroll(
  scrollEl: HTMLElement,
  registry: HeatmapObserverRegistry,
  todayColumn: number,
  monthColumns: readonly number[],
): void {
  let userHasScrolled = false;
  let expectedScrollLeft: number | null = null;
  const offsets = heatmapRevealOffsets(todayColumn, monthColumns);

  const applyTodayAlign = () => {
    if (todayColumn < 0) return;
    const nextScrollLeft = scrollLeftToRevealToday({
      scrollWidth: scrollEl.scrollWidth,
      clientWidth: scrollEl.clientWidth,
      ...offsets,
    });

    expectedScrollLeft = nextScrollLeft;
    scrollEl.scrollLeft = nextScrollLeft;
  };

  scrollEl.addEventListener(
    "scroll",
    () => {
      if (
        expectedScrollLeft !== null &&
        Math.abs(scrollEl.scrollLeft - expectedScrollLeft) < 1
      ) {
        expectedScrollLeft = null;
        return;
      }
      userHasScrolled = true;
    },
    { passive: true },
  );

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      if (userHasScrolled) return;
      window.requestAnimationFrame(() => {
        if (!userHasScrolled) applyTodayAlign();
      });
    });
    resizeObserver.observe(scrollEl);
    registry.scrolls.push(resizeObserver);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!userHasScrolled) applyTodayAlign();
    });
  });
}

function htmlElementFromTarget(target: EventTarget | null): HTMLElement | null {
  if (target == null || !("instanceOf" in target)) return null;
  const node = target as Node;
  return node.instanceOf(HTMLElement) ? node : null;
}

function wireHeatmapCellClicks(weeksEl: HTMLElement, data: VaultDataSource): void {
  weeksEl.addEventListener("click", (event) => {
    const target = htmlElementFromTarget(event.target);
    if (!target) return;
    const cell = target.closest(".atomic-heat-cell.is-link");
    const path = cell?.getAttribute("data-path");
    if (!path) return;
    event.preventDefault();
    void data.openPath(path);
  });
}

function renderOneHeatmap(
  root: HTMLElement,
  data: VaultDataSource,
  activity: ActivityType,
  year: number,
  timezone: string,
  language: Language,
  registry: HeatmapObserverRegistry,
  activityMap: Map<string, DayActivity>,
): void {
  const weeks = buildHeatmapWeeks({
    year,
    todayStr: ymdInZone(new Date(), timezone),
    language,
    activityMap,
  });
  const wrap = root.createDiv({
    cls: "atomic-heatmap",
    attr: {
      "data-testid": "atomic-heatmap",
      "data-activity": activity.id,
    },
  });
  // Paint off-document so ~370 cell createDivs do not mutate the live tree.
  wrap.detach();
  wrap.setCssProps({
    "--atomic-c": activity.colors[2],
    "--atomic-heat-weeks": String(weeks.length),
  });
  const head = wrap.createDiv({ cls: "atomic-heat-head" });
  const title = head.createSpan({ cls: "atomic-name" });
  title.createSpan({ cls: "atomic-dot" });
  title.createSpan({ text: labelForLanguage(activity.label, language) });
  head.createDiv({ cls: "atomic-readout atomic-heat-readout" });

  const body = wrap.createDiv({ cls: "atomic-heat-body" });
  const dayLabels = body.createDiv({ cls: "atomic-heat-days atomic-caption" });
  for (const mark of heatmapWeekdayLabels(language)) {
    dayLabels.createSpan({ text: mark });
  }

  const scroll = body.createDiv({
    cls: "atomic-heat-scroll fitness-heatmap-scroll atomic-scrollport",
    attr: { "data-testid": "atomic-heatmap-scroll" },
  });
  const grid = scroll.createDiv({ cls: "atomic-heat-grid" });
  const monthPlacements = heatmapMonthPlacements(weeks, language);
  const monthRow = grid.createDiv({ cls: "atomic-heat-months atomic-caption" });
  for (const placement of monthPlacements) {
    const label = monthRow.createSpan({
      text: placement.text,
      attr: {
        "data-testid": "atomic-heatmap-month",
        "data-month": String(placement.month),
        "data-week": String(placement.week),
      },
    });
    label.setCssProps({ "--w": String(placement.week) });
  }

  const cells = grid.createDiv({ cls: "atomic-heat-cells" });
  appendHeatmapWeeks(
    cells,
    weeks,
    activity.colors,
    t("view.heatmap.tooltip", language),
    t("view.heatmap.tooltipOpen", language),
  );
  wireHeatmapCellClicks(cells, data);
  wireHeatmapReadout(wrap, language);
  const todayColumn = weeks.findIndex((week) => week.some((day) => day.isToday));
  const monthColumns = monthPlacements.map((placement) => placement.week - 1);
  wireHeatmapScroll(scroll, registry, todayColumn, monthColumns);

  const foot = wrap.createDiv({ cls: "atomic-heat-foot" });
  foot.createSpan({
    cls: "atomic-caption",
    text: t("view.heatmap.byDuration", language),
  });
  const legend = foot.createDiv({ cls: "atomic-heat-legend" });
  legend.createSpan({ cls: "atomic-caption", text: t("view.heatmap.less", language) });
  legend.createSpan({ cls: "atomic-heat-cell", attr: { "data-l": "0" } });
  activity.colors.forEach((_, level) => {
    legend.createSpan({
      cls: "atomic-heat-cell",
      attr: { "data-l": String(level + 1) },
    });
  });
  legend.createSpan({ cls: "atomic-caption", text: t("view.heatmap.more", language) });
  root.appendChild(wrap);
}

function wireHeatmapReadout(wrap: HTMLElement, language: Language): void {
  const readout = wrap.querySelector(".atomic-heat-readout");
  if (!readout?.instanceOf(HTMLElement)) return;
  const cells = Array.from(wrap.querySelectorAll(".atomic-heat-cells .atomic-heat-cell"));
  let days = 0;
  let minutes = 0;
  for (const cell of cells) {
    if (!cell.instanceOf(HTMLElement)) continue;
    const value = Number(cell.getAttribute("data-minutes") || "0");
    if (value > 0) {
      days += 1;
      minutes += value;
    }
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const summary =
    hours > 0
      ? t("view.heatmap.summaryHours", language, { days, hours, minutes: rest })
      : t("view.heatmap.summary", language, { days, minutes });
  readout.setText(summary);
  wrap.addEventListener("pointerover", (event) => {
    const target = htmlElementFromTarget(event.target);
    if (!target) return;
    const cell = target.closest(".atomic-heat-cells .atomic-heat-cell");
    if (!cell?.instanceOf(HTMLElement)) return;
    const title = cell.getAttribute("title");
    if (title) readout.setText(title);
  });
  wrap.addEventListener("pointerleave", () => {
    readout.setText(summary);
  });
}

function wireHeatmapGrid(
  gridEl: HTMLElement,
  layout: HeatmapLayout,
  activityCount: number,
  registry: HeatmapObserverRegistry,
): void {
  // Preferred / documented NxM capacity; implicit rows still grow as needed.
  gridEl.style.gridTemplateRows = `repeat(${layout.rows}, auto)`;

  const applyColumns = () => {
    const fallback =
      typeof window !== "undefined" && Number.isFinite(window.innerWidth)
        ? window.innerWidth
        : layout.minColumnWidth;
    const columnCount = effectiveHeatmapColumns({
      columns: layout.columns,
      minColumnWidth: layout.minColumnWidth,
      containerWidth: measureElementWidth(gridEl, fallback),
      activityCount,
    });
    gridEl.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, ${layout.defaultSpan}fr))`;
  };

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(applyColumns);
    });
    resizeObserver.observe(gridEl);
    registry.grid = resizeObserver;
  }

  applyColumns();
}

export async function renderHeatmaps(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  timezone: string,
  language: Language,
  activityOption?: string,
  layoutOptions?: Record<string, string>,
): Promise<void> {
  const layout = resolveHeatmapLayout(layoutOptions ?? {});
  const { activities, invalidIds } = resolveHeatmapActivities(
    activityTypes,
    activityOption,
  );
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year)),
  );
  const paintState: HeatmapPaintState = {
    year,
    timezone,
    language,
    layoutKey: heatmapLayoutKey(layout),
    activityKey: heatmapActivityKey(activities),
    invalidIds,
    maps,
  };
  if (heatmapPaint.shouldSkip(el, paintState)) return;

  cleanupHeatmapObservers(el);
  el.empty();
  const registry: HeatmapObserverRegistry = { scrolls: [] };
  heatmapObserverRegistry.set(el, registry);

  const root = el.createDiv({ cls: "fitness-plugin" });
  if (invalidIds.length > 0) {
    root.createEl("p", {
      text: t("view.heatmap.invalidActivities", language, {
        ids: invalidIds.join(", "),
      }),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-invalid" },
    });
  }
  if (activities.length === 0 && invalidIds.length === 0) {
    root.createEl("p", {
      text: t("view.heatmap.noActivities", language),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-empty" },
    });
    return;
  }

  const useGrid = activities.length > 1 && layout.columns > 1;
  const heatmapParent = useGrid
    ? root.createDiv({ cls: "fitness-heatmap-grid" })
    : root;

  for (let i = 0; i < activities.length; i++) {
    renderOneHeatmap(
      heatmapParent,
      data,
      activities[i],
      year,
      timezone,
      language,
      registry,
      maps[i],
    );
  }

  if (useGrid) {
    wireHeatmapGrid(heatmapParent, layout, activities.length, registry);
  }
}

export function resolveHeatmapYear(
  opts: Record<string, string>,
  sourcePath: string,
  timezone: string,
): number {
  return resolveBlockYear(opts, nowYear(timezone), { sourcePath });
}
