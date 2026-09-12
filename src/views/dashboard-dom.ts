import type { VaultDataSource } from "../data/vault-source";
import { barHeights, formatHours, type DashboardActivityCard, type Felt } from "../core/dashboard";
import {
  fullDateForLanguage,
  monthShortEn,
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

function compactMonthLabel(index: number, ctx: DashboardRenderContext): string {
  return ctx.language === "en"
    ? monthShortEn(2000, index + 1, 1).slice(0, 1)
    : String(index + 1);
}

export function localDate(ymd: string, ctx: DashboardRenderContext): string {
  const parsed = parseYmd(ymd);
  return parsed ? fullDateForLanguage(parsed.y, parsed.m, parsed.d, ctx.language) : ymd;
}

/** Quick links an activity exposes: cues for exercise, Bases and book shelf for Reading. */
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
  const link = parent.createEl("a", {
    cls,
    text,
    attr: { href: "#", "data-testid": "atomic-dashboard-link", "data-path": path },
  });
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

export function monthBars(
  values: number[],
  color: string,
  ctx: DashboardRenderContext,
): DashboardBar[] {
  const heights = barHeights(values);
  return values.map((value, index) => ({
    value,
    height: heights[index],
    color,
    title: `${monthLabel(index, ctx)}: ${formatHours(value)}`,
  }));
}

/** Twelve-month chart; `values` are minutes, bar height and hover text use hours. */
export function appendMonthBars(
  parent: HTMLElement,
  values: number[],
  color: string,
  title: string,
  ctx: DashboardRenderContext,
): void {
  const bars = parent.createDiv({
    cls: "atomic-dash-bars",
    attr: { title, "data-testid": "atomic-dashboard-activity-bars" },
  });
  const specs = monthBars(values, color, ctx);
  specs.forEach((bar, index) => {
    const active = bar.value > 0;
    const el = bars.createSpan({
      cls: `atomic-dash-bar is-month${active ? "" : " is-zero"}`,
      attr: {
        "data-testid": "atomic-dashboard-month-bar",
        "data-month": String(index + 1),
        "data-minutes": String(bar.value),
        ...(bar.title ? { title: bar.title } : {}),
      },
    });
    el.style.height = active ? `${bar.height}%` : "0";
    if (active && bar.color) el.style.background = bar.color;
  });
  const labels = parent.createDiv({ cls: "atomic-dash-months" });
  for (let i = 0; i < 12; i++) {
    labels.createSpan({ text: compactMonthLabel(i, ctx) });
  }
}
