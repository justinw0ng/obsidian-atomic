/** Read Daily Notes and Templates core plugin options without importing `obsidian`. */

// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_DAILY_NOTE_FORMAT } from "../core/daily-note.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "./record.ts";

export type DailyNotesCoreSettings = {
  folder: string;
  format: string;
  template: string;
};

export type TemplatesCoreSettings = {
  folder: string;
};

function callPluginIdLookup(method: unknown, self: object, id: string): unknown {
  if (typeof method !== "function") return undefined;
  return (method as (this: object, pluginId: string) => unknown).call(self, id);
}

function unwrapPluginInstance(plugin: unknown): unknown {
  if (!isRecord(plugin)) return undefined;
  if (isRecord(plugin.instance)) return plugin.instance;
  if ("options" in plugin || typeof plugin.getFormat === "function") return plugin;
  return undefined;
}

function readInternalPluginInstance(app: unknown, id: string): unknown {
  if (!isRecord(app)) return undefined;
  const internalPlugins = app.internalPlugins;
  if (!isRecord(internalPlugins)) return undefined;

  try {
    const enabled = callPluginIdLookup(
      internalPlugins.getEnabledPluginById,
      internalPlugins,
      id,
    );
    const fromEnabled = unwrapPluginInstance(enabled);
    if (fromEnabled != null) return fromEnabled;
  } catch {
    // Fall through to other probes.
  }

  try {
    const plugin = callPluginIdLookup(
      internalPlugins.getPluginById,
      internalPlugins,
      id,
    );
    const fromId = unwrapPluginInstance(plugin);
    if (fromId != null) return fromId;
  } catch {
    // Fall through to the plugins map.
  }

  if (isRecord(internalPlugins.plugins)) {
    return unwrapPluginInstance(internalPlugins.plugins[id]);
  }
  return undefined;
}

function readStringOption(options: unknown, key: string): string {
  if (!isRecord(options)) return "";
  const value = options[key];
  return typeof value === "string" ? value.trim() : "";
}

function readDailyNotesFormat(instance: unknown, options: unknown): string {
  const fromOptions = readStringOption(options, "format");
  if (fromOptions) return fromOptions;
  if (!isRecord(instance)) return DEFAULT_DAILY_NOTE_FORMAT;
  const getFormat = instance.getFormat;
  if (typeof getFormat !== "function") return DEFAULT_DAILY_NOTE_FORMAT;
  try {
    const format = (getFormat as (this: object) => unknown).call(instance);
    return typeof format === "string" && format.trim()
      ? format.trim()
      : DEFAULT_DAILY_NOTE_FORMAT;
  } catch {
    return DEFAULT_DAILY_NOTE_FORMAT;
  }
}

export function readDailyNotesCoreSettings(app: unknown): DailyNotesCoreSettings {
  const instance = readInternalPluginInstance(app, "daily-notes");
  const options = isRecord(instance) ? instance.options : undefined;
  return {
    folder: readStringOption(options, "folder"),
    format: readDailyNotesFormat(instance, options),
    template: readStringOption(options, "template"),
  };
}

export function readTemplatesCoreSettings(app: unknown): TemplatesCoreSettings {
  const instance = readInternalPluginInstance(app, "templates");
  const options = isRecord(instance) ? instance.options : undefined;
  return {
    folder: readStringOption(options, "folder"),
  };
}
