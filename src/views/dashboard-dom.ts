import type { VaultDataSource } from "../data/vault-source";
import { barHeights, type DashboardActivityCard, type Felt } from "../core/dashboard";
import {
  formatMonthLabel,
  fullDateForLanguage,
  monthShortForLanguage,
  parseYmd,
} from "../dates";
import { BOOK_SHELF_HOST_REL } from "../hobbies/book-shelf-host";
import { READING_BOOKSHELF_REL } from "../hobbies/reading-bookshelf";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import type { Language } from "../i18n/types";
import { cuePathForActivity } from "../util/activity-types";

export type DashboardRenderContext = {
  data: VaultDataSource;
  language: Language;
  year: number;
};

export type DashboardBar = {
  value: number;
  /** Percent of the container height; 0 renders the "empty" stub. */
  height: number;
  /** Omit to keep the stylesheet default (KPI sparklines). */
  color?: string;
  title?: string;
};

export type DashboardLink = { text: string; path: string; color: string };

export const FELT_LABEL_KEY: Record<Felt, string> = {
  good: "view.dashboard.feltGood",
  ok: "view.dashboard.feltOk",
  bad: "view.dashboard.feltBad",
};

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function monthLabel(index: number, ctx: DashboardRenderContext, year = 2000): string {
  return monthShortForLanguage(year, index + 1, 1, ctx.language);
}

export function localDate(ymd: string, ctx: DashboardRenderContext): string {
  const parsed = parseYmd(ymd);
  return parsed ? fullDateForLanguage(parsed.y, parsed.m, parsed.d, ctx.language) : ymd;
}

/** Quick links an activity exposes: cues for exercise, bookshelves for Reading. */
export function activityLinks(
  card: DashboardActivityCard,
  ctx: DashboardRenderContext,
): DashboardLink[] {
  const { activity } = card;
  const color = activity.colors[2];
  const links: DashboardLink[] = [];
  if (card.domain === "exercise" && activity.supportsCues) {
    links.push({
      text: t("view.dashboard.cues", ctx.language, { activity: activity.label }),
      path: cuePathForActivity(activity),
      color,
    });
  }
  if (card.domain === "hobby" && activity.id === "reading") {
    links.push(
      { text: t("view.dashboard.readingBookshelf", ctx.language), path: READING_BOOKSHELF_REL, color },
      { text: t("view.dashboard.bookShelf", ctx.language), path: BOOK_SHELF_HOST_REL, color },
    );
  }
  return links;
}

export function appendPathLink(
  parent: HTMLElement,
  text: string,
  path: string,
  ctx: DashboardRenderContext,
  cls = "atomic-dash-link",
): HTMLAnchorElement {
  const link = parent.createEl("a", { cls, text, attr: { href: "#" } });
  link.addEventListener("click", (event) => {
    event.preventDefault();
    void ctx.data.openPath(path);
  });
  return link;
}

export function appendSectionTitle(
  parent: HTMLElement,
  title: string,
  meta: string,
): void {
  const row = parent.createDiv({ cls: "atomic-dash-section-title" });
  row.createEl("h3", { text: title });
  row.createSpan({ cls: "atomic-dash-meta", text: meta });
}

/**
 * Draw one row of bars; `variant` picks the size family in styles.css.
 * A zero value always renders flat (the `.is-zero` stub), whatever `height` says.
 */
export function appendBars(
  parent: HTMLElement,
  bars: DashboardBar[],
  variant: "spark" | "month" | "column",
): void {
  for (const bar of bars) {
    const active = bar.value > 0;
    const el = parent.createSpan({
      cls: `atomic-dash-bar is-${variant}${active ? "" : " is-zero"}`,
      attr: bar.title ? { title: bar.title } : undefined,
    });
    el.style.height = active ? `${bar.height}%` : "0";
    if (active && bar.color) el.style.background = bar.color;
  }
}

function dayAxisLabel(day: number, lastDay: number, value: number): string {
  if (value > 0 || day === 1 || day === lastDay || day % 5 === 0) return String(day);
  return "";
}

/** One bar per calendar day in `month` (1-based), labeled so active days stay visible. */
export function appendDayBars(
  parent: HTMLElement,
  values: number[],
  color: string,
  title: string,
  ctx: DashboardRenderContext,
  month: number,
): void {
  const wrap = parent.createDiv({
    cls: "atomic-dash-day-chart",
    attr: {
      "data-testid": "atomic-dashboard-activity-bars",
      "data-focus-month": `${ctx.year}-${String(month).padStart(2, "0")}`,
      "data-days": String(values.length),
      title,
    },
  });
  wrap.style.setProperty("--atomic-dash-days", String(values.length));
  wrap.createDiv({
    cls: "atomic-dash-day-caption",
    text: formatMonthLabel(ctx.year, month, ctx.language),
  });
  const heights = barHeights(values);
  const bars = wrap.createDiv({ cls: "atomic-dash-bars is-daily" });
  for (let i = 0; i < values.length; i++) {
    const day = i + 1;
    const value = values[i];
    const active = value > 0;
    const el = bars.createSpan({
      cls: `atomic-dash-bar is-month${active ? "" : " is-zero"}`,
      attr: {
        "data-testid": "atomic-dashboard-day",
        "data-day": String(day),
        "data-value": String(value),
        title: `${day}: ${formatCount(value)}`,
      },
    });
    el.style.height = active ? `${heights[i]}%` : "0";
    if (active) el.style.background = color;
  }
  const labels = wrap.createDiv({ cls: "atomic-dash-months atomic-dash-days" });
  for (let i = 0; i < values.length; i++) {
    labels.createSpan({ text: dayAxisLabel(i + 1, values.length, values[i]) });
  }
}
