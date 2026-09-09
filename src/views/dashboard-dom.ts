import type { VaultDataSource } from "../data/vault-source";
import { barHeights } from "../core/dashboard";
import {
  fullDateForLanguage,
  monthShortEn,
  monthShortForLanguage,
  parseYmd,
} from "../dates";
import type { Language } from "../i18n/types";

export type DashboardRenderContext = {
  data: VaultDataSource;
  language: Language;
};

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function compactMonthLabel(index: number, language: Language): string {
  return language === "en"
    ? monthShortEn(2000, index + 1, 1).slice(0, 1)
    : String(index + 1);
}

export function localDate(ymd: string | null, language: Language): string {
  const parsed = ymd ? parseYmd(ymd) : null;
  return parsed
    ? fullDateForLanguage(parsed.y, parsed.m, parsed.d, language)
    : String(ymd ?? "");
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

export function appendMonthBars(
  parent: HTMLElement,
  values: number[],
  color: string,
  title: string,
  language: Language,
): void {
  const bars = parent.createDiv({ cls: "atomic-dash-bars", attr: { title } });
  const heights = barHeights(values);
  values.forEach((value, index) => {
    const bar = bars.createSpan({
      cls: value > 0 ? "atomic-dash-bar" : "atomic-dash-bar is-zero",
      attr: {
        title: `${monthShortForLanguage(2000, index + 1, 1, language)}: ${formatCount(value)}`,
      },
    });
    bar.style.height = `${heights[index]}%`;
    if (value > 0) bar.style.background = color;
  });
  const labels = parent.createDiv({ cls: "atomic-dash-months" });
  for (let i = 0; i < 12; i++) {
    labels.createSpan({ text: compactMonthLabel(i, language) });
  }
}
