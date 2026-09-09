import {
  barHeights,
  formatKg,
  type DashboardModel,
  type DashboardMonthlyColumn,
  type DashboardRecentRow,
} from "../core/dashboard";
import { parseYmd, weekdayDateForLanguage } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import {
  appendBars,
  appendPathLink,
  appendSectionTitle,
  FELT_LABEL_KEY,
  formatCount,
  monthLabel,
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

function kg(value: number, ctx: DashboardRenderContext): string {
  return `${formatKg(value)} ${t("view.dashboard.kgUnit", ctx.language)}`;
}

function columnHeader(column: DashboardMonthlyColumn, ctx: DashboardRenderContext): string {
  switch (column.kind) {
    case "sessions":
      return column.activity.label;
    case "volume":
      return t("view.dashboard.volumeHeader", ctx.language, { activity: column.activity.label });
    case "minutes":
      return t("view.dashboard.minutesHeader", ctx.language, { activity: column.activity.label });
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
  ctx: DashboardRenderContext,
): void {
  const legend = card.createDiv({ cls: "atomic-dash-legend" });
  for (const column of columns) {
    const item = legend.createSpan();
    item.createSpan({ cls: "atomic-dash-swatch" }).style.background = column.activity.colors[2];
    item.appendText(column.activity.label);
  }
  legend.createSpan({
    cls: "atomic-dash-legend-hint",
    text: t("view.dashboard.monthlyTableHint", ctx.language),
  });

  // One shared scale across activities so the columns compare visually.
  const shared = barHeights(columns.flatMap((column) => column.values));
  const cols = card.createDiv({ cls: "atomic-dash-cols", attr: { "aria-hidden": "true" } });
  for (let month = 0; month < 12; month++) {
    const col = cols.createDiv({ cls: "atomic-dash-col" });
    appendBars(
      col,
      columns.map((column, columnIndex) => ({
        value: column.values[month],
        height: shared[columnIndex * 12 + month],
        color: column.activity.colors[2],
        title: `${column.activity.label} · ${monthLabel(month, ctx)}: ${formatCount(column.values[month])}`,
      })),
      "column",
    );
  }
  const labels = card.createDiv({ cls: "atomic-dash-months atomic-dash-months-wide" });
  for (let month = 0; month < 12; month++) {
    labels.createSpan({ text: monthLabel(month, ctx) });
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
  appendSectionTitle(
    root,
    t("view.dashboard.monthly", ctx.language),
    t("view.dashboard.monthlyMeta", ctx.language),
  );
  const card = appendCard(root, "atomic-dashboard-monthly", "atomic-dash-chart");
  const sessionColumns = model.monthlyColumns.filter((column) => column.kind === "sessions");
  if (!sessionColumns.length) {
    appendMonthlyTable(card, model, ctx);
    return;
  }
  appendMonthlyChart(card, sessionColumns, ctx);
  const details = card.createEl("details");
  details.createEl("summary", { text: t("view.dashboard.showMonthlyTable", ctx.language) });
  appendMonthlyTable(details, model, ctx);
}

function renderMuscles(
  parent: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
): void {
  if (!model.muscles) return;
  const card = appendCard(parent, "atomic-dashboard-muscles");
  const setTable = model.activities.find(
    (item) => item.domain === "exercise" && item.volumeKg != null,
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
    const name = row.muscle || t("view.dashboard.unknownMuscle", ctx.language);
    const line = rank.createDiv({ cls: "atomic-dash-rank-row" });
    line.createSpan({ cls: "atomic-dash-rank-name", text: name, attr: { title: name } });
    const fill = line.createSpan({ cls: "atomic-dash-rank-bar" }).createSpan({ cls: "atomic-dash-rank-fill" });
    fill.style.width = `${widths[index]}%`;
    const value = line.createSpan({ cls: "atomic-dash-rank-value" });
    value.createEl("b", { text: kg(row.volumeKg, ctx) });
    value.appendText(` · ${formatCount(row.sets)}`);
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
  model.golfFocus.forEach(({ tag, count }, index) => {
    const chip = tags.createSpan({
      cls: index < 2 ? "atomic-dash-tag is-large" : "atomic-dash-tag",
    });
    chip.createSpan({ cls: "atomic-dash-dot" });
    chip.appendText(`${tag} `);
    chip.createEl("b", { text: formatCount(count) });
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

function recentSummary(row: DashboardRecentRow, ctx: DashboardRenderContext): string {
  const parts = [t("view.dashboard.minutesShort", ctx.language, { minutes: formatCount(row.minutes) })];
  if (row.volumeKg != null && row.volumeKg > 0) parts.push(kg(row.volumeKg, ctx));
  if (row.felt) {
    parts.push(
      t("view.dashboard.feltSummary", ctx.language, {
        felt: t(FELT_LABEL_KEY[row.felt], ctx.language),
      }),
    );
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
    line.createSpan({ cls: "atomic-dash-recent-summary", text: recentSummary(row, ctx) });
  }
}
