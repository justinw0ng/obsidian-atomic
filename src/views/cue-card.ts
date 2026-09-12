import { MarkdownRenderer, type App, type Component } from "obsidian";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";

export type CueMarkdownHost = {
  app: App;
  component: Component;
  sourcePath: string;
};

export type CueCardPaint = {
  text: string;
  focus?: string;
  count?: number;
  lastSeen?: string;
};

export function bindCueCardFan(cards: readonly HTMLElement[]): void {
  const toggle = (card: HTMLElement): void => {
    const wasOpen = card.hasClass("is-open");
    for (const other of cards) other.removeClass("is-open");
    if (!wasOpen) card.addClass("is-open");
  };
  for (const card of cards) {
    card.addEventListener("click", () => {
      toggle(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle(card);
    });
  }
}

/** Same index card on the cue page and on the session-note form. */
export async function appendCueCard(
  fan: HTMLElement,
  card: CueCardPaint,
  host: CueMarkdownHost,
  language: Language,
): Promise<HTMLElement> {
  const el = fan.createDiv({
    cls: "atomic-cue-card",
    attr: { tabindex: "0", role: "button", "data-testid": "atomic-cue-card" },
  });

  const sheet = el.createDiv({ cls: "atomic-cue-sheet" });
  const body = sheet.createDiv({ cls: "atomic-cue-body" });
  const text = body.createDiv({ cls: "atomic-cue-text" });
  await MarkdownRenderer.render(
    host.app,
    card.text,
    text,
    host.sourcePath,
    host.component,
  );

  const count = card.count ?? 0;
  if (card.lastSeen || count > 1) {
    const meta = sheet.createDiv({ cls: "atomic-cue-meta" });
    if (card.lastSeen) {
      meta.createSpan({
        cls: "atomic-cue-date",
        text: card.focus ? `${card.lastSeen} · ${card.focus}` : card.lastSeen,
      });
    }
    if (count > 1) {
      meta.createSpan({
        cls: "atomic-cue-repeats",
        text: t("view.cues.repeats", language, { count }),
      });
    }
  }

  return el;
}
