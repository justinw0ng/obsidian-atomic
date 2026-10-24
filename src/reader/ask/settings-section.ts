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
let probeFailed = false;

function keyState(host: AskSettingsHost): "saved" | "empty" | "error" {
  if (!host.settings.ask.secretName) return "empty";
  if (probeFailed || !secretIsPresent(host.app, host.settings.ask.secretName)) return "error";
  return "saved";
}

function paintKeyState(setting: Setting, host: AskSettingsHost, language: Language): void {
  const state = keyState(host);
  setting.settingEl.setAttr("data-ask-state", state);
  setting.nameEl.createSpan({
    cls: "atomic-secret-pill",
    text: t(`settings.askState.${state}`, language),
    attr: { "data-testid": "atomic-setting-ask-state", "data-state": state },
  });
}

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

function labelOpenStorage(root: HTMLElement, label: string): void {
  const button = root.querySelector("button");
  if (!button) return;
  button.textContent = label;
  button.classList.add("atomic-ask-open");
}

function paintStored(setting: Setting, host: AskSettingsHost, language: Language): void {
  setting.setName(t("settings.askKey", language));
  paintKeyState(setting, host, language);
  const state = keyState(host);
  setting.settingEl.setAttr("data-testid", "atomic-setting-ask-key");
  if (state === "error") {
    setting.setDesc(t("settings.askErrorDesc", language));
    setting.settingEl.createDiv({
      cls: "atomic-ask-error",
      text: t("settings.askErrorBanner", language),
      attr: { "data-testid": "atomic-setting-ask-error" },
    });
    setting.addButton((button) => {
      button.setButtonText(t("settings.askRetry", language)).onClick(() => {
        void testSecret(host, language);
      });
    });
    setting.addButton((button) => {
      button.setButtonText(t("settings.askReplaceKey", language)).onClick(() => {
        replacingSecret = true;
        host.redisplay();
      });
    });
    return;
  }
  setting.setDesc(t("settings.askSavedDesc", language));
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
      probeFailed = false;
      void storeAsk(host, { ...host.settings.ask, secretName: "" }).then(() => {
        new Notice(t("notice.askRemoved", language));
        host.redisplay();
      });
    });
  });
  setting.addButton((button) => {
    button.setButtonText(t("settings.askTest", language)).onClick(() => {
      void testSecret(host, language);
    });
  });
}

function paintPicker(setting: Setting, host: AskSettingsHost, language: Language): void {
  if (!requireApiVersion(SECRET_API)) return;
  const replacing = replacingSecret && host.settings.ask.secretName.length > 0;
  setting.setName(t(replacing ? "settings.askPick" : "settings.askKey", language));
  paintKeyState(setting, host, language);
  setting.setDesc(t(replacing ? "settings.askPickDesc" : "settings.askEmptyDesc", language));
  setting.settingEl.setAttr("data-testid", replacing ? "atomic-setting-ask-pick" : "atomic-setting-ask-key");
  const mount = (parent: HTMLElement): SecretComponent => {
    return new SecretComponent(host.app, parent)
      .setValue(replacing ? host.settings.ask.secretName : "")
      .onChange((value) => {
        const secretName = typeof value === "string" ? value : "";
        replacingSecret = false;
        void storeAsk(host, { ...host.settings.ask, secretName }).then(() => {
          probeFailed = false;
          if (secretName) new Notice(t("notice.askSaved", language));
          host.redisplay();
        });
      });
  };
  if (replacing) {
    setting.addComponent((el) => mount(el));
    return;
  }
  const callout = setting.settingEl.createDiv({
    cls: "atomic-ask-empty",
    attr: { "data-testid": "atomic-setting-ask-empty" },
  });
  callout.createEl("strong", { text: t("settings.askEmptyTitle", language) });
  callout.createEl("p", { text: t("settings.askEmptyBody", language) });
  const action = callout.createDiv({ cls: "atomic-ask-empty-action" });
  mount(action);
  labelOpenStorage(action, t("settings.askOpenStorage", language));
}

async function testSecret(host: AskSettingsHost, language: Language): Promise<void> {
  const secrets = obsidianSecretPort(host.app);
  if (!secrets) {
    new Notice(t("settings.askUpdate", language));
    return;
  }
  const result = await probeAsk(host.settings.ask, secrets, obsidianHttpPort());
  probeFailed = result === "provider-error";
  switch (result) {
    case "ok":
      new Notice(t("notice.askAnswered", language));
      host.redisplay();
      return;
    case "need-secret":
      new Notice(t("notice.askNeedSecret", language));
      host.redisplay();
      return;
    case "bad-url":
      new Notice(t("notice.askInvalidUrl", language));
      host.redisplay();
      return;
    case "provider-error":
      new Notice(t("notice.askFailed", language));
      host.redisplay();
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
        paintStored(setting, host, language);
        return;
      }
      paintPicker(setting, host, language);
    },
  });
  return rows;
}
