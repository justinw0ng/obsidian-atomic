import {
  FELT_ORDER,
  formatKg,
  type DashboardExerciseCard,
  type DashboardModel,
  type DashboardMonthlyColumn,
  type DashboardRecentRow,
  type Felt,
} from "../core/dashboard";
import { parseYmd, weekdayDateForLanguage } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import { labelForLanguage } from "../util/bilingual-label";
import { isFutureMonth, stackedMonthPeak } from "../util/month-chart";
import { appendCatalogLabel, appendInlineCatalog } from "./catalog-label";
import {
  appendPathLink,
  appendSectionTitle,
  FELT_LABEL_KEY,
  formatCount,
  monthLabel,
  type DashboardRenderContext,
} from "./dashboard-dom";

function appendEmpty(parent: HTMLElement, text: string): void {
  parent.createDiv({ cls: "atomic-dash-empty", text });
}

function kg(value: number, ctx: DashboardRenderContext): string {
  return `${formatKg(value)} ${t("view.dashboard.kgUnit", ctx.language)}`;
}

function shownActivity(column: DashboardMonthlyColumn, ctx: DashboardRenderContext): string {
  return labelForLanguage(column.activity.label, ctx.language);
}

function columnHeader(column: DashboardMonthlyColumn, ctx: DashboardRenderContext): string {
  switch (column.kind) {
    case "sessions":
      return shownActivity(column, ctx);
    case "volume":
      return t("view.dashboard.volumeHeader", ctx.language, { activity: shownActivity(column, ctx) });
    case "minutes":
      return t("view.dashboard.minutesHeader", ctx.language, { activity: shownActivity(column, ctx) });
    default: {
      const exhaustive: never = column.kind;
      return exhaustive;
    }
  }
}

function columnCell(column: DashboardMonthlyColumn, index: number): string {
  return column.kind === "volume"
    ? formatKg(column.values[index])
    : formatCount(column.values[index]);
}

function chartMax(columns: DashboardMonthlyColumn[], year: number, timeZone: string): number {
  return stackedMonthPeak(
    columns.map((column) =>
      column.values.map((value, month) => (isFutureMonth(year, month, timeZone) ? 0 : value)),
    ),
  );
}

function chartTick(max: number, mark: number): string {
  const value = Math.round(max * mark * 10) / 10;
  return formatCount(value);
}

function sectionReadout(section: HTMLElement): HTMLElement | null {
  const readout = section.querySelector(".atomic-readout");
  if (readout == null || !readout.instanceOf(HTMLElement)) return null;
  return readout;
}

function appendChartLegend(
  parent: HTMLElement,
  columns: DashboardMonthlyColumn[],
  ctx: DashboardRenderContext,
): void {
  const legend = parent.createDiv({ cls: "atomic-legend" });
  for (const column of columns) {
    const item = legend.createSpan();
    const dot = item.createSpan({ cls: "atomic-dot" });
    dot.setCssProps({ "--atomic-c": column.activity.colors[2] });
    item.appendText(shownActivity(column, ctx));
  }
}

function appendMonthlyChart(
  card: HTMLElement,
  columns: DashboardMonthlyColumn[],
  ctx: DashboardRenderContext,
  readout: HTMLElement,
  year: number,
): void {
  const max = chartMax(columns, year, ctx.timezone);
  const axis = card.createDiv({ cls: "atomic-chart-y atomic-caption" });
  for (const mark of [0, 0.5, 1]) {
    axis.createSpan({
      text: chartTick(max, mark),
      attr: { style: `--y:${mark}` },
    });
  }
  const plot = card.createDiv({ cls: "atomic-chart-plot" });
  for (const mark of [0, 0.5, 1]) {
    plot.createSpan({
      cls: mark === 0 ? "atomic-chart-grid is-base" : "atomic-chart-grid",
      attr: { style: `--y:${mark}` },
    });
  }
  const cols = plot.createDiv({ cls: "atomic-chart-cols", attr: { "aria-hidden": "true" } });
  const labels = card.createDiv({ cls: "atomic-chart-x atomic-caption" });
  for (let month = 0; month < 12; month++) {
    const future = isFutureMonth(year, month, ctx.timezone);
    const name = monthLabel(month, ctx, year);
    const col = cols.createDiv({
      cls: future ? "atomic-chart-col is-future" : "atomic-chart-col",
      attr: {
        "data-testid": "atomic-dashboard-month-col",
        "data-month": String(month + 1),
      },
    });
    const parts: string[] = [name];
    if (!future) {
      for (const column of columns) {
        const value = column.values[month] ?? 0;
        const seg = col.createSpan({ cls: "atomic-chart-seg" });
        seg.style.setProperty("--atomic-c", column.activity.colors[2]);
        seg.style.setProperty("--v", (value / max).toFixed(3));
        const activityName = shownActivity(column, ctx);
        seg.setAttr("title", `${activityName} · ${name}: ${formatCount(value)}`);
        parts.push(`${activityName} ${formatCount(value)}`);
      }
    }
    const label = labels.createSpan();
    label.createSpan({ cls: "is-long", text: name });
    label.createSpan({ cls: "is-short", text: name.slice(0, 1) });
    if (future) continue;
    const summary = parts.join(" · ");
    col.addEventListener("pointerenter", () => {
      card.addClass("is-reading");
      col.addClass("is-hot");
      label.addClass("is-hot");
      readout.setText(summary);
    });
    col.addEventListener("pointerleave", () => {
      card.removeClass("is-reading");
      col.removeClass("is-hot");
      label.removeClass("is-hot");
      readout.setText(t("view.dashboard.monthlyMeta", ctx.language));
    });
  }
}

function appendMonthlyTable(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  const table = parent.createEl("table", { cls: "atomic-dash-table" });
  const headRow = table.createEl("thead").createEl("tr");
  headRow.createEl("th", { text: t("view.dashboard.month", ctx.language) });
  for (const column of model.monthlyColumns) {
    headRow.createEl("th", { text: columnHeader(column, ctx) });
  }
  const body = table.createEl("tbody");
  for (let month = 0; month < 12; month++) {
    const row = body.createEl("tr");
    row.createEl("td", { text: monthLabel(month, ctx, model.year) });
    for (const column of model.monthlyColumns) {
      row.createEl("td", { text: columnCell(column, month) });
    }
  }
}

export function renderDashboardMonthly(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.monthlyColumns.length) return;
  const { section, titleWrap } = appendSectionTitle(
    root,
    t("view.dashboard.monthly", ctx.language),
    t("view.dashboard.monthlyMeta", ctx.language),
  );
  const sessionColumns = model.monthlyColumns.filter((column) => column.kind === "sessions");
  const readout = sectionReadout(section);
  const card = section.createDiv({
    attr: { "data-testid": "atomic-dashboard-monthly" },
  });
  if (sessionColumns.length > 0 && readout) {
    appendChartLegend(titleWrap, sessionColumns, ctx);
    card.addClass("atomic-chart");
    appendMonthlyChart(card, sessionColumns, ctx, readout, model.year);
    const details = section.createEl("details", { cls: "atomic-quiet-toggle" });
    details.createEl("summary", { text: t("view.dashboard.showMonthlyTable", ctx.language) });
    appendMonthlyTable(details, model, ctx);
    return;
  }
  appendMonthlyTable(card, model, ctx);
}

function renderMuscles(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.muscles) return;
  const { activity, rows } = model.muscles;
  const { section } = appendSectionTitle(
    parent,
    t("view.dashboard.muscles", ctx.language),
    t("view.dashboard.byVolumeSets", ctx.language),
  );
  const card = section.createDiv({
    cls: "atomic-stack",
    attr: { "data-testid": "atomic-dashboard-muscles" },
  });
  card.style.setProperty("--atomic-c", activity.colors[2]);
  if (!rows.length) {
    appendEmpty(card, t("view.dashboard.noSetData", ctx.language));
    return;
  }
  const peak = Math.max(1, ...rows.map((row) => row.volumeKg));
  for (const row of rows) {
    const name = row.muscle || t("view.dashboard.unknownMuscle", ctx.language);
    const line = card.createDiv({ cls: "atomic-fill-row" });
    line.style.setProperty("--v", (row.volumeKg / peak).toFixed(3));
    const label = line.createSpan({ attr: { title: name } });
    appendCatalogLabel(label, name);
    line.createSpan({
      cls: "atomic-fill-row-value",
      text: `${kg(row.volumeKg, ctx)} · ${formatCount(row.sets)}`,
    });
  }
}

function feltClass(key: Felt): string {
  switch (key) {
    case "good":
      return "";
    case "ok":
      return "is-ok";
    case "bad":
      return "is-bad";
    default: {
      const exhaustive: never = key;
      return exhaustive;
    }
  }
}

function appendFelt(
  parent: HTMLElement,
  felt: NonNullable<DashboardExerciseCard["felt"]>,
  ctx: DashboardRenderContext,
): void {
  const total = FELT_ORDER.reduce((sum, key) => sum + felt[key], 0);
  const wrap = parent.createDiv({ cls: "atomic-felt" });
  const bar = wrap.createDiv({
    cls: "atomic-felt-bar",
    attr: { title: t("view.dashboard.feltTitle", ctx.language) },
  });
  const legend = wrap.createDiv({ cls: "atomic-legend atomic-hint" });
  for (const key of FELT_ORDER) {
    const seg = bar.createSpan({ cls: feltClass(key) });
    seg.style.setProperty("--v", total > 0 ? (felt[key] / total).toFixed(3) : "0");
    const item = legend.createSpan();
    item.createSpan({ cls: `atomic-dot ${feltClass(key)}`.trim() });
    appendCatalogLabel(item, t(FELT_LABEL_KEY[key], ctx.language));
    item.appendText(` ${felt[key]}`);
  }
}

function renderGolfFocus(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.golfFocus) return;
  const { activity, sessions, tags } = model.golfFocus;
  const { section } = appendSectionTitle(
    parent,
    t("view.dashboard.golfFocus", ctx.language),
    t("view.dashboard.focusMeta", ctx.language, { count: formatCount(sessions) }),
  );
  const card = section.createDiv({
    cls: "atomic-stack",
    attr: { "data-testid": "atomic-dashboard-golf-focus" },
  });
  card.style.setProperty("--atomic-c", activity.colors[2]);
  if (!tags.length) {
    appendEmpty(card, t("view.dashboard.noFocusTags", ctx.language));
  } else {
    for (const { tag, count } of tags) {
      const line = card.createDiv({ cls: "atomic-leader-row" });
      line.createSpan({ text: tag });
      line.createSpan({ cls: "atomic-leader" });
      line.createSpan({ cls: "atomic-leader-value", text: formatCount(count) });
    }
  }
  const golf = model.activities.find(
    (entry): entry is DashboardExerciseCard =>
      entry.domain === "exercise" && entry.activity.id === activity.id && entry.felt != null,
  );
  if (golf?.felt) appendFelt(card, golf.felt, ctx);
}

export function renderDashboardDetails(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.muscles && !model.golfFocus) return;
  const columns = root.createDiv({ cls: "atomic-split" });
  renderMuscles(columns, model, ctx);
  renderGolfFocus(columns, model, ctx);
}

function recentParts(
  row: DashboardRecentRow,
  ctx: DashboardRenderContext,
): { minutes: string; extra: string } {
  const extras: string[] = [];
  if (row.volumeKg != null && row.volumeKg > 0) extras.push(kg(row.volumeKg, ctx));
  if (row.felt) {
    extras.push(
      t("view.dashboard.feltSummary", ctx.language, {
        felt: t(FELT_LABEL_KEY[row.felt], ctx.language),
      }),
    );
  }
  return {
    minutes: formatCount(row.minutes),
    extra: extras.join(" · "),
  };
}

export function renderDashboardRecent(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.activities.some((card) => card.domain === "exercise")) return;
  const { section } = appendSectionTitle(
    root,
    t("view.dashboard.recentSessions", ctx.language),
    t("view.dashboard.recentMeta", ctx.language, { count: model.recent.length }),
  );
  const card = section.createDiv({
    cls: "atomic-recent",
    attr: { "data-testid": "atomic-dashboard-recent" },
  });
  if (!model.recent.length) {
    appendEmpty(card, t("view.dashboard.noSessions", ctx.language));
    return;
  }
  for (const row of model.recent) {
    const line = card.createDiv({
      cls: "atomic-recent-row atomic-dash-recent-row",
      attr: {
        "data-testid": "atomic-dashboard-recent-row",
        "data-path": row.path,
        role: "link",
        tabindex: "0",
      },
    });
    line.setCssProps({ "--atomic-c": row.activity.colors[2] });
    const openNote = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      void ctx.data.openPath(row.path);
    };
    line.addEventListener("click", openNote);
    line.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      openNote(event);
    });
    const parsed = parseYmd(row.date);
    line.createSpan({
      cls: "atomic-recent-date",
      text: parsed
        ? weekdayDateForLanguage(parsed.y, parsed.m, parsed.d, ctx.language)
        : row.date,
    });
    const what = line.createSpan({ cls: "atomic-name" });
    what.createSpan({ cls: "atomic-dot" });
    appendPathLink(what, labelForLanguage(row.activity.label, ctx.language), row.path, ctx, "atomic-link");
    const parts = recentParts(row, ctx);
    const sum = line.createSpan({ cls: "atomic-recent-sum" });
    sum.createEl("strong", { text: parts.minutes });
    sum.appendText(" ");
    appendInlineCatalog(sum, t("view.dashboard.minuteWord", ctx.language));
    if (parts.extra) {
      sum.createSpan({ cls: "is-extra", text: ` · ${parts.extra}` });
    }
    line.createSpan({ cls: "atomic-recent-sub", text: parts.extra });
    line.createSpan({ cls: "atomic-recent-arrow", text: "→" });
  }
}
