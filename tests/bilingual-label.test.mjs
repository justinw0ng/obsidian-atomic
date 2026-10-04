import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLabelEdit,
  labelForLanguage,
  splitCatalogLabel,
} from "../src/util/bilingual-label.ts";

test("splitCatalogLabel stacks a single English / Chinese catalog label", () => {
  assert.deepEqual(splitCatalogLabel("Exercise sessions / 運動次數"), {
    primary: "Exercise sessions",
    secondary: "運動次數",
  });
});

test("labelForLanguage shows one half of a stored activity name", () => {
  assert.equal(labelForLanguage("🏋️ Gym / 健身", "en"), "🏋️ Gym");
  assert.equal(labelForLanguage("🏋️ Gym / 健身", "zh-Hant-en"), "🏋️ 健身");
  assert.equal(labelForLanguage("⛳ Golf / 高爾夫", "zh-Hant-en"), "⛳ 高爾夫");
  assert.equal(labelForLanguage("Reading / 睇書", "en"), "Reading");
  assert.equal(labelForLanguage("Reading / 睇書", "zh-Hant-en"), "睇書");
  assert.equal(labelForLanguage("Chess", "zh-Hant-en"), "Chess");
  assert.equal(labelForLanguage("min / session", "zh-Hant-en"), "min / session");
  assert.equal(
    labelForLanguage("{date} · {done} / {total}", "zh-Hant-en"),
    "{date} · {done} / {total}",
  );
});

test("applyLabelEdit keeps the other language when one half changes", () => {
  assert.equal(
    applyLabelEdit("🏋️ Gym / 健身", "🏋️ 健身房", "zh-Hant-en"),
    "🏋️ Gym / 健身房",
  );
  assert.equal(
    applyLabelEdit("🏋️ Gym / 健身", "🏋️ Weights", "en"),
    "🏋️ Weights / 健身",
  );
  assert.equal(applyLabelEdit("Reading / 睇書", "Books", "en"), "Books / 睇書");
  assert.equal(applyLabelEdit("🏋️ Gym / 健身", "Run", "zh-Hant-en"), "Run");
  assert.equal(applyLabelEdit("Chess", "Chess club", "en"), "Chess club");
  assert.equal(applyLabelEdit("🏋️ Gym / 健身", "   ", "en"), "🏋️ Gym / 健身");
});

test("splitCatalogLabel leaves English and multi-slash sentences intact", () => {
  assert.deepEqual(splitCatalogLabel("Exercise sessions"), {
    primary: "Exercise sessions",
    secondary: null,
  });
  assert.deepEqual(splitCatalogLabel("Total / 總計: 40 min / 分鐘"), {
    primary: "Total / 總計: 40 min / 分鐘",
    secondary: null,
  });
  assert.deepEqual(splitCatalogLabel("good / ok"), {
    primary: "good / ok",
    secondary: null,
  });
});
