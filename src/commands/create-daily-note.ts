import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { dailyNoteTemplateMarkdown, dailyNoteTemplatePath, todaysDailyNoteMarkdown, todaysDailyNotePath } from "../core/daily-note.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { ymdInZone } from "../dates.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { showNotice } from "../util/notice.ts";

export type DailyNoteCreateResult = {
  path: string;
  created: boolean;
};

function noticeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function createDailyNoteTemplateFile(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  language: Language = "en",
): Promise<DailyNoteCreateResult> {
  const path = dailyNoteTemplatePath();
  if (data.exists(path)) {
    return { path, created: false };
  }
  await data.createNote(path, dailyNoteTemplateMarkdown(language, activityTypes));
  return { path, created: true };
}

export async function createTodaysDailyNoteFile(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  timezone: string,
  language: Language = "en",
  now: Date = new Date(),
): Promise<DailyNoteCreateResult> {
  const date = ymdInZone(now, timezone);
  const path = todaysDailyNotePath(date);
  if (data.exists(path)) {
    return { path, created: false };
  }
  await data.createNote(path, todaysDailyNoteMarkdown(language, activityTypes, date));
  return { path, created: true };
}

export async function createDailyNoteTemplateCommand(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  language: Language,
): Promise<void> {
  try {
    const result = await createDailyNoteTemplateFile(data, activityTypes, language);
    showNotice(
      result.created
        ? t("notice.createdDailyNoteTemplate", language, { path: result.path })
        : t("notice.dailyNoteTemplateExists", language, { path: result.path }),
    );
  } catch (error) {
    showNotice(
      t("notice.dailyNoteTemplateFailed", language, {
        message: noticeErrorMessage(error),
      }),
    );
  }
}

export async function createTodaysDailyNoteCommand(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  timezone: string,
  language: Language,
  now: Date = new Date(),
): Promise<void> {
  try {
    const result = await createTodaysDailyNoteFile(
      data,
      activityTypes,
      timezone,
      language,
      now,
    );
    await data.openPath(result.path);
    showNotice(
      result.created
        ? t("notice.createdTodaysDailyNote", language, { path: result.path })
        : t("notice.todaysDailyNoteExists", language, { path: result.path }),
    );
  } catch (error) {
    showNotice(
      t("notice.todaysDailyNoteFailed", language, {
        message: noticeErrorMessage(error),
      }),
    );
  }
}
