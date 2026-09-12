import { MarkdownRenderer, type App, type Component } from "obsidian";
import { cueTextNeedsMarkdown } from "../core/cues";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import {
  cueCardEventShouldToggle,
  isCueCardToggleKey,
} from "../util/cue-card-fan";
import { closeCueLightbox, toggleCueLightbox } from "./cue-lightbox";

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

/** Close a body-level cue overlay before the fan host is emptied. */
export function resetCueFan(): void {
  closeCueLightbox();
}

export function bindCueCardFan(cards: readonly HTMLElement[]): void {
  resetCueFan();
  for (const card of cards) {
    card.addEventListener("click", (event) => {
      if (!cueCardEventShouldToggle(event.target, card)) return;
      toggleCueLightbox(card);
    });
    card.addEventListener("keydown", (event) => {
      if (!isCueCardToggleKey(event.key)) return;
      if (!cueCardEventShouldToggle(event.target, card)) return;
      event.preventDefault();
      toggleCueLightbox(card);
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
    attr: {
      tabindex: "0",
      role: "button",
      "aria-expanded": "false",
      "data-testid": "atomic-cue-card",
    },
  });

  const sheet = el.createDiv({ cls: "atomic-cue-sheet" });
  const body = sheet.createDiv({ cls: "atomic-cue-body" });
  const text = body.createDiv({ cls: "atomic-cue-text" });
  if (cueTextNeedsMarkdown(card.text)) {
    await MarkdownRenderer.render(
      host.app,
      card.text,
      text,
      host.sourcePath,
      host.component,
    );
  } else {
    for (const paragraph of card.text.split("\n")) {
      if (paragraph) text.createEl("p", { text: paragraph });
    }
  }

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
