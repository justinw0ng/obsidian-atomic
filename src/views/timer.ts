import { Notice } from "obsidian";
import { appendCatalogLabel } from "./catalog-label";
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

const timerClocks = new WeakMap<HTMLElement, number>();

function stopTimerClock(el: HTMLElement): void {
  const id = timerClocks.get(el);
  if (id == null) return;
  window.clearInterval(id);
  timerClocks.delete(el);
}

function localClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function elapsedClock(iso: string, now = Date.now()): string {
  const started = new Date(iso).getTime();
  if (Number.isNaN(started)) return "00:00";
  const total = Math.max(0, Math.floor((now - started) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
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
  const markdown = sourcePath ? await plugin.data.readCachedBody(sourcePath) : "";
  if (isStaleBlockRender(el, generation)) {
    return;
  }

  stopTimerClock(el);
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-timer atomic-well",
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
  const language = plugin.settings.language;
  const totalKey =
    frontmatter.persistMode === "session"
      ? "view.timer.duration"
      : "view.timer.total";
  const minutes = displayedTimerMinutes(frontmatter);
  const head = root.createDiv({ cls: "atomic-timer-head" });
  const caption = head.createDiv({ cls: "atomic-timer-caption atomic-caption" });
  const total = head.createDiv({ cls: "atomic-readout atomic-timer-total" });
  appendCatalogLabel(total, t(totalKey, language, { minutes }));
  const clock = root.createDiv({ cls: "atomic-timer-clock" });
  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.addClass("is-running");
    const startedAt = frontmatter.timerStartedAt;
    caption.createSpan({ cls: "atomic-pulse" });
    appendCatalogLabel(
      caption,
      t("view.timer.runningSince", language, { time: localClock(startedAt) }),
    );
    clock.setText(elapsedClock(startedAt));
    const tick = window.setInterval(() => {
      if (!clock.isConnected) {
        stopTimerClock(el);
        return;
      }
      clock.setText(elapsedClock(startedAt));
    }, 1000);
    timerClocks.set(el, tick);
    actions
      .createEl("button", {
        text: t("view.timer.stop", plugin.settings.language),
        cls: "atomic-btn is-primary",
        attr: { "data-testid": "atomic-timer-stop", type: "button" },
      })
      .addEventListener("click", () => {
        void (async () => {
          const file = plugin.data.getFileByPath(sourcePath);
          if (!file) {
            new Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
            return;
          }
          const latest = await plugin.app.vault.read(file);
          const persistMode = readTimerFrontmatter(latest).persistMode;
          switch (persistMode) {
            case "session": {
              let minutes: number | null = null;
              await plugin.app.vault.process(file, (current) => {
                const startedAtIso = readTimerFrontmatter(current).timerStartedAt;
                if (!startedAtIso) return current;
                const result = stopSessionTimer({
                  markdown: current,
                  startedAtIso,
                  stoppedAtIso: new Date().toISOString(),
                });
                minutes = result.minutes;
                return result.markdown;
              });
              if (minutes === null) {
                new Notice(t("notice.timerNotRunning", plugin.settings.language));
                return;
              }
              new Notice(
                t("notice.timerLogged", plugin.settings.language, { minutes }),
              );
              paintTimer(plugin, el, sourcePath);
              return;
            }
            case "item": {
              const itemFrontmatter = readTimerFrontmatter(latest);
              if (!itemFrontmatter.timerStartedAt) {
                new Notice(t("notice.timerNotRunning", plugin.settings.language));
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
                startedAtIso: itemFrontmatter.timerStartedAt,
                stoppedAtIso: new Date().toISOString(),
                note,
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
            default: {
              const unseen: never = persistMode;
              throw new Error(`Unknown timer persist mode: ${unseen}`);
            }
          }
        })();
      });
    actions
      .createEl("button", {
        text: t("view.timer.discard", plugin.settings.language),
        cls: "atomic-btn is-quiet",
        attr: { "data-testid": "atomic-timer-discard", type: "button" },
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

  appendCatalogLabel(caption, t("view.timer.caption", language));
  clock.appendText(String(minutes));
  clock.createSpan({ cls: "atomic-unit", text: t("view.timer.minuteUnit", language) });
  actions
    .createEl("button", {
      text: t("view.timer.start", plugin.settings.language),
      cls: "atomic-btn is-primary",
      attr: { "data-testid": "atomic-timer-start", type: "button" },
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
