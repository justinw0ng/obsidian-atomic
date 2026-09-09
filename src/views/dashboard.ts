import type { VaultDataSource } from "../data/vault-source";
import { parseSetTable } from "../core";
import {
  averagePerSession,
  barHeights,
  buildDashboardModel,
  formatCompactKg,
  formatKg,
  splitHoursMinutes,
  type DashboardActivityCard,
  type DashboardInput,
  type DashboardModel,
} from "../core/dashboard";
import { nowYear, resolveBlockYear } from "../dates";
import { BOOK_SHELF_HOST_REL } from "../hobbies/book-shelf-host";
import { READING_BOOKSHELF_REL } from "../hobbies/reading-bookshelf";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import {
  cuePathForActivity,
  exerciseActivities,
  hobbyActivities,
} from "../util/activity-types";
import {
  appendMonthBars,
  appendPathLink,
  appendSectionTitle,
  formatCount,
  localDate,
  type DashboardRenderContext,
} from "./dashboard-dom";
import {
  renderDashboardDetails,
  renderDashboardMonthly,
  renderDashboardRecent,
} from "./dashboard-sections";

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
            ? parseSetTable(await data.readBody(meta.path))
            : [],
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
  const subtitleParts: string[] = [];
  if (model.firstDate && model.lastDate) {
    subtitleParts.push(
      t("view.dashboard.range", ctx.language, {
        from: localDate(model.firstDate, ctx.language),
        to: localDate(model.lastDate, ctx.language),
      }),
    );
  }
  subtitleParts.push(
    t("view.dashboard.sessionsCount", ctx.language, { count: formatCount(model.totalSessions) }),
  );
  title.createSpan({ cls: "atomic-dash-subtitle", text: subtitleParts.join(" · ") });

  const switcher = header.createDiv({
    cls: "atomic-dash-year",
    attr: { "data-testid": "atomic-dashboard-year" },
  });
  const prev = switcher.createEl("button", {
    text: "‹",
    attr: {
      "aria-label": t("view.dashboard.prevYear", ctx.language),
      "data-testid": "atomic-dashboard-year-prev",
    },
  });
  prev.addEventListener("click", () => onYear(model.year - 1));
  switcher.createSpan({ text: String(model.year) });
  const next = switcher.createEl("button", {
    text: "›",
    attr: {
      "aria-label": t("view.dashboard.nextYear", ctx.language),
      "data-testid": "atomic-dashboard-year-next",
    },
  });
  next.addEventListener("click", () => onYear(model.year + 1));

  const links = header.createDiv({ cls: "atomic-dash-links" });
  const appendChip = (label: string, path: string, color: string) => {
    const chip = appendPathLink(links, "", path, ctx, "atomic-dash-chip");
    const dot = chip.createSpan({ cls: "atomic-dash-dot" });
    dot.style.background = color;
    chip.appendText(label);
  };
  for (const card of model.activities) {
    if (card.domain === "exercise" && card.activity.supportsCues) {
      appendChip(
        t("view.dashboard.cues", ctx.language, { activity: card.activity.label }),
        cuePathForActivity(card.activity),
        card.activity.colors[2],
      );
    }
  }
  const reading = model.activities.find((card) => card.activity.id === "reading");
  if (reading) {
    const color = reading.activity.colors[2];
    appendChip(t("view.dashboard.readingBookshelf", ctx.language), READING_BOOKSHELF_REL, color);
    appendChip(t("view.dashboard.bookShelf", ctx.language), BOOK_SHELF_HOST_REL, color);
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

function appendHoursMinutes(target: HTMLElement, totalMinutes: number, language: Language): void {
  const { hours, minutes } = splitHoursMinutes(totalMinutes);
  target.appendText(formatCount(hours));
  target.createEl("small", { text: t("view.dashboard.hourUnit", language) });
  target.appendText(` ${minutes}`);
  target.createEl("small", { text: t("view.dashboard.minuteUnit", language) });
}

function appendSparkline(target: HTMLElement, values: number[]): void {
  const spark = target.createSpan({ cls: "atomic-dash-spark" });
  const heights = barHeights(values);
  values.forEach((value, index) => {
    const bar = spark.createSpan({ cls: value > 0 ? "atomic-dash-spark-bar" : "atomic-dash-spark-bar is-zero" });
    bar.style.height = `${Math.max(10, heights[index])}%`;
  });
}

function renderKpis(root: HTMLElement, model: DashboardModel, ctx: DashboardRenderContext): void {
  const grid = root.createDiv({ cls: "atomic-dash-kpis" });
  const exercise = model.activities.filter((card) => card.domain === "exercise");
  const hobbies = model.activities.filter((card) => card.domain === "hobby");
  const splitText = (cards: DashboardActivityCard[], pick: (card: DashboardActivityCard) => number) =>
    cards.map((card) => `${card.activity.label} ${formatCount(pick(card))}`).join(" · ");

  if (exercise.length) {
    const sessions = appendKpiCard(grid, "sessions", t("view.dashboard.kpiSessions", ctx.language));
    sessions.value.setText(formatCount(model.totalSessions));
    sessions.hint.createSpan({ text: splitText(exercise, (card) => card.count) });
    appendSparkline(sessions.hint, model.sessionsByMonth);

    const time = appendKpiCard(grid, "exercise-time", t("view.dashboard.kpiExerciseTime", ctx.language));
    appendHoursMinutes(time.value, model.totalExerciseMinutes, ctx.language);
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
    volume.value.createEl("small", { text: "kg" });
    const setTableLabels = exercise
      .filter((card) => card.activity.supportsSetTable)
      .map((card) => card.activity.label)
      .join(" · ");
    volume.hint.createSpan({
      text: `${t("view.dashboard.setTableRows", ctx.language)} · ${setTableLabels}`,
    });
    appendSparkline(volume.hint, model.volumeByMonth);
  }

  if (model.totalHabitMinutes != null) {
    const habit = appendKpiCard(grid, "habit-time", t("view.dashboard.kpiHabitTime", ctx.language));
    appendHoursMinutes(habit.value, model.totalHabitMinutes, ctx.language);
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

function appendFeltBar(card: HTMLElement, felt: NonNullable<DashboardActivityCard["felt"]>, colors: ActivityType["colors"], language: Language): void {
  const total = felt.good + felt.ok + felt.bad;
  const wrap = card.createDiv({ cls: "atomic-dash-felt-wrap" });
  const bar = wrap.createDiv({
    cls: "atomic-dash-felt",
    attr: { title: t("view.dashboard.feltTitle", language) },
  });
  const legend = wrap.createDiv({ cls: "atomic-dash-felt-legend" });
  const segments: Array<[keyof typeof felt, string, string]> = [
    ["good", colors[2], t("view.dashboard.feltGood", language)],
    ["ok", colors[1], t("view.dashboard.feltOk", language)],
    ["bad", colors[0], t("view.dashboard.feltBad", language)],
  ];
  for (const [key, color, label] of segments) {
    if (total > 0) {
      const seg = bar.createSpan({ cls: "atomic-dash-felt-seg" });
      seg.style.width = `${(felt[key] / total) * 100}%`;
      seg.style.background = color;
    }
    const item = legend.createSpan();
    const swatch = item.createSpan({ cls: "atomic-dash-swatch" });
    swatch.style.background = color;
    item.appendText(`${label} `);
    item.createEl("b", { text: String(felt[key]) });
  }
}

function renderActivityCard(grid: HTMLElement, card: DashboardActivityCard, ctx: DashboardRenderContext): void {
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
  head.createSpan({
    cls: "atomic-dash-kind",
    text: t(
      card.domain === "exercise" ? "view.dashboard.domainExercise" : "view.dashboard.domainHabit",
      ctx.language,
    ),
  });

  const nums = el.createDiv({ cls: "atomic-dash-nums" });
  appendStat(
    nums,
    formatCount(card.count),
    t(card.domain === "exercise" ? "view.dashboard.unitSessions" : "view.dashboard.unitItems", ctx.language),
  );
  appendStat(nums, formatCount(card.minutes), t("view.dashboard.unitMinutes", ctx.language));
  if (card.volumeKg != null) {
    appendStat(nums, formatCompactKg(card.volumeKg), t("view.dashboard.unitVolume", ctx.language));
  }
  if (card.inProgress != null && activity.id === "reading") {
    appendStat(nums, formatCount(card.inProgress), t("view.dashboard.readingNow", ctx.language));
  }

  appendMonthBars(
    el,
    card.monthly,
    activity.colors[2],
    t(card.domain === "exercise" ? "view.dashboard.barsSessions" : "view.dashboard.barsMinutes", ctx.language),
    ctx.language,
  );

  if (card.felt) appendFeltBar(el, card.felt, activity.colors, ctx.language);

  const foot = el.createDiv({ cls: "atomic-dash-activity-foot" });
  if (card.domain === "exercise" && activity.supportsCues) {
    appendPathLink(
      foot,
      t("view.dashboard.openCues", ctx.language, { activity: activity.label }),
      cuePathForActivity(activity),
      ctx,
    );
  }
  if (card.lastDate) {
    foot.createSpan({
      cls: "atomic-dash-meta",
      text: t("view.dashboard.lastSession", ctx.language, { date: localDate(card.lastDate, ctx.language) }),
    });
  }
  if (activity.id === "reading") {
    appendPathLink(foot, `${t("view.dashboard.readingBookshelf", ctx.language)} →`, READING_BOOKSHELF_REL, ctx);
    appendPathLink(foot, `${t("view.dashboard.bookShelf", ctx.language)} →`, BOOK_SHELF_HOST_REL, ctx);
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
  const model = buildDashboardModel(await collectDashboardInput(data, activityTypes, year));
  if (!el.isConnected) return;

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
