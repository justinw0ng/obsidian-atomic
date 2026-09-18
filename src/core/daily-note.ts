/** Pure daily-note markdown builders — no Obsidian imports. */

import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { dailyNoteHeadingForLanguage, parseYmd } from "../dates.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { hobbyActivities } from "../util/activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { actionActivities } from "../util/action-activities.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultNotePath } from "../util/vault-path.ts";

/** Core Templates token used as the daily-note H1. */
export const OBSIDIAN_DAILY_NOTE_DATE_TOKEN = "{{date:dddd, MMMM D, YYYY}}";

export const DAILY_NOTE_TEMPLATE_FOLDER = "Templates";
export const DAILY_NOTE_TEMPLATE_FILENAME = "Atomic daily note.md";
export const DAILY_NOTE_TEMPLATE_PATH = "Templates/Atomic daily note.md";
export const DAILY_NOTES_FOLDER = "Daily notes";

export type DailyNoteHeadingKind = "obsidian-template" | "resolved";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function dailyNoteHeatmapActivityOption(
  activityTypes: readonly ActivityType[],
): string {
  const ids = actionActivities([...activityTypes]).map((activity) => activity.id);
  return ids.length ? ids.join(", ") : "all";
}

export function dailyNoteBookshelfActivityId(
  activityTypes: readonly ActivityType[],
): string | null {
  return hobbyActivities([...activityTypes])[0]?.id ?? null;
}

function headingFor(
  kind: DailyNoteHeadingKind,
  language: Language,
  date?: string,
): string {
  switch (kind) {
    case "obsidian-template":
      return OBSIDIAN_DAILY_NOTE_DATE_TOKEN;
    case "resolved": {
      const parsed = parseYmd(date ?? "");
      if (!parsed) {
        throw new Error("Daily note date must be YYYY-MM-DD");
      }
      return dailyNoteHeadingForLanguage(parsed.y, parsed.m, parsed.d, language);
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function dailyNoteMarkdown(
  language: Language,
  activityTypes: readonly ActivityType[],
  kind: DailyNoteHeadingKind,
  date?: string,
): string {
  const heading = headingFor(kind, language, date);
  const sections: string[] = [`# ${heading}\n`];

  const bookshelfActivity = dailyNoteBookshelfActivityId(activityTypes);
  if (bookshelfActivity) {
    sections.push(
      defaultAtomicBlockFence("atomic-bookshelf", language, {
        activity: bookshelfActivity,
      }),
    );
  }

  sections.push(`## ${t("template.dailyNote.trackToday", language)}\n`);
  sections.push(defaultAtomicBlockFence("atomic-actions", language));
  sections.push(
    defaultAtomicBlockFence("atomic-heatmap", language, {
      activity: dailyNoteHeatmapActivityOption(activityTypes),
      rows: "2",
      columns: "2",
    }),
  );
  sections.push(defaultAtomicBlockFence("atomic-today", language));
  return sections.join("\n");
}

export function dailyNoteTemplateMarkdown(
  language: Language,
  activityTypes: readonly ActivityType[],
): string {
  return dailyNoteMarkdown(language, activityTypes, "obsidian-template");
}

export function todaysDailyNoteMarkdown(
  language: Language,
  activityTypes: readonly ActivityType[],
  date: string,
): string {
  return dailyNoteMarkdown(language, activityTypes, "resolved", date);
}

export function dailyNoteTemplatePath(): string {
  if (!isSafeVaultNotePath(DAILY_NOTE_TEMPLATE_PATH)) {
    throw new Error("Daily note template path must be a safe vault-relative note");
  }
  return DAILY_NOTE_TEMPLATE_PATH;
}

export function todaysDailyNotePath(date: string): string {
  if (!YMD.test(date)) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  const path = `${DAILY_NOTES_FOLDER}/${date}.md`;
  if (!isSafeVaultNotePath(path)) {
    throw new Error("Daily note path must be a safe vault-relative note");
  }
  return path;
}
