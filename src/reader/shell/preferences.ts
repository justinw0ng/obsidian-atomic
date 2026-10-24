// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_READER_PREFERENCES, type ReaderDefaultOpen, type ReaderPreferences } from "../../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "../../util/record.ts";

export function normalizeReaderPreferences(raw: unknown): ReaderPreferences {
  if (!isRecord(raw)) return { ...DEFAULT_READER_PREFERENCES };
  return {
    defaultOpen: readerDefaultOpen(raw.defaultOpen),
    theater: raw.theater === true,
    enabled: raw.enabled !== false,
  };
}

function readerDefaultOpen(value: unknown): ReaderDefaultOpen {
  switch (value) {
    case "chooser":
    case "notes":
    case "book":
      return value;
    default:
      return "chooser";
  }
}
