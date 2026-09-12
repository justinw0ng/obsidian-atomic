import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { cuePathForActivity, exerciseActivities } from "../util/activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { showNotice } from "../util/notice.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder } from "../util/vault-path.ts";

export function cueActivities(activityTypes: ActivityType[]): ActivityType[] {
  return exerciseActivities(activityTypes).filter((activity) => activity.supportsCues);
}

/** Host note for the cues fan: title + modern `atomic-cues` fence. Path is `cuePathForActivity`. */
export function cuesHostMarkdown(
  activity: ActivityType,
  language: Language = "en",
): string {
  return `# ${activity.label}\n\n${defaultAtomicBlockFence("atomic-cues", language, {
    activity: activity.id,
  })}`;
}

export async function ensureCuesHostFile(
  data: VaultDataSource,
  activity: ActivityType,
  language: Language = "en",
): Promise<{ path: string; created: boolean }> {
  const path = cuePathForActivity(activity);
  if (data.exists(path)) {
    return { path, created: false };
  }
  if (activity.domain !== "exercise" || !activity.supportsCues) {
    return { path, created: false };
  }
  const folder = activity.folder.replace(/\/$/, "");
  if (!isSafeVaultFolder(folder)) {
    throw new Error("Cues folder must be a safe vault-relative path");
  }

  await data.createNote(path, cuesHostMarkdown(activity, language));
  return { path, created: true };
}

export async function ensureCuesHostFiles(
  data: VaultDataSource,
  activityTypes: ActivityType[],
  language: Language = "en",
): Promise<{ path: string; created: boolean }[]> {
  const results: { path: string; created: boolean }[] = [];
  for (const activity of cueActivities(activityTypes)) {
    results.push(await ensureCuesHostFile(data, activity, language));
  }
  return results;
}

function noticeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function joinPaths(results: { path: string }[]): string {
  return results.map((result) => result.path).join(", ");
}

export async function createCuesHostCommand(
  data: VaultDataSource,
  activityTypes: ActivityType[],
  language: Language,
): Promise<void> {
  try {
    const results = await ensureCuesHostFiles(data, activityTypes, language);
    if (!results.length) {
      showNotice(t("notice.noCueActivities", language));
      return;
    }
    const created = results.filter((result) => result.created);
    const existing = results.filter((result) => !result.created);
    if (created.length) {
      showNotice(t("notice.createdCues", language, { paths: joinPaths(created) }));
    }
    if (existing.length) {
      showNotice(t("notice.cuesExist", language, { paths: joinPaths(existing) }));
    }
  } catch (error) {
    showNotice(t("notice.cuesFailed", language, { message: noticeErrorMessage(error) }));
  }
}

export async function openCuesHostFile(
  data: VaultDataSource,
  activity: ActivityType,
  language: Language,
): Promise<void> {
  try {
    const result = await ensureCuesHostFile(data, activity, language);
    await data.openPath(result.path);
  } catch (error) {
    showNotice(t("notice.cuesFailed", language, { message: noticeErrorMessage(error) }));
  }
}
