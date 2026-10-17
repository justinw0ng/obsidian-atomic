// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_READER_SIZE, READER_SIZE_FRONTMATTER_KEY, parseReaderSize, type ReaderSizeId } from "./geometry.ts";

const KEY_LINE = /^reader\.size\s*:(.*)$/;

/**
 * Read `reader.size` from a book note. Missing or unknown values are M.
 * Only the frontmatter fence is consulted.
 */
export function readReaderSize(markdown: string): ReaderSizeId {
  const fence = splitFrontmatter(String(markdown ?? ""));
  if (!fence) return DEFAULT_READER_SIZE;
  for (let index = 1; index < fence.end; index += 1) {
    const match = fence.lines[index].match(KEY_LINE);
    if (!match) continue;
    return parseReaderSize(firstScalarToken(match[1]));
  }
  return DEFAULT_READER_SIZE;
}

/**
 * Read `reader.size` from an Obsidian frontmatter cache.
 * The cache key is the flat name `reader.size`.
 */
export function readReaderSizeFromRecord(
  frontmatter: Record<string, unknown> | null | undefined,
): ReaderSizeId {
  if (!frontmatter) return DEFAULT_READER_SIZE;
  return parseReaderSize(frontmatter[READER_SIZE_FRONTMATTER_KEY]);
}

/**
 * Write `reader.size` into the book note. Other frontmatter keys and the
 * body stay as they were. Theater must not call this with XL merely because
 * the locked page is XL.
 */
export function writeReaderSize(markdown: string, size: ReaderSizeId): string {
  const text = String(markdown ?? "");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `${READER_SIZE_FRONTMATTER_KEY}: ${size}`;
  const fence = splitFrontmatter(text);
  if (!fence) {
    const body = text.replace(/^\uFEFF?/, "");
    const spacer = body.length === 0 || body.startsWith(nl) ? "" : nl;
    return `---${nl}${line}${nl}---${nl}${spacer}${body}`;
  }

  let replaced = false;
  const next: string[] = [];
  for (let index = 0; index < fence.lines.length; index += 1) {
    if (index === fence.end && !replaced) next.push(line);
    if (index > 0 && index < fence.end && KEY_LINE.test(fence.lines[index])) {
      if (!replaced) next.push(line);
      replaced = true;
      continue;
    }
    next.push(fence.lines[index]);
  }
  syncNestedReaderSize(next, size);
  return ensureTrailingNewline(next.join(nl), nl);
}

/**
 * The shell prefers a nested `size` under `reader:` over the flat key.
 * When that line is already present, keep it on the same value.
 */
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

function splitFrontmatter(markdown: string): { lines: string[]; end: number } | null {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.replace(/^\uFEFF/, "").trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") return { lines, end: index };
  }
  return null;
}

function firstScalarToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "|" || trimmed === ">") return "";
  const comment = trimmed.search(/(^|\s)#/);
  const withoutComment = comment === -1 ? trimmed : trimmed.slice(0, comment).trim();
  return unquoteYamlScalar(withoutComment).split(/\s+/)[0] ?? "";
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim().replace(/,$/, "");
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function ensureTrailingNewline(markdown: string, nl: string): string {
  if (markdown.endsWith(nl)) return markdown;
  return `${markdown}${nl}`;
}
