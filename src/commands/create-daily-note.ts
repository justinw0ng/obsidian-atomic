import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DAILY_NOTE_TEMPLATE_PATH, dailyNoteTemplateMarkdown, todaysDailyNoteMarkdown, todaysDailyNotePath } from "../core/daily-note.ts";
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

async function createNoteIfMissing(
  data: VaultDataSource,
  path: string,
  content: string,
): Promise<DailyNoteCreateResult> {
  if (data.exists(path)) {
    return { path, created: false };
  }
  await data.createNote(path, content);
  return { path, created: true };
}

export async function createDailyNoteTemplateFile(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  language: Language = "en",
): Promise<DailyNoteCreateResult> {
  return createNoteIfMissing(
    data,
    DAILY_NOTE_TEMPLATE_PATH,
    dailyNoteTemplateMarkdown(language, activityTypes),
  );
}

export async function createTodaysDailyNoteFile(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  timezone: string,
  language: Language = "en",
  now: Date = new Date(),
): Promise<DailyNoteCreateResult> {
  const date = ymdInZone(now, timezone);
  return createNoteIfMissing(
    data,
    todaysDailyNotePath(date),
    todaysDailyNoteMarkdown(language, activityTypes, date),
  );
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
): Promise<void> {
  try {
    const result = await createTodaysDailyNoteFile(
      data,
      activityTypes,
      timezone,
      language,
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
