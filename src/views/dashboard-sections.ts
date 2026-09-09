import {
  barHeights,
  formatKg,
  type DashboardModel,
  type DashboardMonthlyColumn,
} from "../core/dashboard";
import { monthShortForLanguage, parseYmd, weekdayDateForLanguage } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import {
  appendPathLink,
  appendSectionTitle,
  formatCount,
  type DashboardRenderContext,
} from "./dashboard-dom";

function appendCard(parent: HTMLElement, testId: string, extraCls = ""): HTMLElement {
  return parent.createDiv({
    cls: `atomic-dash-card ${extraCls}`.trim(),
    attr: { "data-testid": testId },
  });
}

function appendCardTitle(card: HTMLElement, title: string, meta: string): void {
  const row = card.createEl("h4", { cls: "atomic-dash-card-title", text: title });
  row.createSpan({ text: meta });
}

function appendEmpty(parent: HTMLElement, text: string): void {
  parent.createDiv({ cls: "atomic-dash-empty", text });
}

function columnHeader(column: DashboardMonthlyColumn, language: Language): string {
  switch (column.kind) {
    case "sessions":
      return column.activity.label;
    case "volume":
      return t("view.dashboard.volumeHeader", language, { activity: column.activity.label });
    case "minutes":
      return t("view.dashboard.minutesHeader", language, { activity: column.activity.label });
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

function appendMonthlyChart(
  card: HTMLElement,
  columns: DashboardMonthlyColumn[],
  language: Language,
): void {
  const legend = card.createDiv({ cls: "atomic-dash-legend" });
  for (const column of columns) {
    const item = legend.createSpan();
    const swatch = item.createSpan({ cls: "atomic-dash-swatch" });
    swatch.style.background = column.activity.colors[2];
    item.appendText(column.activity.label);
  }
  legend.createSpan({
    cls: "atomic-dash-legend-hint",
    text: t("view.dashboard.monthlyTableHint", language),
  });

  const shared = barHeights(columns.flatMap((column) => column.values));
  const cols = card.createDiv({ cls: "atomic-dash-cols", attr: { "aria-hidden": "true" } });
  for (let month = 0; month < 12; month++) {
    const col = cols.createDiv({ cls: "atomic-dash-col" });
    columns.forEach((column, columnIndex) => {
      const value = column.values[month];
      const bar = col.createSpan({
        cls: value > 0 ? "atomic-dash-col-bar" : "atomic-dash-col-bar is-zero",
        attr: {
          title: `${column.activity.label} · ${monthShortForLanguage(2000, month + 1, 1, language)}: ${formatCount(value)}`,
        },
      });
      bar.style.height = `${shared[columnIndex * 12 + month]}%`;
      if (value > 0) bar.style.background = column.activity.colors[2];
    });
  }
  const labels = card.createDiv({ cls: "atomic-dash-months atomic-dash-months-wide" });
  for (let month = 0; month < 12; month++) {
    labels.createSpan({ text: monthShortForLanguage(2000, month + 1, 1, language) });
  }
}

function appendMonthlyTable(
  parent: HTMLElement,
  model: DashboardModel,
  language: Language,
): void {
  const table = parent.createEl("table", { cls: "atomic-dash-table" });
  const headRow = table.createEl("thead").createEl("tr");
  headRow.createEl("th", { text: t("view.dashboard.month", language) });
  for (const column of model.monthlyColumns) {
    headRow.createEl("th", { text: columnHeader(column, language) });
  }
  const body = table.createEl("tbody");
  for (let month = 0; month < 12; month++) {
    const row = body.createEl("tr");
    row.createEl("td", { text: monthShortForLanguage(model.year, month + 1, 1, language) });
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
  appendSectionTitle(
    root,
    t("view.dashboard.monthly", ctx.language),
    t("view.dashboard.monthlyMeta", ctx.language),
  );
  const card = appendCard(root, "atomic-dashboard-monthly", "atomic-dash-chart");
  const sessionColumns = model.monthlyColumns.filter((column) => column.kind === "sessions");
  if (!sessionColumns.length) {
    appendMonthlyTable(card, model, ctx.language);
    return;
  }
  appendMonthlyChart(card, sessionColumns, ctx.language);
  const details = card.createEl("details");
  details.createEl("summary", { text: t("view.dashboard.showMonthlyTable", ctx.language) });
  appendMonthlyTable(details, model, ctx.language);
}

function renderMuscles(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.muscles) return;
  const card = appendCard(parent, "atomic-dashboard-muscles");
  const setTable = model.activities.find(
    (item) => item.domain === "exercise" && item.activity.supportsSetTable,
  );
  if (setTable) card.style.setProperty("--atomic-dash-accent", setTable.activity.colors[2]);
  appendCardTitle(
    card,
    t("view.dashboard.muscles", ctx.language),
    t("view.dashboard.byVolumeSets", ctx.language),
  );
  if (!model.muscles.length) {
    appendEmpty(card, t("view.dashboard.noSetData", ctx.language));
    return;
  }
  const rank = card.createDiv({ cls: "atomic-dash-rank" });
  const widths = barHeights(model.muscles.map((row) => row.volumeKg));
  model.muscles.forEach((row, index) => {
    const line = rank.createDiv({ cls: "atomic-dash-rank-row" });
    line.createSpan({ cls: "atomic-dash-rank-name", text: row.muscle, attr: { title: row.muscle } });
    const bar = line.createSpan({ cls: "atomic-dash-rank-bar" });
    const fill = bar.createSpan({ cls: "atomic-dash-rank-fill" });
    fill.style.width = `${widths[index]}%`;
    const value = line.createSpan({ cls: "atomic-dash-rank-value" });
    value.createEl("b", { text: formatKg(row.volumeKg) });
    value.appendText(` kg · ${formatCount(row.sets)}`);
  });
}

function renderGolfFocus(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.golfFocus) return;
  const golf = model.activities.find((item) => item.activity.id === "golf");
  const card = appendCard(parent, "atomic-dashboard-golf-focus");
  if (golf) card.style.setProperty("--atomic-dash-accent", golf.activity.colors[2]);
  appendCardTitle(
    card,
    t("view.dashboard.golfFocus", ctx.language),
    t("view.dashboard.focusMeta", ctx.language, { count: formatCount(golf?.count ?? 0) }),
  );
  if (!model.golfFocus.length) {
    appendEmpty(card, t("view.dashboard.noFocusTags", ctx.language));
    return;
  }
  const tags = card.createDiv({ cls: "atomic-dash-tags" });
  model.golfFocus.forEach(([name, count], index) => {
    const tag = tags.createSpan({
      cls: index < 2 ? "atomic-dash-tag is-large" : "atomic-dash-tag",
    });
    tag.createSpan({ cls: "atomic-dash-dot" });
    tag.appendText(`${name} `);
    tag.createEl("b", { text: formatCount(count) });
  });
}

export function renderDashboardDetails(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.muscles && !model.golfFocus) return;
  const columns = root.createDiv({ cls: "atomic-dash-columns" });
  renderMuscles(columns, model, ctx);
  renderGolfFocus(columns, model, ctx);
}

function recentSummary(
  row: DashboardModel["recent"][number],
  language: Language,
): string {
  const parts = [t("view.dashboard.minutesShort", language, { minutes: formatCount(row.minutes) })];
  if (row.volumeKg != null && row.volumeKg > 0) parts.push(`${formatKg(row.volumeKg)} kg`);
  if (row.felt) {
    const feltKey =
      row.felt === "good"
        ? "view.dashboard.feltGood"
        : row.felt === "ok"
          ? "view.dashboard.feltOk"
          : "view.dashboard.feltBad";
    parts.push(t("view.dashboard.feltSummary", language, { felt: t(feltKey, language) }));
  }
  return parts.join(" · ");
}

export function renderDashboardRecent(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.activities.some((card) => card.domain === "exercise")) return;
  appendSectionTitle(
    root,
    t("view.dashboard.recentSessions", ctx.language),
    t("view.dashboard.recentMeta", ctx.language, { count: model.recent.length }),
  );
  const card = appendCard(root, "atomic-dashboard-recent", "atomic-dash-recent");
  if (!model.recent.length) {
    appendEmpty(card, t("view.dashboard.noSessions", ctx.language));
    return;
  }
  for (const row of model.recent) {
    const line = card.createDiv({
      cls: "atomic-dash-recent-row",
      attr: { "data-testid": "atomic-dashboard-recent-row", "data-path": row.path },
    });
    line.style.setProperty("--atomic-dash-accent", row.activity.colors[2]);
    const parsed = parseYmd(row.date);
    line.createSpan({
      cls: "atomic-dash-recent-date",
      text: parsed
        ? weekdayDateForLanguage(parsed.y, parsed.m, parsed.d, ctx.language)
        : row.date,
    });
    line.createSpan({ cls: "atomic-dash-dot" });
    const what = line.createSpan({ cls: "atomic-dash-recent-what" });
    appendPathLink(what, row.activity.label, row.path, ctx);
    what.createSpan({ cls: "atomic-dash-recent-path", text: row.path });
    line.createSpan({ cls: "atomic-dash-recent-summary", text: recentSummary(row, ctx.language) });
  }
}
