import test from "node:test";
import assert from "node:assert/strict";
import { t, isLanguage, DEFAULT_LANGUAGE } from "../src/i18n/index.ts";
import { en } from "../src/i18n/locales/en.ts";
import { zhHantEn } from "../src/i18n/locales/zh-Hant-en.ts";
import { fullDateEn, fullDateZh } from "../src/dates.ts";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { DEFAULT_SETTINGS } from "../src/types.ts";

test("default language is en", () => {
  assert.equal(DEFAULT_LANGUAGE, "en");
  assert.equal(DEFAULT_SETTINGS.language, "en");
  assert.equal(mergeSettings(null).language, "en");
  assert.equal(mergeSettings({}).language, "en");
});

test("isLanguage accepts only en and zh-Hant-en", () => {
  assert.equal(isLanguage("en"), true);
  assert.equal(isLanguage("zh-Hant-en"), true);
  assert.equal(isLanguage("zh-Hans"), false);
  assert.equal(isLanguage("zh"), false);
});

test("mergeSettings rejects unknown language", () => {
  assert.equal(mergeSettings({ language: "zh-Hans" }).language, "en");
  assert.equal(mergeSettings({ language: "en" }).language, "en");
});

test("mergeSettings keeps saved zh-Hant-en", () => {
  assert.equal(mergeSettings({ language: "zh-Hant-en" }).language, "zh-Hant-en");
});

test("locale key parity", () => {
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zhHantEn).sort();
  assert.deepEqual(enKeys, zhKeys);
});

test("t interpolates and falls back", () => {
  assert.match(t("settings.language", "en"), /Language/);
  assert.match(t("notice.created", "en", { path: "Gym/x.md" }), /Gym\/x\.md/);
  assert.equal(t("missing.key.for.test", "en"), "missing.key.for.test");
});

test("language option labels exist", () => {
  assert.ok(en["settings.languageOption.zh-Hant-en"]);
  assert.ok(en["settings.languageOption.en"]);
  assert.ok(zhHantEn["settings.languageOption.zh-Hant-en"]);
});

test("english catalog drops the Chinese half", () => {
  assert.equal(en["settings.timezone"], "Timezone");
  assert.equal(en["view.today.title"], "🗂️ Today’s sessions");
  assert.doesNotMatch(en["settings.timezone"], /\/|時區/);
});

test("date formatting respects language", () => {
  assert.equal(fullDateEn(2026, 1, 1), "Jan 1");
  assert.match(fullDateZh(2026, 1, 1), /1/);
});
