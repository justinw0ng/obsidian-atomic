import type { Setting } from "obsidian";
import { t, type Language } from "../../i18n";
import type { SettingsRow } from "../../settings";
import type { FitnessSettings, ReaderDefaultOpen } from "../../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { normalizeReaderPreferences } from "./preferences.ts";

export interface ReaderSettingsHost {
  settings: FitnessSettings;
  save(): Promise<void>;
  redisplay(): void;
}

const OPENS: ReaderDefaultOpen[] = ["chooser", "notes", "book"];

async function store(
  host: ReaderSettingsHost,
  patch: Partial<FitnessSettings["reader"]>,
): Promise<void> {
  host.settings.reader = normalizeReaderPreferences({ ...host.settings.reader, ...patch });
  await host.save();
}

export function readerSettingRows(host: ReaderSettingsHost): SettingsRow[] {
  const language = host.settings.language;
  const reader = host.settings.reader;
  return [
    {
      kind: "custom",
      name: t("settings.readerDefaultOpen", language),
      desc: t("settings.readerDefaultOpenDesc", language),
      aliases: ["default open", "reader"],
      paint: (setting) => {
        paintDefaultOpen(setting, host, language, reader.defaultOpen);
      },
    },
    {
      kind: "custom",
      name: t("settings.readerTheater", language),
      desc: t("settings.readerTheaterDesc", language),
      aliases: ["theater"],
      paint: (setting) => {
        setting.settingEl.setAttr("data-testid", "atomic-setting-reader-theater");
        setting.addToggle((toggle) => {
          toggle.setValue(reader.theater).onChange((value) => {
            void store(host, { theater: value });
          });
        });
      },
    },
    {
      kind: "custom",
      name: t("settings.readerEnabled", language),
      desc: t("settings.readerEnabledDesc", language),
      aliases: ["reader"],
      paint: (setting) => {
        setting.settingEl.setAttr("data-testid", "atomic-setting-reader-enabled");
        setting.addToggle((toggle) => {
          toggle.setValue(reader.enabled).onChange((value) => {
            void store(host, { enabled: value });
          });
        });
      },
    },
  ];
}

function paintDefaultOpen(
  setting: Setting,
  host: ReaderSettingsHost,
  language: Language,
  current: ReaderDefaultOpen,
): void {
  setting.settingEl.setAttr("data-testid", "atomic-setting-reader-open");
  setting.addDropdown((dropdown) => {
    for (const option of OPENS) {
      dropdown.addOption(option, t(`settings.readerDefaultOpen.${option}`, language));
    }
    dropdown.setValue(current).onChange((value) => {
      if (value !== "chooser" && value !== "notes" && value !== "book") return;
      void store(host, { defaultOpen: value }).then(() => host.redisplay());
    });
  });
}
