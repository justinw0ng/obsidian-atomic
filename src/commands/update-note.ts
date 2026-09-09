import { Modal, Setting } from "obsidian";
import type FitnessPlugin from "../main";
import {
  UPDATE_NOTE,
  updateNoteToShow,
  type UpdateNote,
} from "../core/update-notes";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t } from "../i18n/index.ts";

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
  new UpdateNoteModal(plugin, note).open();
}

class UpdateNoteModal extends Modal {
  private resolved = false;

  constructor(
    private readonly plugin: FitnessPlugin,
    private readonly note: UpdateNote,
  ) {
    super(plugin.app);
  }

  onOpen(): void {
    const language = this.plugin.settings.language;
    this.modalEl.setAttr("data-testid", "atomic-update-note-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", {
      text: t("modal.updateNoteTitle", language, {
        version: this.note.version,
      }),
    });
    const body = contentEl.createEl("p", {
      text: this.note.body,
      cls: "atomic-update-note-body",
    });
    body.setAttr("data-testid", "atomic-update-note-body");
    new Setting(contentEl).addButton((button) => {
      button.setButtonText(t("modal.updateNoteAck", language));
      button.setCta();
      button.buttonEl.setAttr("data-testid", "atomic-update-note-ack");
      button.onClick(() => this.close());
    });
  }

  onClose(): void {
    if (this.resolved) return;
    this.resolved = true;
    void persistSeenUpdateNote(this.plugin);
  }
}
