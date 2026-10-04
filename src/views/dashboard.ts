import type { VaultDataSource } from "../data/vault-source";
import { EMPTY_SET_ROWS } from "../core/set-table";
import {
  averagePerSession,
  buildDashboardModel,
  dashboardPaintState,
  formatCompactKg,
  formatKg,
  sameDashboardPaintState,
  splitHoursMinutes,
  type DashboardActivityCard,
  type DashboardExerciseCard,
  type DashboardHobbyCard,
  type DashboardInput,
  type DashboardModel,
  type DashboardPaintState,
} from "../core/dashboard";
import { nowYear, resolveBlockYear } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { exerciseActivities, hobbyActivities } from "../util/activity-types";
import { labelForLanguage, ledgerActivityName } from "../util/bilingual-label";
import { appendCatalogLabel } from "./catalog-label";
import {
  activityLinks,
  appendActivityLink,
  appendMonthBars,
  appendMonthInitials,
  appendSectionTitle,
  formatCount,
  shortDate,
  type DashboardRenderContext,
} from "./dashboard-dom";
import {
  renderDashboardDetails,
  renderDashboardMonthly,
  renderDashboardRecent,
} from "./dashboard-sections";
import { appendRoll, playRolls, prefersReducedMotion } from "./digit-roll";
import { PaintMemo } from "../util/paint-memo";

/** Bumped per host element so an older year switch cannot paint over a newer one. */
const renderGeneration = new WeakMap<HTMLElement, number>();
const dashboardPaint = new PaintMemo<DashboardPaintState>(
  '[data-testid="atomic-dashboard"]',
  sameDashboardPaintState,
);

export function resolveDashboardYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear });
}

async function collectDashboardInput(
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
): Promise<DashboardInput> {
  const exercise = await Promise.all(
    exerciseActivities(activityTypes).map(async (activity) => {
      const sessions = await Promise.all(
        data.listSessions(activity.folder, year).map(async (meta) => ({
          meta,
          setRows: activity.supportsSetTable
            ? await data.getSessionSetRows(meta.path)
            : EMPTY_SET_ROWS,
        })),
      );
      return { activity, sessions };
    }),
  );
  const hobbies = await Promise.all(
    hobbyActivities(activityTypes).map(async (activity) => {
      const items = await Promise.all(
        data.listHobbyItems(activity).map(async (item) => ({
          path: item.path,
          frontmatter: item.frontmatter,
          entries: await data.getHobbyTimeLogEntries(item.path),
        })),
      );
      return { activity, items };
    }),
  );
  return { year, exercise, hobbies };
}

function renderHeader(
  root: HTMLElement,
  model: DashboardModel,
  ctx: DashboardRenderContext,
  onYear: (year: number) => void,
): void {
  const top = root.createDiv({ cls: "atomic-dash-top" });
  const switcher = top.createDiv({ cls: "atomic-stepper" });
  const yearButton = (label: string, key: string, testId: string, target: number) => {
    const button = switcher.createEl("button", {
      text: label,
      cls: "atomic-btn is-icon",
      attr: { "aria-label": t(key, ctx.language), "data-testid": testId, type: "button" },
    });
    button.addEventListener("click", () => onYear(target));
  };
  yearButton("‹", "view.dashboard.prevYear", "atomic-dashboard-year-prev", model.year - 1);
  const yearValue = switcher.createSpan({ cls: "atomic-stepper-value" });
  appendRoll(yearValue, String(model.year));
  yearButton("›", "view.dashboard.nextYear", "atomic-dashboard-year-next", model.year + 1);

  const range = top.createDiv({ cls: "atomic-readout atomic-dash-range" });
  if (model.firstDate && model.lastDate) {
    appendCatalogLabel(
      range,
      t("view.dashboard.range", ctx.language, {
        from: shortDate(model.firstDate, ctx),
        to: shortDate(model.lastDate, ctx),
      }),
    );
    range.appendText(" · ");
  }
  appendCatalogLabel(
    range,
    t("view.dashboard.sessionsCount", ctx.language, { count: formatCount(model.totalSessions) }),
  );

  const links = top.createDiv({ cls: "atomic-jumps" });
  for (const card of model.activities) {
    for (const link of activityLinks(card, ctx)) {
      appendActivityLink(links, link, "atomic-link");
    }
  }
}

function appendKpiCard(
  grid: HTMLElement,
  id: string,
  label: string,
): { value: HTMLElement; hint: HTMLElement } {
  const card = grid.createDiv({
    cls: "atomic-kpi",
    attr: { "data-testid": "atomic-dashboard-kpi", "data-kpi": id },
  });
  const caption = card.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, label);
  const value = card.createDiv({ cls: "atomic-kpi-value atomic-dash-kpi-value" });
  const hint = card.createDiv({ cls: "atomic-hint" });
  return { value, hint };
}

function appendHoursMinutes(
  target: HTMLElement,
  totalMinutes: number,
  ctx: DashboardRenderContext,
  tight: boolean,
): void {
  const { hours, minutes } = splitHoursMinutes(totalMinutes);
  const unit = tight ? "atomic-unit is-tight" : "atomic-unit";
  appendRoll(target, formatCount(hours));
  target.createSpan({
    cls: unit,
    text: t("view.dashboard.hourUnitShort", ctx.language),
  });
  appendRoll(target, String(minutes).padStart(2, "0"));
  target.createSpan({
    cls: unit,
    text: t("view.dashboard.minuteUnitShort", ctx.language),
  });
}

function splitText(
  cards: DashboardActivityCard[],
  language: Language,
  pick: (card: DashboardActivityCard) => number,
): string {
  return cards
    .map((card) => `${labelForLanguage(card.activity.label, language)} ${formatCount(pick(card))}`)
    .join(" · ");
}

function renderKpis(root: HTMLElement, model: DashboardModel, ctx: DashboardRenderContext): void {
  const grid = root.createDiv({ cls: "atomic-kpis" });
  const exercise = model.activities.filter(
    (card): card is DashboardExerciseCard => card.domain === "exercise",
  );
  const hobbies = model.activities.filter(
    (card): card is DashboardHobbyCard => card.domain === "hobby",
  );

  if (exercise.length) {
    const sessions = appendKpiCard(grid, "sessions", t("view.dashboard.kpiSessions", ctx.language));
    appendRoll(sessions.value, formatCount(model.totalSessions));
    appendCatalogLabel(sessions.hint, splitText(exercise, ctx.language, (card) => card.count));

    const time = appendKpiCard(grid, "exercise-time", t("view.dashboard.kpiExerciseTime", ctx.language));
    appendHoursMinutes(time.value, model.totalExerciseMinutes, ctx, false);
    time.hint.createSpan({
      text: t("view.dashboard.avgPerSession", ctx.language, {
        minutes: formatCount(model.totalExerciseMinutes),
        avg: averagePerSession(model.totalExerciseMinutes, model.totalSessions),
      }),
    });
  }

  if (model.totalVolumeKg != null) {
    const volume = appendKpiCard(grid, "volume", t("view.dashboard.kpiVolume", ctx.language));
    appendRoll(volume.value, formatKg(model.totalVolumeKg));
    volume.value.createSpan({
      cls: "atomic-unit",
      text: t("view.dashboard.kgUnit", ctx.language),
    });
    const setTableLabels = exercise
      .filter((card) => card.volumeKg != null)
      .map((card) => labelForLanguage(card.activity.label, ctx.language))
      .join(" · ");
    appendCatalogLabel(
      volume.hint,
      `${t("view.dashboard.setTableRows", ctx.language)} · ${setTableLabels}`,
    );
  }

  if (model.totalHabitMinutes != null) {
    const habit = appendKpiCard(grid, "habit-time", t("view.dashboard.kpiHabitTime", ctx.language));
    appendHoursMinutes(habit.value, model.totalHabitMinutes, ctx, false);
    appendCatalogLabel(
      habit.hint,
      `${splitText(hobbies, ctx.language, (card) => card.minutes)} ${t("view.dashboard.unitMinutes", ctx.language)}`,
    );
  }
}

function appendStat(parent: HTMLElement, value: string, unit: string): void {
  appendRoll(parent, value);
  parent.createSpan({ cls: "atomic-unit", text: unit });
}

function appendDetail(parent: HTMLElement, value: string, unit: string): void {
  parent.createEl("strong", { text: value });
  parent.appendText(" ");
  appendCatalogLabel(parent, unit);
}

function renderLedgerHead(ledger: HTMLElement, ctx: DashboardRenderContext): void {
  const head = ledger.createDiv({ cls: "atomic-ledger-head" });
  head.createSpan({ attr: { "aria-hidden": "true" } });
  for (const key of [
    "view.dashboard.colCount",
    "view.dashboard.colTime",
    "view.dashboard.colDetail",
  ] as const) {
    const cell = head.createDiv({ cls: "atomic-caption" });
    appendCatalogLabel(cell, t(key, ctx.language));
  }
  appendMonthInitials(head, ctx);
  const last = head.createDiv({ cls: "atomic-caption atomic-ledger-end" });
  appendCatalogLabel(last, t("view.dashboard.colLast", ctx.language));
}

/** Last column: the latest session in this year. The arrow opens that note. */
function appendLastSession(
  row: HTMLElement,
  card: DashboardActivityCard,
  ctx: DashboardRenderContext,
): void {
  const end = row.createDiv({ cls: "atomic-ledger-end" });
  const date = card.lastDate;
  const path = card.lastPath;
  if (!date || !path) return;
  const link = end.createEl("a", {
    cls: "atomic-link",
    attr: {
      href: "#",
      "data-testid": "atomic-dashboard-last",
      "data-path": path,
    },
  });
  link.appendText(shortDate(date, ctx));
  link.createSpan({ cls: "atomic-link-arrow", text: "→" });
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void ctx.data.openPath(path);
  });
}

function renderExerciseRow(
  row: HTMLElement,
  data: DashboardExerciseCard,
  ctx: DashboardRenderContext,
): void {
  const count = row.createDiv({ cls: "atomic-ledger-count atomic-stat" });
  appendStat(count, formatCount(data.count), t("view.dashboard.unitSessions", ctx.language));
  const time = row.createDiv({ cls: "atomic-ledger-time atomic-stat" });
  appendHoursMinutes(time, data.minutes, ctx, true);
  const detail = row.createDiv({ cls: "atomic-ledger-detail" });
  if (data.volumeKg != null) {
    appendDetail(detail, formatCompactKg(data.volumeKg), t("view.dashboard.kgLifted", ctx.language));
  } else if (data.felt) {
    appendDetail(detail, formatCount(data.felt.good), t("view.dashboard.feltGoodCount", ctx.language));
  }
  const bars = row.createDiv({ cls: "atomic-ledger-bars" });
  bars.style.setProperty("--atomic-c", data.activity.colors[2]);
  appendMonthBars(
    bars,
    data.monthlyMinutes,
    data.activity.colors[2],
    t("view.dashboard.barsHours", ctx.language),
    ctx,
  );
  appendLastSession(row, data, ctx);
}

function renderHobbyRow(
  row: HTMLElement,
  data: DashboardHobbyCard,
  ctx: DashboardRenderContext,
): void {
  const count = row.createDiv({ cls: "atomic-ledger-count atomic-stat" });
  appendStat(count, formatCount(data.count), t("view.dashboard.unitItems", ctx.language));
  const time = row.createDiv({ cls: "atomic-ledger-time atomic-stat" });
  appendHoursMinutes(time, data.minutes, ctx, true);
  const detail = row.createDiv({ cls: "atomic-ledger-detail" });
  const detailKey =
    data.activity.id === "reading" ? "view.dashboard.readingNow" : "view.dashboard.inProgress";
  appendDetail(detail, formatCount(data.inProgress), t(detailKey, ctx.language));
  const bars = row.createDiv({ cls: "atomic-ledger-bars" });
  bars.style.setProperty("--atomic-c", data.activity.colors[2]);
  appendMonthBars(
    bars,
    data.monthlyMinutes,
    data.activity.colors[2],
    t("view.dashboard.barsHours", ctx.language),
    ctx,
  );
  appendLastSession(row, data, ctx);
}

function renderActivityRow(
  grid: HTMLElement,
  card: DashboardActivityCard,
  ctx: DashboardRenderContext,
): void {
  const { activity } = card;
  const row = grid.createDiv({
    cls: "atomic-ledger-row",
    attr: {
      "data-testid": "atomic-dashboard-activity",
      "data-activity": activity.id,
      "data-count": String(card.count),
    },
  });
  row.style.setProperty("--atomic-c", activity.colors[2]);

  const name = row.createDiv({ cls: "atomic-ledger-name" });
  const title = name.createSpan({ cls: "atomic-name" });
  title.createSpan({ cls: "atomic-dot" });
  const shown = ledgerActivityName(activity.label);
  const label = title.createSpan();
  label.appendText(shown.name);
  if (shown.zh) {
    label.createSpan({
      cls: "atomic-inline-zh",
      text: shown.zh,
      attr: { lang: "zh-Hant-HK" },
    });
  }
  const kind = name.createDiv({ cls: "atomic-caption" });

  switch (card.domain) {
    case "exercise":
      appendCatalogLabel(kind, t("view.dashboard.domainExercise", ctx.language));
      renderExerciseRow(row, card, ctx);
      break;
    case "hobby":
      appendCatalogLabel(kind, t("view.dashboard.domainHabit", ctx.language));
      renderHobbyRow(row, card, ctx);
      break;
    default: {
      const exhaustive: never = card;
      return exhaustive;
    }
  }
}

function renderActivities(root: HTMLElement, model: DashboardModel, ctx: DashboardRenderContext): void {
  if (!model.activities.length) return;
  const { section } = appendSectionTitle(
    root,
    t("view.dashboard.activities", ctx.language),
    t("view.dashboard.activitiesMeta", ctx.language),
  );
  section.setAttr("data-testid", "atomic-dashboard-activities");
  const ledger = section.createDiv({ cls: "atomic-ledger" });
  renderLedgerHead(ledger, ctx);
  for (const card of model.activities) renderActivityRow(ledger, card, ctx);
}

export async function renderDashboard(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  language: Language,
  timezone: string,
  animateRolls = false,
): Promise<void> {
  const generation = (renderGeneration.get(el) ?? 0) + 1;
  renderGeneration.set(el, generation);
  const input = await collectDashboardInput(data, activityTypes, year);
  if (!el.isConnected || renderGeneration.get(el) !== generation) return;

  if (dashboardPaint.shouldSkip(el, dashboardPaintState(input, language))) return;
  const model = buildDashboardModel(input);

  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-dashboard",
    attr: { "data-testid": "atomic-dashboard", "data-year": String(year) },
  });
  const ctx: DashboardRenderContext = { data, language, timezone, year };
  const onYear = (nextYear: number) => {
    void renderDashboard(el, data, activityTypes, nextYear, language, timezone, true);
  };

  renderHeader(root, model, ctx, onYear);
  renderKpis(root, model, ctx);
  renderActivities(root, model, ctx);
  renderDashboardMonthly(root, model, ctx);
  renderDashboardDetails(root, model, ctx);
  renderDashboardRecent(root, model, ctx);
  if (!animateRolls || prefersReducedMotion(root)) return;
  const view = root.ownerDocument.defaultView;
  if (view?.requestAnimationFrame) view.requestAnimationFrame(() => playRolls(root));
  else playRolls(root);
}
