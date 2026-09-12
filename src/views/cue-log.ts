import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
import { appendCueBullet, parseReminders, sanitizeCueText } from "../core/cues";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import { isStaleBlockRender } from "../util/block-render";
import { PaintMemo, sameList } from "../util/paint-memo";
import {
  appendCueCard,
  bindCueCardFan,
  closeCueLightbox,
  type CueMarkdownHost,
} from "./cue-card";

export type CueLogHost = Omit<CueMarkdownHost, "component"> & {
  beginPaint: () => CueMarkdownHost["component"];
};

type CueLogPaintState = {
  sourcePath: string;
  language: string;
  cues: readonly string[];
};

const cueLogPaint = new PaintMemo<CueLogPaintState>(
  '[data-testid="atomic-cue-log"]',
  (previous, next) =>
    !!previous &&
    previous.sourcePath === next.sourcePath &&
    previous.language === next.language &&
    sameList(previous.cues, next.cues),
);

/** Fill-in form for session cues. Cues still land as `## Reminders` bullets. */
export async function renderAtomicCueLog(
  plugin: FitnessPlugin,
  el: HTMLElement,
  host: CueLogHost,
  generation?: number,
): Promise<void> {
  const markdown = host.sourcePath ? await plugin.data.readCachedBody(host.sourcePath) : "";
  if (
    !el.isConnected ||
    (generation !== undefined && isStaleBlockRender(el, generation))
  ) {
    return;
  }

  const language = plugin.settings.language;
  const existing = host.sourcePath ? parseReminders(markdown) : [];
  const paintState: CueLogPaintState = {
    sourcePath: host.sourcePath,
    language,
    cues: existing,
  };
  if (cueLogPaint.shouldSkip(el, paintState)) return;
  closeCueLightbox(true);

  const component = host.beginPaint();
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cues atomic-cue-log",
    attr: { "data-testid": "atomic-cue-log" },
  });
  if (!host.sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.cueLog.needsSavedNote", language),
    });
    return;
  }

  const row = root.createDiv({ cls: "atomic-cue-log-row" });
  const field = row.createEl("label", { cls: "atomic-cue-log-field" });
  field.createSpan({ text: t("view.cueLog.cue", language) });
  const input = field.createEl("textarea", {
    cls: "atomic-cue-log-text",
    attr: {
      rows: "4",
      "data-testid": "atomic-cue-log-text",
      placeholder: t("view.cueLog.placeholder", language),
    },
  });
  const addButton = row.createEl("button", {
    cls: "mod-cta",
    text: t("view.cueLog.add", language),
    attr: { "data-testid": "atomic-cue-log-add" },
  });

  if (existing.length) {
    const fan = root.createDiv({
      cls: "atomic-cue-fan atomic-cue-log-existing",
      attr: { "data-testid": "atomic-cue-log-existing" },
    });
    const painted = await Promise.all(
      existing.map((text) =>
        appendCueCard(
          fan,
          { text },
          { app: host.app, component, sourcePath: host.sourcePath },
          language,
        ),
      ),
    );
    bindCueCardFan(painted);
  }

  const addCue = async (): Promise<void> => {
    if (addButton.disabled) return;
    const cue = sanitizeCueText(input.value);
    if (!cue) {
      new Notice(t("notice.cueMissingText", language));
      return;
    }
    const file = plugin.data.getFileByPath(host.sourcePath);
    if (!file) {
      new Notice(t("notice.cueNeedsSavedNote", language));
      return;
    }
    addButton.disabled = true;
    try {
      await plugin.app.vault.process(file, (latest) =>
        appendCueBullet(latest, cue, t("template.reminders", language)),
      );
      input.value = "";
      const preview = cue.split("\n")[0] ?? cue;
      new Notice(t("notice.cueAdded", language, { cue: preview }));
    } finally {
      addButton.disabled = false;
    }
    void renderAtomicCueLog(plugin, el, host, generation);
  };

  addButton.addEventListener("click", () => {
    void addCue();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    void addCue();
  });
}
