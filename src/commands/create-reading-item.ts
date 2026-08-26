import type { App } from "obsidian";
import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
import { showNotice } from "../util/notice";
import { promptText } from "../util/prompt-text";
import { buildHobbyItemPath, readingItemMarkdown } from "./hobby-item";

type ItemNoticeKeys = {
  titleKey: "modal.hobbyItemTitle" | "modal.readingItemTitle";
  openedKey: "notice.openedExistingHobbyItem" | "notice.openedExistingReadingItem";
  createdKey: "notice.createdHobbyItem" | "notice.createdReadingItem";
  failedKey: "notice.hobbyItemFailed" | "notice.readingItemFailed";
};

const HOBBY_COPY: ItemNoticeKeys = {
  titleKey: "modal.hobbyItemTitle",
  openedKey: "notice.openedExistingHobbyItem",
  createdKey: "notice.createdHobbyItem",
  failedKey: "notice.hobbyItemFailed",
};

const READING_COPY: ItemNoticeKeys = {
  titleKey: "modal.readingItemTitle",
  openedKey: "notice.openedExistingReadingItem",
  createdKey: "notice.createdReadingItem",
  failedKey: "notice.readingItemFailed",
};

async function createItemNote(
  app: App,
  data: VaultDataSource,
  activity: ActivityType,
  language: Language,
  copy: ItemNoticeKeys,
): Promise<void> {
  const title = await promptText(
    app,
    t(copy.titleKey, language, { label: activity.label }),
    "",
    language,
  );
  if (title === null) return;
  const path = buildHobbyItemPath(activity.folder, title);

  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
        t(copy.openedKey, language, {
          label: activity.label,
          path,
        }),
      );
      return;
    }

    await data.createNote(
      path,
      readingItemMarkdown(title, language, activity.id),
    );
    await data.openPath(path);
    showNotice(
      t(copy.createdKey, language, {
        label: activity.label,
        path,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t(copy.failedKey, language, { message }));
  }
}

export async function createHobbyItem(
  app: App,
  data: VaultDataSource,
  hobbyActivity: ActivityType,
  language: Language,
): Promise<void> {
  await createItemNote(app, data, hobbyActivity, language, HOBBY_COPY);
}

export async function createReadingItem(
  app: App,
  data: VaultDataSource,
  readingActivity: ActivityType,
  language: Language,
): Promise<void> {
  await createItemNote(app, data, readingActivity, language, READING_COPY);
}
