import { MarkdownRenderer } from "obsidian";
import type { CueCard } from "../core/cues";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type FitnessPlugin from "../main";

export type CueCardPaint = {
  text: string;
  focus?: string;
  count?: number;
  lastSeen?: string;
};

export function bindCueCardFan(buttons: readonly HTMLButtonElement[]): void {
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const wasOpen = button.hasClass("is-open");
      for (const other of buttons) other.removeClass("is-open");
      if (!wasOpen) button.addClass("is-open");
    });
  }
}

/** Same index card on the cue page and on the session-note form. */
export async function appendCueCard(
  fan: HTMLElement,
  card: CueCardPaint | CueCard,
  plugin: FitnessPlugin,
  sourcePath: string,
  language: Language,
): Promise<HTMLButtonElement> {
  const button = fan.createEl("button", {
    cls: "atomic-cue-card",
    attr: { type: "button", "data-testid": "atomic-cue-card" },
  });

  const sheet = button.createDiv({ cls: "atomic-cue-sheet" });
  const body = sheet.createDiv({ cls: "atomic-cue-body" });
  const text = body.createDiv({ cls: "atomic-cue-text" });
  await MarkdownRenderer.render(plugin.app, card.text, text, sourcePath, plugin);

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

  return button;
}
