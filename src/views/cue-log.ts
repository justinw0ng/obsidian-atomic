import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
import { appendCueBullet, parseReminders, sanitizeCueText } from "../core/cues";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import { isStaleBlockRender } from "../util/block-render";

/** Fill-in form for session cues. Cues still land as `## Reminders` bullets. */
export async function renderAtomicCueLog(
  plugin: FitnessPlugin,
  el: HTMLElement,
  sourcePath: string,
  generation?: number,
): Promise<void> {
  const markdown = sourcePath ? await plugin.data.readCachedBody(sourcePath) : "";
  if (
    !el.isConnected ||
    (generation !== undefined && isStaleBlockRender(el, generation))
  ) {
    return;
  }

  const language = plugin.settings.language;
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cue-log",
    attr: { "data-testid": "atomic-cue-log" },
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.cueLog.needsSavedNote", language),
    });
    return;
  }

  const row = root.createDiv({ cls: "atomic-cue-log-row" });
  // A wrapping label names the input without an aria-label, which Obsidian
  // would turn into a tooltip that lingers over the note.
  const field = row.createEl("label", { cls: "atomic-cue-log-field" });
  field.createSpan({ text: t("view.cueLog.cue", language) });
  const input = field.createEl("input", {
    attr: {
      type: "text",
      "data-testid": "atomic-cue-log-text",
      placeholder: t("view.cueLog.placeholder", language),
    },
  });
  const addButton = row.createEl("button", {
    cls: "mod-cta",
    text: t("view.cueLog.add", language),
    attr: { "data-testid": "atomic-cue-log-add" },
  });

  const existing = parseReminders(markdown);
  if (existing.length) {
    const chips = root.createDiv({
      cls: "atomic-cue-log-existing",
      attr: { "data-testid": "atomic-cue-log-existing" },
    });
    for (const cue of existing) {
      chips.createSpan({ cls: "atomic-cue-log-chip", text: cue });
    }
  }

  const addCue = async (): Promise<void> => {
    if (addButton.disabled) return;
    const cue = sanitizeCueText(input.value);
    if (!cue) {
      new Notice(t("notice.cueMissingText", language));
      return;
    }
    const file = plugin.data.getFileByPath(sourcePath);
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
      new Notice(t("notice.cueAdded", language, { cue }));
    } finally {
      addButton.disabled = false;
    }
    void renderAtomicCueLog(plugin, el, sourcePath);
  };

  addButton.addEventListener("click", () => {
    void addCue();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void addCue();
  });
}
