import type { VaultDataSource } from "../data/vault-source";
import { barHeights, formatHours, type DashboardActivityCard, type Felt } from "../core/dashboard";
import {
  fullDateForLanguage,
  monthShortEn,
  monthShortForLanguage,
  parseYmd,
} from "../dates";
import { calendarMonth, isFutureMonth } from "../util/month-chart";
import { openCuesHostFile } from "../exercise/cues-host";
import { BOOK_SHELF_HOST_REL } from "../hobbies/book-shelf-host";
import { READING_BOOKSHELF_REL } from "../hobbies/reading-bookshelf";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import type { Language } from "../i18n/types";
import { cuePathForActivity } from "../util/activity-types";
import { appendCatalogLabel } from "./catalog-label";

export type DashboardRenderContext = {
  data: VaultDataSource;
  language: Language;
  timezone: string;
  year: number;
};

export type DashboardBar = {
  value: number;
  /** Percent of the container height; 0 renders the "empty" stub. */
  height: number;
  /** Omit to keep the stylesheet default (KPI sparklines). */
  color?: string;
  title?: string;
  /** Extra data-* hooks; merged with `title` when present. */
  attrs?: Record<string, string>;
  /** Later months in the viewed year draw a tick instead of a bar. */
  future?: boolean;
};

/** Quick-link chip/foot item. `open` is required so cues can ensure-then-open without teaching `appendPathLink`. */
export type DashboardActivityLink = {
  text: string;
  path: string;
  color: string;
  open: () => Promise<void>;
};

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

/** Ledger range caption: "Jan 2", not a long weekday sentence. */
export function shortDate(ymd: string, ctx: DashboardRenderContext): string {
  const parsed = parseYmd(ymd);
  if (!parsed) return ymd;
  if (ctx.language === "en") {
    return `${monthShortEn(parsed.y, parsed.m, parsed.d)} ${parsed.d}`;
  }
  return `${parsed.m}月${parsed.d}日`;
}

/** Quick links an activity exposes: cues for exercise, Bases and book shelf for Reading. */
export function activityLinks(
  card: DashboardActivityCard,
  ctx: DashboardRenderContext,
): DashboardActivityLink[] {
  const { activity } = card;
  const color = activity.colors[2];
  const links: DashboardActivityLink[] = [];
  if (card.domain === "exercise" && activity.supportsCues) {
    const path = cuePathForActivity(activity);
    links.push({
      text: t("view.dashboard.cues", ctx.language, { activity: activity.label }),
      path,
      color,
      open: () => openCuesHostFile(ctx.data, activity, ctx.language),
    });
  }
  if (card.domain === "hobby" && activity.id === "reading") {
    links.push(
      {
        text: t("view.dashboard.readingBookshelf", ctx.language),
        path: READING_BOOKSHELF_REL,
        color,
        open: () => ctx.data.openPath(READING_BOOKSHELF_REL),
      },
      {
        text: t("view.dashboard.bookShelf", ctx.language),
        path: BOOK_SHELF_HOST_REL,
        color,
        open: () => ctx.data.openPath(BOOK_SHELF_HOST_REL),
      },
    );
  }
  return links;
}

export function appendActivityLink(
  parent: HTMLElement,
  link: DashboardActivityLink,
  cls = "atomic-dash-link",
  text = link.text,
): HTMLAnchorElement {
  const el = parent.createEl("a", {
    cls,
    text,
    attr: { href: "#", "data-testid": "atomic-dashboard-link", "data-path": link.path },
  });
  el.addEventListener("click", (event) => {
    event.preventDefault();
    void link.open();
  });
  return el;
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
): HTMLElement {
  const section = parent.createDiv({ cls: "atomic-section" });
  const head = section.createDiv({ cls: "atomic-section-head" });
  const titleWrap = head.createDiv();
  const caption = titleWrap.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, title);
  const readout = head.createDiv({ cls: "atomic-readout" });
  appendCatalogLabel(readout, meta);
  return section;
}

/**
 * Draw one row of bars; `variant` picks the size family in styles.css.
 * A zero value renders the `.is-zero` stub. A future month renders `.is-future`.
 */
export function appendBars(
  parent: HTMLElement,
  bars: DashboardBar[],
  variant: "spark" | "month" | "column",
): void {
  for (const bar of bars) {
    const future = variant === "month" && bar.future === true;
    const active = bar.value > 0 && !future;
    const stub = future ? " is-future" : active ? "" : " is-zero";
    const attr: Record<string, string> = { ...bar.attrs };
    if (bar.title) attr.title = bar.title;
    const el = parent.createSpan({
      cls: `atomic-dash-bar is-${variant}${stub}${variant === "month" ? " atomic-bar" : ""}`,
      attr: Object.keys(attr).length ? attr : undefined,
    });
    if (variant === "month") {
      if (!future) el.style.setProperty("--v", active ? (bar.height / 100).toFixed(3) : "0");
    } else {
      el.style.height = active ? `${bar.height}%` : "0";
      if (active && bar.color) el.style.background = bar.color;
    }
  }
}

/** `values` are minutes; height and hover text use hours. */
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
    future: isFutureMonth(ctx.year, index, ctx.timezone),
    attrs: {
      "data-testid": "atomic-dashboard-month-bar",
      "data-month": String(index + 1),
      "data-minutes": String(value),
    },
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
    cls: "atomic-dash-bars atomic-months",
    attr: { title, "data-testid": "atomic-dashboard-activity-bars" },
  });
  bars.style.setProperty("--atomic-c", color);
  appendBars(bars, monthBars(values, color, ctx), "month");
  appendMonthInitials(parent, ctx);
}

/** J F M … under the ledger, with the current month marked. */
export function appendMonthInitials(parent: HTMLElement, ctx: DashboardRenderContext): void {
  const today = calendarMonth(ctx.timezone);
  const labels = parent.createDiv({ cls: "atomic-month-initials atomic-caption" });
  for (let i = 0; i < 12; i++) {
    const text = compactMonthLabel(i, ctx);
    if (ctx.year === today.year && i === today.month) {
      labels.createSpan({ cls: "is-now", text });
    } else {
      labels.createSpan({ text });
    }
  }
}
