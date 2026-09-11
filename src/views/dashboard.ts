import type { VaultDataSource } from "../data/vault-source";
import type { SetRow } from "../core";
import {
  averagePerSession,
  barHeights,
  buildDashboardModel,
  dashboardPaintState,
  FELT_ORDER,
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
  type Felt,
} from "../core/dashboard";
import { nowYear, resolveBlockYear } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { exerciseActivities, hobbyActivities } from "../util/activity-types";
import {
  activityLinks,
  appendBars,
  appendMonthBars,
  appendPathLink,
  appendSectionTitle,
  FELT_LABEL_KEY,
  formatCount,
  localDate,
  type DashboardRenderContext,
} from "./dashboard-dom";
import {
  renderDashboardDetails,
  renderDashboardMonthly,
  renderDashboardRecent,
} from "./dashboard-sections";

/** Bumped per host element so an older year switch cannot paint over a newer one. */
const renderGeneration = new WeakMap<HTMLElement, number>();
const paintStates = new WeakMap<HTMLElement, DashboardPaintState>();

export function dashboardDomIsPainted(el: {
  querySelector: (sel: string) => unknown;
}): boolean {
  return !!el.querySelector('[data-testid="atomic-dashboard"]');
}

export function resolveDashboardYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear });
}

/** Shared empty array so the paint-skip sees "no set table" as unchanged. */
const NO_SET_ROWS: SetRow[] = [];

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
            : NO_SET_ROWS,
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
  const header = root.createDiv({ cls: "atomic-dash-header" });
  const title = header.createDiv({ cls: "atomic-dash-title" });
  title.createEl("h2", { text: t("view.dashboard.overview", ctx.language, { year: model.year }) });
  const subtitle: string[] = [];
  if (model.firstDate && model.lastDate) {
    subtitle.push(
      t("view.dashboard.range", ctx.language, {
        from: localDate(model.firstDate, ctx),
        to: localDate(model.lastDate, ctx),
      }),
    );
  }
  subtitle.push(
    t("view.dashboard.sessionsCount", ctx.language, { count: formatCount(model.totalSessions) }),
  );
  title.createSpan({ cls: "atomic-dash-subtitle", text: subtitle.join(" · ") });

  const switcher = header.createDiv({ cls: "atomic-dash-year" });
  const yearButton = (label: string, key: string, testId: string, target: number) => {
    const button = switcher.createEl("button", {
      text: label,
      attr: { "aria-label": t(key, ctx.language), "data-testid": testId },
    });
    button.addEventListener("click", () => onYear(target));
  };
  yearButton("‹", "view.dashboard.prevYear", "atomic-dashboard-year-prev", model.year - 1);
  switcher.createSpan({ text: String(model.year) });
  yearButton("›", "view.dashboard.nextYear", "atomic-dashboard-year-next", model.year + 1);

  const links = header.createDiv({ cls: "atomic-dash-links" });
  for (const card of model.activities) {
    for (const link of activityLinks(card, ctx)) {
      const chip = appendPathLink(links, "", link.path, ctx, "atomic-dash-chip");
      chip.createSpan({ cls: "atomic-dash-dot" }).style.background = link.color;
      chip.appendText(link.text);
    }
  }
}

function appendKpiCard(
  grid: HTMLElement,
  id: string,
  label: string,
): { value: HTMLElement; hint: HTMLElement } {
  const card = grid.createDiv({
    cls: "atomic-dash-card atomic-dash-kpi",
    attr: { "data-testid": "atomic-dashboard-kpi", "data-kpi": id },
  });
  card.createDiv({ cls: "atomic-dash-kpi-label", text: label });
  const value = card.createDiv({ cls: "atomic-dash-kpi-value" });
  const hint = card.createDiv({ cls: "atomic-dash-kpi-hint" });
  return { value, hint };
}

function appendHoursMinutes(
  target: HTMLElement,
  totalMinutes: number,
  ctx: DashboardRenderContext,
): void {
  const { hours, minutes } = splitHoursMinutes(totalMinutes);
  target.appendText(formatCount(hours));
  target.createEl("small", { text: t("view.dashboard.hourUnitShort", ctx.language) });
  target.appendText(` ${minutes}`);
  target.createEl("small", { text: t("view.dashboard.minuteUnitShort", ctx.language) });
}

function appendSparkline(target: HTMLElement, values: number[]): void {
  const spark = target.createSpan({ cls: "atomic-dash-spark" });
  // 18px tall: the default 4% floor would be sub-pixel for small months.
  const heights = barHeights(values, 10);
  appendBars(
    spark,
    values.map((value, index) => ({ value, height: heights[index] })),
    "spark",
  );
}

function splitText(
  cards: DashboardActivityCard[],
  pick: (card: DashboardActivityCard) => number,
): string {
  return cards.map((card) => `${card.activity.label} ${formatCount(pick(card))}`).join(" · ");
}

function renderKpis(root: HTMLElement, model: DashboardModel, ctx: DashboardRenderContext): void {
  const grid = root.createDiv({ cls: "atomic-dash-kpis" });
  const exercise = model.activities.filter(
    (card): card is DashboardExerciseCard => card.domain === "exercise",
  );
  const hobbies = model.activities.filter(
    (card): card is DashboardHobbyCard => card.domain === "hobby",
  );

  if (exercise.length) {
    const sessions = appendKpiCard(grid, "sessions", t("view.dashboard.kpiSessions", ctx.language));
    sessions.value.setText(formatCount(model.totalSessions));
    sessions.hint.createSpan({ text: splitText(exercise, (card) => card.count) });
    appendSparkline(sessions.hint, model.sessionsByMonth);

    const time = appendKpiCard(grid, "exercise-time", t("view.dashboard.kpiExerciseTime", ctx.language));
    appendHoursMinutes(time.value, model.totalExerciseMinutes, ctx);
    time.hint.createSpan({
      text: t("view.dashboard.avgPerSession", ctx.language, {
        minutes: formatCount(model.totalExerciseMinutes),
        avg: averagePerSession(model.totalExerciseMinutes, model.totalSessions),
      }),
    });
  }

  if (model.totalVolumeKg != null) {
    const volume = appendKpiCard(grid, "volume", t("view.dashboard.kpiVolume", ctx.language));
    volume.value.appendText(formatKg(model.totalVolumeKg));
    volume.value.createEl("small", { text: t("view.dashboard.kgUnit", ctx.language) });
    const setTableLabels = exercise
      .filter((card) => card.volumeKg != null)
      .map((card) => card.activity.label)
      .join(" · ");
    volume.hint.createSpan({
      text: `${t("view.dashboard.setTableRows", ctx.language)} · ${setTableLabels}`,
    });
    appendSparkline(volume.hint, model.volumeByMonth);
  }

  if (model.totalHabitMinutes != null) {
    const habit = appendKpiCard(grid, "habit-time", t("view.dashboard.kpiHabitTime", ctx.language));
    appendHoursMinutes(habit.value, model.totalHabitMinutes, ctx);
    habit.hint.createSpan({
      text: `${splitText(hobbies, (card) => card.minutes)} ${t("view.dashboard.unitMinutes", ctx.language)}`,
    });
  }
}

function appendStat(nums: HTMLElement, value: string, unit: string): void {
  const num = nums.createDiv({ cls: "atomic-dash-num" });
  num.createEl("b", { text: value });
  num.createSpan({ text: unit });
}

function appendFeltBar(
  card: HTMLElement,
  felt: NonNullable<DashboardExerciseCard["felt"]>,
  colors: ActivityType["colors"],
  ctx: DashboardRenderContext,
): void {
  const total = FELT_ORDER.reduce((sum, key) => sum + felt[key], 0);
  const wrap = card.createDiv({ cls: "atomic-dash-felt-wrap" });
  const bar = wrap.createDiv({
    cls: "atomic-dash-felt",
    attr: { title: t("view.dashboard.feltTitle", ctx.language) },
  });
  const legend = wrap.createDiv({ cls: "atomic-dash-felt-legend" });
  // Darkest shade for good, lightest for bad: same ramp as the heatmap.
  const shade: Record<Felt, string> = { good: colors[2], ok: colors[1], bad: colors[0] };
  for (const key of FELT_ORDER) {
    if (total > 0) {
      const seg = bar.createSpan({ cls: "atomic-dash-felt-seg" });
      seg.style.width = `${(felt[key] / total) * 100}%`;
      seg.style.background = shade[key];
    }
    const item = legend.createSpan();
    item.createSpan({ cls: "atomic-dash-swatch" }).style.background = shade[key];
    item.appendText(`${t(FELT_LABEL_KEY[key], ctx.language)} `);
    item.createEl("b", { text: String(felt[key]) });
  }
}

function appendActivityFoot(
  card: HTMLElement,
  data: DashboardActivityCard,
  ctx: DashboardRenderContext,
  meta: string | null,
): void {
  const links = activityLinks(data, ctx);
  if (!links.length && !meta) return;
  const foot = card.createDiv({ cls: "atomic-dash-activity-foot" });
  for (const link of links) appendPathLink(foot, link.text, link.path, ctx);
  if (meta) foot.createSpan({ cls: "atomic-dash-meta", text: meta });
}

function renderExerciseCard(
  card: HTMLElement,
  data: DashboardExerciseCard,
  ctx: DashboardRenderContext,
): void {
  const nums = card.createDiv({ cls: "atomic-dash-nums" });
  appendStat(nums, formatCount(data.count), t("view.dashboard.unitSessions", ctx.language));
  appendStat(nums, formatCount(data.minutes), t("view.dashboard.unitMinutes", ctx.language));
  if (data.volumeKg != null) {
    appendStat(nums, formatCompactKg(data.volumeKg), t("view.dashboard.unitVolume", ctx.language));
  }
  appendMonthBars(
    card,
    data.monthly,
    data.activity.colors[2],
    t("view.dashboard.barsSessions", ctx.language),
    ctx,
  );
  if (data.felt) appendFeltBar(card, data.felt, data.activity.colors, ctx);
  appendActivityFoot(
    card,
    data,
    ctx,
    data.lastDate
      ? t("view.dashboard.lastSession", ctx.language, { date: localDate(data.lastDate, ctx) })
      : null,
  );
}

function renderHobbyCard(
  card: HTMLElement,
  data: DashboardHobbyCard,
  ctx: DashboardRenderContext,
): void {
  const nums = card.createDiv({ cls: "atomic-dash-nums" });
  appendStat(nums, formatCount(data.count), t("view.dashboard.unitItems", ctx.language));
  appendStat(nums, formatCount(data.minutes), t("view.dashboard.unitMinutes", ctx.language));
  if (data.inProgress != null) {
    appendStat(nums, formatCount(data.inProgress), t("view.dashboard.readingNow", ctx.language));
  }
  appendMonthBars(
    card,
    data.monthly,
    data.activity.colors[2],
    t("view.dashboard.barsMinutes", ctx.language),
    ctx,
  );
  appendActivityFoot(card, data, ctx, null);
}

function renderActivityCard(
  grid: HTMLElement,
  card: DashboardActivityCard,
  ctx: DashboardRenderContext,
): void {
  const { activity } = card;
  const el = grid.createDiv({
    cls: "atomic-dash-card atomic-dash-activity",
    attr: {
      "data-testid": "atomic-dashboard-activity",
      "data-activity": activity.id,
      "data-count": String(card.count),
    },
  });
  el.style.setProperty("--atomic-dash-accent", activity.colors[2]);

  const head = el.createDiv({ cls: "atomic-dash-activity-head" });
  head.createEl("h4", { text: activity.label });
  const kind = head.createSpan({ cls: "atomic-dash-kind" });

  switch (card.domain) {
    case "exercise":
      kind.setText(t("view.dashboard.domainExercise", ctx.language));
      renderExerciseCard(el, card, ctx);
      break;
    case "hobby":
      kind.setText(t("view.dashboard.domainHabit", ctx.language));
      renderHobbyCard(el, card, ctx);
      break;
    default: {
      const exhaustive: never = card;
      return exhaustive;
    }
  }
}

function renderActivities(root: HTMLElement, model: DashboardModel, ctx: DashboardRenderContext): void {
  if (!model.activities.length) return;
  appendSectionTitle(
    root,
    t("view.dashboard.activities", ctx.language),
    t("view.dashboard.activitiesMeta", ctx.language),
  );
  const grid = root.createDiv({ cls: "atomic-dash-activities" });
  for (const card of model.activities) renderActivityCard(grid, card, ctx);
}

export async function renderDashboard(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  language: Language,
): Promise<void> {
  const generation = (renderGeneration.get(el) ?? 0) + 1;
  renderGeneration.set(el, generation);
  const input = await collectDashboardInput(data, activityTypes, year);
  if (!el.isConnected || renderGeneration.get(el) !== generation) return;

  const paintState = dashboardPaintState(input, language);
  if (
    dashboardDomIsPainted(el) &&
    sameDashboardPaintState(paintStates.get(el), paintState)
  ) {
    return;
  }
  paintStates.set(el, paintState);
  const model = buildDashboardModel(input);

  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-dashboard",
    attr: { "data-testid": "atomic-dashboard", "data-year": String(year) },
  });
  const ctx: DashboardRenderContext = { data, language };
  const onYear = (nextYear: number) => {
    void renderDashboard(el, data, activityTypes, nextYear, language);
  };

  renderHeader(root, model, ctx, onYear);
  renderKpis(root, model, ctx);
  renderActivities(root, model, ctx);
  renderDashboardMonthly(root, model, ctx);
  renderDashboardDetails(root, model, ctx);
  renderDashboardRecent(root, model, ctx);
}
