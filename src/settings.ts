import {
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  type ButtonComponent,
  type SettingDefinitionItem,
} from "obsidian";
import type FitnessPlugin from "./main";
import type { ActivityType } from "./types";
import { DEFAULT_SETTINGS } from "./types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isLanguage, t } from "./i18n/index.ts";
import {
  allExerciseActivities,
  allHobbyActivities,
  createExerciseActivityType,
  createHobbyActivityType,
} from "./util/activity-types";
import { shadesFromBaseColor } from "./util/colors";
import { isSafeVaultFolder } from "./util/vault-path";
import { runGymLogSetup } from "./commands/gym-log-setup";

export { mergeSettings } from "./util/merge-settings";

function styleDestructiveButton(button: ButtonComponent): void {
  button.buttonEl.addClass("mod-warning");
}

function isFunction(
  value: unknown,
): value is (this: object, ...args: unknown[]) => unknown {
  return typeof value === "function";
}

function callNamedMethod(target: object, name: string): boolean {
  const method = (target as Record<string, unknown>)[name];
  if (!isFunction(method)) return false;
  method.call(target);
  return true;
}

class ConfirmDeleteActivityModal extends Modal {
  private readonly message: string;
  private readonly confirmLabel: string;
  private readonly cancelLabel: string;
  private readonly onConfirm: () => void;

  constructor(
    app: App,
    options: {
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      onConfirm: () => void;
    },
  ) {
    super(app);
    this.message = options.message;
    this.confirmLabel = options.confirmLabel;
    this.cancelLabel = options.cancelLabel;
    this.onConfirm = options.onConfirm;
  }

  onOpen(): void {
    this.modalEl.setAttr("data-testid", "atomic-confirm-delete-modal");
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(this.cancelLabel).onClick(() => this.close()),
      )
      .addButton((button) => {
        button.setButtonText(this.confirmLabel);
        styleDestructiveButton(button);
        button.onClick(() => {
          this.onConfirm();
          this.close();
        });
      });
  }
}

type SettingsKey = "language" | "timezone" | "dashboardPath";

type BoundControl =
  | { type: "dropdown"; key: SettingsKey; options: Record<string, string> }
  | {
      type: "text";
      key: SettingsKey;
      placeholder?: string;
      validate?: (value: string) => string | void;
    };

type SettingsRow =
  | { kind: "heading"; name: string; desc: string }
  | { kind: "control"; name: string; desc: string; key: SettingsKey }
  | {
      kind: "custom";
      name: string;
      desc: string;
      aliases?: string[];
      paint: (setting: Setting) => void;
    };

export class FitnessSettingTab extends PluginSettingTab {
  plugin: FitnessPlugin;
  private pendingExerciseName = "";
  private pendingHobbyName = "";

  constructor(app: App, plugin: FitnessPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Fallback for Obsidian < 1.13.0. 1.13+ renders `getSettingDefinitions()`. */
  display(): void {
    this.paintSettings(this.containerEl);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return this.settingsRows().map((row) => {
      switch (row.kind) {
        case "control":
          return {
            name: row.name,
            desc: row.desc,
            control: this.controlFor(row.key),
          };
        case "heading":
          return {
            name: row.name,
            desc: row.desc,
            render: (setting) => {
              setting.setHeading();
            },
          };
        case "custom":
          return {
            name: row.name,
            desc: row.desc,
            aliases: row.aliases,
            render: (setting) => {
              row.paint(setting);
            },
          };
        default: {
          const _exhaustive: never = row;
          return _exhaustive;
        }
      }
    });
  }

  getControlValue(key: string): unknown {
    if (key === "language") return this.plugin.settings.language;
    if (key === "timezone") return this.plugin.settings.timezone;
    if (key === "dashboardPath") return this.plugin.settings.dashboardPath;
    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "language") {
      if (typeof value !== "string" || !isLanguage(value)) return;
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.redrawSettings();
      await this.plugin.refreshAll();
      new Notice(t("notice.reloadForCommands", value));
      return;
    }
    if (key === "timezone") {
      if (typeof value !== "string") return;
      this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
      await this.plugin.saveSettings();
      void this.plugin.refreshAll();
      return;
    }
    if (key === "dashboardPath") {
      if (typeof value !== "string") return;
      const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
      if (!isSafeVaultFolder(next)) {
        new Notice(t("notice.folderUnsafe", this.plugin.settings.language));
        return;
      }
      this.plugin.settings.dashboardPath = next;
      await this.plugin.saveSettings();
    }
  }

  private redrawSettings(): void {
    if (callNamedMethod(this, "update")) return;
    this.paintSettings(this.containerEl);
  }

  private settingsRows(): SettingsRow[] {
    const language = this.plugin.settings.language;
    const rows: SettingsRow[] = [
      {
        kind: "control",
        name: t("settings.language", language),
        desc: t("settings.languageDesc", language),
        key: "language",
      },
      {
        kind: "control",
        name: t("settings.timezone", language),
        desc: t("settings.timezoneDesc", language),
        key: "timezone",
      },
      {
        kind: "control",
        name: t("settings.dashboardPath", language),
        desc: t("settings.dashboardPathDesc", language),
        key: "dashboardPath",
      },
      {
        kind: "heading",
        name: t("settings.exerciseTypes", language),
        desc: t("settings.exerciseTypesDesc", language),
      },
    ];

    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      rows.push(...this.activityRows(activity, { showCues: true }));
    }

    rows.push({
      kind: "custom",
      name: t("settings.addExerciseType", language),
      desc: t("settings.addExerciseTypeDesc", language),
      paint: (setting) => {
        this.paintAddActivity(setting, "exercise");
      },
    });
    rows.push({
      kind: "heading",
      name: t("settings.hobbyTypes", language),
      desc: t("settings.hobbyTypesDesc", language),
    });

    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      rows.push(...this.activityRows(activity, { showCues: false }));
    }

    rows.push({
      kind: "custom",
      name: t("settings.addHobbyType", language),
      desc: t("settings.addHobbyTypeDesc", language),
      paint: (setting) => {
        this.paintAddActivity(setting, "hobby");
      },
    });
    rows.push({
      kind: "heading",
      name: t("settings.gymExercises", language),
      desc: t("settings.gymExercisesDesc", language),
    });
    rows.push({
      kind: "custom",
      name: t("settings.gymImport", language),
      desc: t("settings.gymImportDesc", language),
      paint: (setting) => {
        this.paintGymImport(setting);
      },
    });
    return rows;
  }

  private activityRows(
    activity: ActivityType,
    options: { showCues: boolean },
  ): SettingsRow[] {
    const language = this.plugin.settings.language;
    return [
      {
        kind: "custom",
        name: activity.label,
        desc: t("settings.activityId", language, { id: activity.id }),
        aliases: [activity.id],
        paint: (setting) => {
          this.paintActivityControls(setting, activity, options);
        },
      },
      {
        kind: "custom",
        name: t("settings.baseColor", language, { label: activity.label }),
        desc: t("settings.baseColorDesc", language),
        aliases: [activity.id, "color"],
        paint: (setting) => {
          this.paintColorControls(setting, activity);
        },
      },
    ];
  }

  private controlFor(key: SettingsKey): BoundControl {
    const language = this.plugin.settings.language;
    switch (key) {
      case "language":
        return {
          type: "dropdown",
          key: "language",
          options: {
            "zh-Hant-en": t("settings.languageOption.zh-Hant-en", language),
            en: t("settings.languageOption.en", language),
          },
        };
      case "timezone":
        return {
          type: "text",
          key: "timezone",
          placeholder: "Asia/Hong_Kong",
        };
      case "dashboardPath":
        return {
          type: "text",
          key: "dashboardPath",
          placeholder: DEFAULT_SETTINGS.dashboardPath,
          validate: (value) => {
            const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
            if (!isSafeVaultFolder(next)) {
              return t("notice.folderUnsafe", this.plugin.settings.language);
            }
          },
        };
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  }

  private paintBoundControl(setting: Setting, key: SettingsKey): void {
    const control = this.controlFor(key);
    switch (control.type) {
      case "dropdown":
        setting.addDropdown((dropdown) => {
          for (const [value, label] of Object.entries(control.options)) {
            dropdown.addOption(value, label);
          }
          dropdown.setValue(String(this.getControlValue(key) ?? ""));
          dropdown.onChange((value) => {
            void this.setControlValue(key, value);
          });
        });
        return;
      case "text":
        setting.addText((text) => {
          if (control.placeholder) text.setPlaceholder(control.placeholder);
          text.setValue(String(this.getControlValue(key) ?? ""));
          text.onChange((value) => {
            void this.setControlValue(key, value);
          });
        });
        return;
      default: {
        const _exhaustive: never = control;
        return _exhaustive;
      }
    }
  }

  private paintSettings(containerEl: HTMLElement): void {
    containerEl.empty();
    for (const row of this.settingsRows()) {
      const setting = new Setting(containerEl).setName(row.name).setDesc(row.desc);
      switch (row.kind) {
        case "heading":
          setting.setHeading();
          break;
        case "control":
          this.paintBoundControl(setting, row.key);
          break;
        case "custom":
          row.paint(setting);
          break;
        default: {
          const _exhaustive: never = row;
          return _exhaustive;
        }
      }
    }
  }

  private async saveAndRefresh(): Promise<void> {
    await this.plugin.saveSettings();
    await this.plugin.refreshAll();
  }

  private uniqueActivityId(baseId: string): string {
    const used = new Set(this.plugin.settings.activityTypes.map((activity) => activity.id));
    if (!used.has(baseId)) return baseId;
    let index = 2;
    while (used.has(`${baseId}-${index}`)) index += 1;
    return `${baseId}-${index}`;
  }

  private paintActivityControls(
    setting: Setting,
    activity: ActivityType,
    options: { showCues: boolean },
  ): void {
    const language = this.plugin.settings.language;
    const folderPlaceholder = options.showCues
      ? t("settings.exerciseFolderPlaceholder", language)
      : t("settings.hobbyFolderPlaceholder", language);

    setting
      .setClass("atomic-setting-exercise-type")
      .addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enabledTooltip", language))
          .setValue(activity.enabled !== false)
          .onChange(async (value) => {
            activity.enabled = value;
            await this.saveAndRefresh();
          }),
      )
      .addText((text) =>
        text
          .setPlaceholder(t("settings.labelPlaceholder", language))
          .setValue(activity.label)
          .onChange(async (value) => {
            const label = value.trim();
            if (!label) return;
            activity.label = label;
            await this.saveAndRefresh();
          }),
      )
      .addText((text) =>
        text
          .setPlaceholder(folderPlaceholder)
          .setValue(activity.folder)
          .onChange(async (value) => {
            const folder = value.trim();
            if (!isSafeVaultFolder(folder)) {
              new Notice(t("notice.folderUnsafe", this.plugin.settings.language));
              return;
            }
            activity.folder = folder;
            await this.saveAndRefresh();
          }),
      );
    setting.settingEl.setAttr("data-testid", "atomic-setting-activity");
    setting.settingEl.setAttr("data-activity-id", activity.id);

    if (options.showCues) {
      setting.addToggle((toggle) =>
        toggle
          .setTooltip(t("settings.enableCuesTooltip", language))
          .setValue(activity.supportsCues)
          .onChange(async (value) => {
            activity.supportsCues = value;
            await this.saveAndRefresh();
          }),
      );
    }

    setting.addButton((button) => {
      button.setButtonText(t("settings.delete", language));
      styleDestructiveButton(button);
      button.onClick(() => {
        this.confirmDeleteActivity(activity);
      });
    });
  }

  private paintColorControls(setting: Setting, activity: ActivityType): void {
    setting
      .setClass("atomic-setting-colors")
      .addColorPicker((picker) =>
        picker.setValue(activity.baseColor || activity.colors[2]).onChange(async (value) => {
          activity.baseColor = value;
          activity.colors = shadesFromBaseColor(value);
          await this.saveAndRefresh();
          this.renderColorSwatches(setting.controlEl, activity);
        }),
      );
    setting.settingEl.setAttr("data-testid", "atomic-setting-colors");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    this.renderColorSwatches(setting.controlEl, activity);
  }

  private paintAddActivity(setting: Setting, kind: "exercise" | "hobby"): void {
    const language = this.plugin.settings.language;
    const isHobby = kind === "hobby";
    setting
      .addText((text) =>
        text
          .setPlaceholder(
            t(
              isHobby
                ? "settings.hobbyNamePlaceholder"
                : "settings.exerciseNamePlaceholder",
              language,
            ),
          )
          .setValue(isHobby ? this.pendingHobbyName : this.pendingExerciseName)
          .onChange((value) => {
            if (isHobby) this.pendingHobbyName = value;
            else this.pendingExerciseName = value;
          }),
      )
      .addButton((button) =>
        button.setButtonText(t("settings.add", language)).onClick(async () => {
          const name = (isHobby ? this.pendingHobbyName : this.pendingExerciseName).trim();
          if (!name) {
            new Notice(
              t(
                isHobby ? "notice.enterHobbyType" : "notice.enterExerciseType",
                this.plugin.settings.language,
              ),
            );
            return;
          }
          const activity = isHobby
            ? createHobbyActivityType(name)
            : createExerciseActivityType(name);
          activity.id = this.uniqueActivityId(activity.id);
          this.plugin.settings.activityTypes = [
            ...this.plugin.settings.activityTypes,
            activity,
          ];
          if (isHobby) this.pendingHobbyName = "";
          else this.pendingExerciseName = "";
          await this.saveAndRefresh();
          this.redrawSettings();
        }),
      );
    if (isHobby) {
      setting.settingEl.setAttr("data-testid", "atomic-setting-add-hobby");
    }
  }

  private paintGymImport(setting: Setting): void {
    const language = this.plugin.settings.language;
    const count = this.plugin.settings.gymExercises.length;
    setting.setDesc(
      `${t("settings.gymImportDesc", language)} ${t("settings.gymExercisesCount", language, { count })}`,
    );
    setting.addButton((button) => {
      button.setButtonText(t("settings.gymImport", language));
      button.buttonEl.setAttr("data-testid", "atomic-setting-gym-import");
      button.onClick(() => {
        void runGymLogSetup(this.plugin).then(() => this.redrawSettings());
      });
    });
    setting.settingEl.setAttr("data-testid", "atomic-setting-gym-exercises");
  }

  private renderColorSwatches(controlEl: HTMLElement, activity: ActivityType): void {
    controlEl.querySelectorAll(".atomic-color-swatch-row").forEach((node) => node.remove());
    const row = controlEl.createDiv({
      cls: "atomic-color-swatch-row",
      attr: { "data-testid": "atomic-color-swatch-row" },
    });
    for (const color of activity.colors) {
      const swatch = row.createDiv({
        cls: "atomic-color-swatch",
        attr: { "data-testid": "atomic-color-swatch" },
      });
      swatch.style.backgroundColor = color;
      swatch.title = color;
    }
  }

  private confirmDeleteActivity(activity: ActivityType): void {
    const language = this.plugin.settings.language;
    new ConfirmDeleteActivityModal(this.app, {
      message: t("settings.deleteConfirm", language, { label: activity.label }),
      confirmLabel: t("settings.delete", language),
      cancelLabel: t("modal.cancel", language),
      onConfirm: () => {
        void this.deleteActivity(activity);
      },
    }).open();
  }

  private async deleteActivity(activity: ActivityType): Promise<void> {
    this.plugin.settings.activityTypes = this.plugin.settings.activityTypes.filter(
      (candidate) => candidate.id !== activity.id,
    );
    await this.saveAndRefresh();
    this.redrawSettings();
    new Notice(
      t("notice.activityDeleted", this.plugin.settings.language, {
        label: activity.label,
      }),
    );
  }
}
