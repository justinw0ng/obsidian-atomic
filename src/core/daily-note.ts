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

/** Core Templates token used as the daily-note H1. */
export const OBSIDIAN_DAILY_NOTE_DATE_TOKEN = "{{date:dddd, MMMM D, YYYY}}";

export const DAILY_NOTE_TEMPLATE_PATH = "Templates/Atomic daily note.md";
export const DAILY_NOTES_FOLDER = "Daily notes";

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

export function dailyNoteMarkdown(
  language: Language,
  activityTypes: readonly ActivityType[],
  heading: string,
): string {
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
  return dailyNoteMarkdown(language, activityTypes, OBSIDIAN_DAILY_NOTE_DATE_TOKEN);
}

export function todaysDailyNoteMarkdown(
  language: Language,
  activityTypes: readonly ActivityType[],
  date: string,
): string {
  const parsed = parseYmd(date);
  if (!parsed) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  return dailyNoteMarkdown(
    language,
    activityTypes,
    dailyNoteHeadingForLanguage(parsed.y, parsed.m, parsed.d, language),
  );
}

export function todaysDailyNotePath(date: string): string {
  if (!parseYmd(date)) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  return `${DAILY_NOTES_FOLDER}/${date}.md`;
}
