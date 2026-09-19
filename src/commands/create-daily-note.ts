import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_DAILY_NOTE_FORMAT, dailyNoteTemplateMarkdown, resolveDailyNoteTemplatePath, resolveTodaysDailyNotePath, todaysDailyNoteMarkdown } from "../core/daily-note.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { parseYmd, ymdInZone } from "../dates.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readDailyNotesCoreSettings, readTemplatesCoreSettings } from "../util/core-plugin-options.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { showNotice } from "../util/notice.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultNotePath, normalizeSlashes } from "../util/vault-path.ts";

export type DailyNoteCreateResult = {
  path: string;
  created: boolean;
};

type MomentLike = (input: string, format: string) => { format: (format: string) => string };

function noticeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireSafeVaultNotePath(path: string): string {
  const normalized = normalizeSlashes(path.trim());
  if (!isSafeVaultNotePath(normalized)) {
    throw new Error("Daily note path must be a safe vault-relative markdown note");
  }
  return normalized;
}

function readActiveWindowMoment(): MomentLike | null {
  const host =
    typeof activeWindow === "undefined"
      ? undefined
      : (activeWindow as typeof activeWindow & { moment?: MomentLike });
  const moment = host?.moment;
  return typeof moment === "function" ? moment : null;
}

export function dailyNoteFilenameStem(ymd: string, format: string): string {
  if (!parseYmd(ymd)) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  const fmt = format.trim() || DEFAULT_DAILY_NOTE_FORMAT;
  if (fmt === DEFAULT_DAILY_NOTE_FORMAT) return ymd;
  const moment = readActiveWindowMoment();
  if (!moment) {
    throw new Error("Daily note format requires moment");
  }
  const stem = String(moment(ymd, DEFAULT_DAILY_NOTE_FORMAT).format(fmt) ?? "").trim();
  if (!stem) {
    throw new Error("Daily note format produced an empty filename");
  }
  return stem.replace(/\.md$/i, "");
}

export function dailyNoteTemplatePathFromApp(app: unknown): string {
  const daily = readDailyNotesCoreSettings(app);
  const templates = readTemplatesCoreSettings(app);
  const path = resolveDailyNoteTemplatePath({
    dailyNotesTemplate: daily.template,
    templatesFolder: templates.folder,
  });
  if (!path) {
    throw new Error("Daily note template path must be a safe vault-relative markdown note");
  }
  return path;
}

export function todaysDailyNoteTargetFromApp(
  app: unknown,
  timezone: string,
  now: Date = new Date(),
): { path: string; date: string } {
  const daily = readDailyNotesCoreSettings(app);
  const date = ymdInZone(now, timezone);
  const path = resolveTodaysDailyNotePath(daily.folder, dailyNoteFilenameStem(date, daily.format));
  if (!path) {
    throw new Error("Daily note path must be a safe vault-relative markdown note");
  }
  return { path, date };
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
  path: string,
  language: Language = "en",
): Promise<DailyNoteCreateResult> {
  return createNoteIfMissing(
    data,
    requireSafeVaultNotePath(path),
    dailyNoteTemplateMarkdown(language, activityTypes),
  );
}

export async function createTodaysDailyNoteFile(
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  path: string,
  date: string,
  language: Language = "en",
): Promise<DailyNoteCreateResult> {
  return createNoteIfMissing(
    data,
    requireSafeVaultNotePath(path),
    todaysDailyNoteMarkdown(language, activityTypes, date),
  );
}

export async function createDailyNoteTemplateCommand(
  app: unknown,
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  language: Language,
): Promise<void> {
  try {
    const result = await createDailyNoteTemplateFile(
      data,
      activityTypes,
      dailyNoteTemplatePathFromApp(app),
      language,
    );
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
  app: unknown,
  data: VaultDataSource,
  activityTypes: readonly ActivityType[],
  timezone: string,
  language: Language,
): Promise<void> {
  try {
    const { path, date } = todaysDailyNoteTargetFromApp(app, timezone);
    const result = await createTodaysDailyNoteFile(
      data,
      activityTypes,
      path,
      date,
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
