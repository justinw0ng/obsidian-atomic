import test from "node:test";
import assert from "node:assert/strict";
import {
  readDailyNotesCoreSettings,
  readTemplatesCoreSettings,
} from "../src/util/core-plugin-options.ts";

test("core plugin settings fall back to Obsidian defaults when unset", () => {
  assert.deepEqual(readDailyNotesCoreSettings({}), {
    folder: "",
    format: "YYYY-MM-DD",
    template: "",
  });
  assert.deepEqual(readTemplatesCoreSettings({}), { folder: "" });
});

test("readDailyNotesCoreSettings prefers getEnabledPluginById options", () => {
  assert.deepEqual(
    readDailyNotesCoreSettings({
      internalPlugins: {
        getEnabledPluginById: (id) =>
          id === "daily-notes"
            ? { options: { folder: "Journal", format: "YYYY/MM/DD", template: "Snippets/Daily" } }
            : null,
      },
    }),
    {
      folder: "Journal",
      format: "YYYY/MM/DD",
      template: "Snippets/Daily",
    },
  );
});

test("readDailyNotesCoreSettings calls getFormat with the plugin instance as this", () => {
  assert.deepEqual(
    readDailyNotesCoreSettings({
      internalPlugins: {
        getEnabledPluginById: (id) =>
          id === "daily-notes"
            ? {
                options: { folder: "", template: "" },
                getFormat() {
                  return this.options.format || "from-this";
                },
              }
            : null,
      },
    }),
    {
      folder: "",
      format: "from-this",
      template: "",
    },
  );
});

test("readDailyNotesCoreSettings unwraps getPluginById instance and getFormat", () => {
  assert.deepEqual(
    readDailyNotesCoreSettings({
      internalPlugins: {
        getEnabledPluginById: () => null,
        getPluginById: (id) =>
          id === "daily-notes"
            ? {
                instance: {
                  options: { folder: "  Log  ", template: "  Host  " },
                  getFormat: () => "YYYY-MM-DD ddd",
                },
              }
            : null,
      },
    }),
    {
      folder: "Log",
      format: "YYYY-MM-DD ddd",
      template: "Host",
    },
  );
});

test("readDailyNotesCoreSettings reads the plugins map when lookups are missing", () => {
  assert.deepEqual(
    readDailyNotesCoreSettings({
      internalPlugins: {
        plugins: {
          "daily-notes": {
            instance: { options: { folder: "Diary", format: "", template: "" } },
          },
        },
      },
    }),
    {
      folder: "Diary",
      format: "YYYY-MM-DD",
      template: "",
    },
  );
});

test("readTemplatesCoreSettings reads the Templates folder", () => {
  assert.deepEqual(
    readTemplatesCoreSettings({
      internalPlugins: {
        getEnabledPluginById: (id) =>
          id === "templates" ? { options: { folder: "Snippets" } } : null,
      },
    }),
    { folder: "Snippets" },
  );
  assert.deepEqual(
    readTemplatesCoreSettings({
      internalPlugins: {
        getEnabledPluginById: () => null,
        plugins: { templates: { instance: { options: { folder: "" } } } },
      },
    }),
    { folder: "" },
  );
});
