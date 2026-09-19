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
import { joinVaultNotePath, normalizeSlashes } from "../util/vault-path.ts";

/** Core Templates token used as the daily-note H1. */
export const OBSIDIAN_DAILY_NOTE_DATE_TOKEN = "{{date:dddd, MMMM D, YYYY}}";

/** Daily Notes core default when Settings → Date format is empty. */
export const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";

/** Filename written when Daily Notes has no template path of its own. */
export const DEFAULT_DAILY_NOTE_TEMPLATE_BASENAME = "Atomic daily note.md";

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

export type DailyNoteTemplateSettings = {
  dailyNotesTemplate: string;
  templatesFolder: string;
};

function withMarkdownExtension(path: string): string {
  const normalized = normalizeSlashes(path.trim());
  return normalized.endsWith(".md") ? normalized : `${normalized}.md`;
}

/**
 * Daily Notes template file if set; otherwise `Atomic daily note.md` in the
 * Templates folder (empty folder = vault root, the core default).
 */
export function resolveDailyNoteTemplatePath(
  settings: DailyNoteTemplateSettings,
): string | null {
  const configured = normalizeSlashes(settings.dailyNotesTemplate.trim());
  if (configured) {
    const path = withMarkdownExtension(configured);
    return joinVaultNotePath("", path);
  }
  return joinVaultNotePath(settings.templatesFolder, DEFAULT_DAILY_NOTE_TEMPLATE_BASENAME);
}

/**
 * Daily Notes new-file location + formatted stem (empty folder = vault root).
 */
export function resolveTodaysDailyNotePath(
  folder: string,
  stem: string,
): string | null {
  const trimmed = normalizeSlashes(stem.trim()).replace(/\.md$/i, "");
  if (!trimmed) return null;
  return joinVaultNotePath(folder, `${trimmed}.md`);
}
