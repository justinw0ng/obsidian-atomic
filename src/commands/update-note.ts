import { Notice } from "obsidian";
import type FitnessPlugin from "../main";
import {
  UPDATE_NOTE,
  formatUpdateNoteNotice,
  updateNoteBodyForLanguage,
  updateNoteToShow,
} from "../core/update-notes";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";

const UPDATE_NOTE_NOTICE_MS = 8000;

let activeUpdateNotice: Notice | null = null;

export async function persistSeenUpdateNote(
  plugin: FitnessPlugin,
): Promise<void> {
  const current = plugin.manifest.version;
  if (plugin.settings.lastSeenUpdateNoteVersion === current) return;
  plugin.settings.lastSeenUpdateNoteVersion = current;
  await plugin.saveSettings();
}

export function promptPendingUpdateNote(plugin: FitnessPlugin): void {
  const note = updateNoteToShow({
    note: UPDATE_NOTE,
    lastSeenVersion: plugin.settings.lastSeenUpdateNoteVersion,
    currentVersion: plugin.manifest.version,
  });
  if (!note) {
    void persistSeenUpdateNote(plugin);
    return;
  }
  const language = plugin.settings.language;
  const message = formatUpdateNoteNotice(
    t("notice.updateNoteTitle", language, { version: note.version }),
    updateNoteBodyForLanguage(note, language),
  );
  showUpdateNoteNotice(message);
  void persistSeenUpdateNote(plugin);
}

function showUpdateNoteNotice(message: string): void {
  activeUpdateNotice?.hide();
  const notice = new Notice(message, UPDATE_NOTE_NOTICE_MS);
  notice.noticeEl.addClass("atomic-update-note-notice");
  notice.noticeEl.setAttr("data-testid", "atomic-update-note-notice");
  activeUpdateNotice = notice;
}
