// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerSizeId, type ReaderSizeId } from "./model.ts";

export type ReaderNoteFields = {
  source: string;
  page: number;
  size: ReaderSizeId;
  /** Positive `pages:` hint. The opened file's own count wins when it has one. */
  pagesHint: number | null;
  canvas: string;
};

const EMPTY: ReaderNoteFields = {
  source: "",
  page: 1,
  size: "m",
  pagesHint: null,
  canvas: "",
};

function unquote(value: string): string {
  const text = value.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function positiveInt(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(number) || number < 1) return null;
  return Math.trunc(number);
}

function splitFrontmatter(markdown: string): { lines: string[]; endIndex: number } | null {
  const lines = String(markdown ?? "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") return { lines, endIndex: index };
  }
  return null;
}

function finish(lines: string[]): string {
  const text = lines.join("\n");
  return text.endsWith("\n") ? text : `${text}\n`;
}

function field(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function nestedReader(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Read reader fields from Obsidian's parsed frontmatter cache. */
export function readerFieldsFromFrontmatter(
  frontmatter: Record<string, unknown> | null | undefined,
): ReaderNoteFields {
  if (!frontmatter) return { ...EMPTY };
  const reader = nestedReader(field(frontmatter, "reader"));
  const page =
    positiveInt(reader ? field(reader, "page") : undefined) ??
    positiveInt(field(frontmatter, "reader.page")) ??
    1;
  const size = readerSizeId(
    (reader ? field(reader, "size") : undefined) ?? field(frontmatter, "reader.size"),
  );
  const sourceValue = field(frontmatter, "source");
  const canvasValue = field(frontmatter, "related_canvas");
  return {
    source: typeof sourceValue === "string" ? sourceValue.trim() : "",
    page,
    size,
    pagesHint: positiveInt(field(frontmatter, "pages")),
    canvas: typeof canvasValue === "string" ? canvasValue.trim() : "",
  };
}

/** Read the same fields from raw markdown when the cache is not ready. */
export function readReaderNote(markdown: string): ReaderNoteFields {
  const parts = splitFrontmatter(markdown);
  if (!parts) return { ...EMPTY };
  let source = "";
  let page: number | null = null;
  let size: ReaderSizeId | null = null;
  let pagesHint: number | null = null;
  let canvas = "";
  let inReader = false;
  for (let index = 1; index < parts.endIndex; index += 1) {
    const line = parts.lines[index];
    if (inReader) {
      if (!/^\s+/.test(line) || /^\s*$/.test(line)) {
        inReader = false;
      } else {
        const nestedPage = line.match(/^\s+page\s*:\s*(.*)$/);
        if (nestedPage) page = positiveInt(unquote(nestedPage[1])) ?? page;
        const nestedSize = line.match(/^\s+size\s*:\s*(.*)$/);
        if (nestedSize) size = readerSizeId(unquote(nestedSize[1]));
        continue;
      }
    }
    const reader = line.match(/^reader\s*:\s*(.*)$/);
    if (reader) {
      const rest = reader[1].trim();
      if (!rest) {
        inReader = true;
        continue;
      }
      const inlinePage = rest.match(/page\s*:\s*(\d+)/);
      if (inlinePage) page = positiveInt(inlinePage[1]);
      const inlineSize = rest.match(/size\s*:\s*([A-Za-z]+)/);
      if (inlineSize) size = readerSizeId(inlineSize[1]);
      continue;
    }
    const flatPage = line.match(/^reader\.page\s*:\s*(.*)$/);
    if (flatPage) page = positiveInt(unquote(flatPage[1])) ?? page;
    const flatSize = line.match(/^reader\.size\s*:\s*(.*)$/);
    if (flatSize) size = readerSizeId(unquote(flatSize[1]));
    const sourceLine = line.match(/^source\s*:\s*(.*)$/);
    if (sourceLine) source = unquote(sourceLine[1]);
    const pagesLine = line.match(/^pages\s*:\s*(.*)$/);
    if (pagesLine) pagesHint = positiveInt(unquote(pagesLine[1]));
    const canvasLine = line.match(/^related_canvas\s*:\s*(.*)$/);
    if (canvasLine) canvas = unquote(canvasLine[1]);
  }
  return {
    source,
    page: page ?? 1,
    size: size ?? "m",
    pagesHint,
    canvas,
  };
}

/** Write `reader.page` and keep `reader.size` when it is already there. */
export function updateReaderPage(markdown: string, page: number): string {
  const safe = Math.max(1, Math.trunc(page));
  const text = String(markdown ?? "");
  const parts = splitFrontmatter(text);
  if (!parts) {
    const body = text.replace(/^\n/, "");
    return `---\nreader:\n  page: ${safe}\n---\n\n${body}`;
  }

  const lines = parts.lines.slice();
  const end = () => splitFrontmatter(lines.join("\n"))?.endIndex ?? lines.length - 1;

  let limit = end();
  for (let index = 1; index < limit; index += 1) {
    if (/^reader\.page\s*:/.test(lines[index])) {
      lines[index] = `reader.page: ${safe}`;
      return finish(lines);
    }
  }

  limit = end();
  for (let index = 1; index < limit; index += 1) {
    const match = lines[index].match(/^reader\s*:\s*(.*)$/);
    if (!match) continue;
    const rest = match[1].trim();
    if (rest.startsWith("{")) {
      if (/page\s*:/.test(rest)) {
        lines[index] = lines[index].replace(/page\s*:\s*\d+/, `page: ${safe}`);
      } else {
        lines[index] = lines[index].replace(/\{\s*/, `{ page: ${safe}, `);
      }
      return finish(lines);
    }
    if (rest && rest !== "|" && rest !== ">") continue;
    let cursor = index + 1;
    const blockEnd = end();
    for (; cursor < blockEnd; cursor += 1) {
      if (!/^\s+/.test(lines[cursor])) break;
      if (/^\s+page\s*:/.test(lines[cursor])) {
        const indent = lines[cursor].match(/^\s+/)?.[0] ?? "  ";
        lines[cursor] = `${indent}page: ${safe}`;
        return finish(lines);
      }
    }
    lines.splice(index + 1, 0, `  page: ${safe}`);
    return finish(lines);
  }

  const closing = end();
  lines.splice(closing, 0, "reader:", `  page: ${safe}`);
  return finish(lines);
}

const SIZE_KEY_LINE = /^reader\.size\s*:(.*)$/;

/**
 * Write `reader.size` on the book note. Other keys and the body stay put.
 * A nested `size` under `reader:` is updated only when that line already exists.
 * Theater must not call this just because the locked page is XL.
 */
export function writeReaderSize(markdown: string, size: ReaderSizeId): string {
  const text = String(markdown ?? "");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `reader.size: ${size}`;
  const fence = splitSizeFrontmatter(text);
  if (!fence) {
    const body = text.replace(/^\uFEFF?/, "");
    const spacer = body.length === 0 || body.startsWith(nl) ? "" : nl;
    return `---${nl}${line}${nl}---${nl}${spacer}${body}`;
  }

  let replaced = false;
  const next: string[] = [];
  for (let index = 0; index < fence.lines.length; index += 1) {
    if (index === fence.end && !replaced) next.push(line);
    if (index > 0 && index < fence.end && SIZE_KEY_LINE.test(fence.lines[index])) {
      if (!replaced) next.push(line);
      replaced = true;
      continue;
    }
    next.push(fence.lines[index]);
  }
  syncNestedReaderSize(next, size);
  const joined = next.join(nl);
  return joined.endsWith(nl) ? joined : `${joined}${nl}`;
}

/** The shell prefers a nested `size` under `reader:` over the flat key. */
function syncNestedReaderSize(lines: string[], size: ReaderSizeId): void {
  let end = lines.length;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      end = index;
      break;
    }
  }
  for (let index = 1; index < end; index += 1) {
    const reader = lines[index].match(/^reader\s*:\s*(.*)$/);
    if (!reader) continue;
    const rest = reader[1].trim();
    if (rest.startsWith("{")) {
      if (/size\s*:/.test(rest)) {
        lines[index] = lines[index].replace(/size\s*:\s*[^,}\s]+/, `size: ${size}`);
      }
      continue;
    }
    if (rest && rest !== "|" && rest !== ">") continue;
    for (let cursor = index + 1; cursor < end; cursor += 1) {
      if (!/^\s+/.test(lines[cursor])) break;
      if (!/^\s+size\s*:/.test(lines[cursor])) continue;
      const indent = lines[cursor].match(/^\s+/)?.[0] ?? "  ";
      lines[cursor] = `${indent}size: ${size}`;
    }
  }
}

function splitSizeFrontmatter(markdown: string): { lines: string[]; end: number } | null {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.replace(/^\uFEFF/, "").trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") return { lines, end: index };
  }
  return null;
}
