import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";
import {
  displayedTimerMinutes,
  readTimerFrontmatter,
  stopSessionTimer,
  stopTimer,
  updateTimerFrontmatter,
} from "../core/hobby";
import { isStaleBlockRender } from "../util/block-render";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { promptText } from "../util/prompt-text.ts";

async function modifyCurrentNote(
  plugin: FitnessPlugin,
  sourcePath: string,
  updater: (markdown: string) => string,
): Promise<boolean> {
  const file = plugin.data.getFileByPath(sourcePath);
  if (!file) {
    new Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
    return false;
  }
  await plugin.app.vault.process(file, updater);
  return true;
}

function paintTimer(
  plugin: FitnessPlugin,
  el: HTMLElement,
  sourcePath: string,
): void {
  void renderAtomicTimer(plugin, el, sourcePath);
}

export async function renderAtomicTimer(
  plugin: FitnessPlugin,
  el: HTMLElement,
  sourcePath: string,
  generation?: number,
): Promise<void> {
  const markdown = sourcePath ? await plugin.data.readBody(sourcePath) : "";
  if (
    !el.isConnected ||
    (generation !== undefined && isStaleBlockRender(el, generation))
  ) {
    return;
  }

  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-timer",
    attr: { "data-testid": "atomic-timer" },
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.timer.needsSavedNote", plugin.settings.language),
    });
    return;
  }

  const frontmatter = readTimerFrontmatter(markdown);
  const totalKey =
    frontmatter.persistMode === "session"
      ? "view.timer.duration"
      : "view.timer.total";
  root.createEl("p", {
    text: t(totalKey, plugin.settings.language, {
      minutes: displayedTimerMinutes(frontmatter),
    }),
    cls: "atomic-timer-total",
  });

  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.createEl("p", {
      cls: "atomic-timer-running",
      text: t("view.timer.runningSince", plugin.settings.language, {
        time: frontmatter.timerStartedAt,
      }),
    });
    actions
      .createEl("button", {
        text: t("view.timer.stop", plugin.settings.language),
        attr: { "data-testid": "atomic-timer-stop" },
      })
      .addEventListener("click", () => {
        void (async () => {
          const file = plugin.data.getFileByPath(sourcePath);
          if (!file) {
            new Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
            return;
          }
          const latest = await plugin.app.vault.read(file);
          const latestFrontmatter = readTimerFrontmatter(latest);
          if (!latestFrontmatter.timerStartedAt) {
            new Notice(t("notice.timerNotRunning", plugin.settings.language));
            return;
          }
          const startedAtIso = latestFrontmatter.timerStartedAt;
          const stoppedAtIso = new Date().toISOString();
          if (latestFrontmatter.persistMode === "session") {
            const result = stopSessionTimer({
              markdown: latest,
              startedAtIso,
              stoppedAtIso,
            });
            await plugin.app.vault.process(file, () => result.markdown);
            new Notice(
              t("notice.timerLogged", plugin.settings.language, {
                minutes: result.minutes,
              }),
            );
            paintTimer(plugin, el, sourcePath);
            return;
          }
          const note = await promptText(
            plugin.app,
            t("modal.timeLogNote", plugin.settings.language),
            "",
            plugin.settings.language,
          );
          if (note === null) return;
          const result = stopTimer({
            markdown: latest,
            startedAtIso,
            stoppedAtIso,
            note,
          });
          await plugin.app.vault.process(file, () => result.markdown);
          new Notice(
            t("notice.timerLogged", plugin.settings.language, {
              minutes: result.minutes,
            }),
          );
          paintTimer(plugin, el, sourcePath);
        })();
      });
    actions
      .createEl("button", {
        text: t("view.timer.resume", plugin.settings.language),
        attr: { "data-testid": "atomic-timer-resume" },
      })
      .addEventListener("click", () => {
        new Notice(t("notice.timerAlreadyRunning", plugin.settings.language));
      });
    actions
      .createEl("button", {
        text: t("view.timer.discard", plugin.settings.language),
        attr: { "data-testid": "atomic-timer-discard" },
      })
      .addEventListener("click", () => {
        void (async () => {
          const written = await modifyCurrentNote(plugin, sourcePath, (latest) =>
            updateTimerFrontmatter(latest, { timerStartedAtIso: null }),
          );
          if (written) paintTimer(plugin, el, sourcePath);
        })();
      });
    return;
  }

  actions
    .createEl("button", {
      text: t("view.timer.start", plugin.settings.language),
      attr: { "data-testid": "atomic-timer-start" },
    })
    .addEventListener("click", () => {
      void (async () => {
        const written = await modifyCurrentNote(plugin, sourcePath, (latest) =>
          updateTimerFrontmatter(latest, {
            timerStartedAtIso: new Date().toISOString(),
          }),
        );
        if (written) paintTimer(plugin, el, sourcePath);
      })();
    });
}
