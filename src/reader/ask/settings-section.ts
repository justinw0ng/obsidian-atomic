import {
  Notice,
  requireApiVersion,
  SecretComponent,
  type App,
  type Setting,
} from "obsidian";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../../i18n/index.ts";
import type { SettingsRow } from "../../settings.ts";
import type { FitnessSettings } from "../../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { obsidianHttpPort, obsidianSecretPort } from "./obsidian-port.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { probeAsk } from "./ask.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isAskProvider, normalizeAskSettings, type AskProviderId, type AskSettings } from "./settings-record.ts";

const SECRET_API = "1.11.4";

export interface AskSettingsHost {
  app: App;
  settings: FitnessSettings;
  save(): Promise<void>;
  redisplay(): void;
}

let replacingSecret = false;

async function storeAsk(host: AskSettingsHost, ask: AskSettings): Promise<void> {
  host.settings.ask = normalizeAskSettings(ask);
  await host.save();
}

function secretIsPresent(app: App, name: string): boolean {
  if (!requireApiVersion(SECRET_API)) return false;
  if (!name) return false;
  const value = app.secretStorage.getSecret(name);
  return typeof value === "string" && value.length > 0;
}

function paintStored(setting: Setting, host: AskSettingsHost, language: Language, name: string): void {
  const present = secretIsPresent(host.app, name);
  setting.setName(t("settings.askKey", language));
  setting.setDesc(
    present
      ? `${t("settings.askStored", language)} ${t("settings.askNameHint", language, { name })}`
      : t("settings.askMissingOnDevice", language, { name }),
  );
  setting.settingEl.setAttr("data-testid", "atomic-setting-ask-key");
  setting.controlEl.createSpan({
    cls: "atomic-secret-mask",
    text: "••••••••••••••••",
    attr: {
      "data-testid": "atomic-setting-ask-mask",
      "aria-label": t("settings.askMask", language),
    },
  });
  setting.addButton((button) => {
    button.setButtonText(t("settings.askReplace", language)).onClick(() => {
      replacingSecret = true;
      host.redisplay();
    });
  });
  setting.addButton((button) => {
    button.setButtonText(t("settings.askRemove", language)).onClick(() => {
      replacingSecret = false;
      void storeAsk(host, { ...host.settings.ask, secretName: "" }).then(() => {
        new Notice(t("notice.askRemoved", language));
        host.redisplay();
      });
    });
  });
  if (!present) return;
  setting.addButton((button) => {
    button.setButtonText(t("settings.askTest", language)).onClick(() => {
      void testSecret(host, language);
    });
  });
}

function paintPicker(setting: Setting, host: AskSettingsHost, language: Language): void {
  if (!requireApiVersion(SECRET_API)) return;
  setting.setName(t("settings.askPick", language));
  setting.setDesc(t("settings.askPickDesc", language));
  setting.settingEl.setAttr("data-testid", "atomic-setting-ask-pick");
  setting.addComponent((el) => {
    return new SecretComponent(host.app, el)
      .setValue(host.settings.ask.secretName)
      .onChange((value) => {
        const secretName = typeof value === "string" ? value : "";
        replacingSecret = false;
        void storeAsk(host, { ...host.settings.ask, secretName }).then(() => {
          if (secretName) new Notice(t("notice.askSaved", language));
          host.redisplay();
        });
      });
  });
}

async function testSecret(host: AskSettingsHost, language: Language): Promise<void> {
  const secrets = obsidianSecretPort(host.app);
  if (!secrets) {
    new Notice(t("settings.askUpdate", language));
    return;
  }
  const result = await probeAsk(host.settings.ask, secrets, obsidianHttpPort());
  switch (result) {
    case "ok":
      new Notice(t("notice.askAnswered", language));
      return;
    case "need-secret":
      new Notice(t("notice.askNeedSecret", language));
      return;
    case "bad-url":
      new Notice(t("notice.askInvalidUrl", language));
      return;
    case "provider-error":
      new Notice(t("notice.askFailed", language));
      return;
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

function providerRow(host: AskSettingsHost, language: Language, enabled: boolean): SettingsRow {
  return {
    kind: "custom",
    name: t("settings.askProvider", language),
    desc: t("settings.askProviderDesc", language),
    paint: (setting) => {
      setting.addDropdown((dropdown) => {
        const options: AskProviderId[] = ["openai", "anthropic", "openai-compatible"];
        for (const option of options) {
          dropdown.addOption(option, t(`settings.askProvider.${option}`, language));
        }
        dropdown.setValue(host.settings.ask.provider);
        dropdown.setDisabled(!enabled);
        if (!enabled) return;
        dropdown.onChange((value) => {
          if (!isAskProvider(value)) return;
          void storeAsk(host, { ...host.settings.ask, provider: value }).then(() => {
            host.redisplay();
          });
        });
      });
    },
  };
}

function modelRow(host: AskSettingsHost, language: Language, enabled: boolean): SettingsRow {
  return {
    kind: "custom",
    name: t("settings.askModel", language),
    desc: t("settings.askModelDesc", language),
    paint: (setting) => {
      setting.addText((text) => {
        text.setPlaceholder(host.settings.ask.provider === "anthropic" ? "claude-sonnet-4-5" : "gpt-4.1");
        text.setValue(host.settings.ask.model);
        text.setDisabled(!enabled);
        if (!enabled) return;
        text.onChange((value) => {
          void storeAsk(host, { ...host.settings.ask, model: value });
        });
      });
    },
  };
}

function baseUrlRow(host: AskSettingsHost, language: Language): SettingsRow {
  return {
    kind: "custom",
    name: t("settings.askBaseUrl", language),
    desc: t("settings.askBaseUrlDesc", language),
    paint: (setting) => {
      setting.addText((text) => {
        text.setPlaceholder("http://127.0.0.1:11434/v1");
        text.setValue(host.settings.ask.baseUrl);
        text.onChange((value) => {
          const next = normalizeAskSettings({ ...host.settings.ask, baseUrl: value });
          if (value.trim() && !next.baseUrl) {
            new Notice(t("notice.askInvalidUrl", language));
            return;
          }
          void storeAsk(host, next);
        });
      });
    },
  };
}

export function askSettingRows(host: AskSettingsHost): SettingsRow[] {
  const language = host.settings.language;
  const askOn = requireApiVersion(SECRET_API);
  if (!askOn) {
    return [
      {
        kind: "custom",
        name: t("settings.askUpdate", language),
        desc: `${t("settings.askUpdateDesc", language)} ${t("settings.askStillWorks", language)}`,
        aliases: ["ask"],
        paint: (setting) => {
          setting.settingEl.setAttr("data-testid", "atomic-setting-ask-update");
          setting.settingEl.setAttr("data-ask", "off");
        },
      },
      providerRow(host, language, false),
      modelRow(host, language, false),
    ];
  }
  const rows: SettingsRow[] = [
    {
      kind: "custom",
      name: t("settings.askHeading", language),
      desc: t("settings.askHeadingDesc", language),
      aliases: ["ask", "secret"],
      paint: (setting) => {
        setting.setHeading();
        setting.settingEl.setAttr("data-testid", "atomic-setting-ask");
      },
    },
    providerRow(host, language, true),
    modelRow(host, language, true),
  ];
  if (host.settings.ask.provider === "openai-compatible") {
    rows.push(baseUrlRow(host, language));
  }
  rows.push({
    kind: "custom",
    name: t("settings.askKey", language),
    desc: t("settings.askKeyDesc", language),
    paint: (setting) => {
      const name = host.settings.ask.secretName;
      if (name && !replacingSecret) {
        paintStored(setting, host, language, name);
        return;
      }
      paintPicker(setting, host, language);
    },
  });
  return rows;
}
