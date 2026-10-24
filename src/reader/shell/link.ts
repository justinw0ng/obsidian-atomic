export type BookFileKind = "epub" | "pdf";

export type BookFileRef = {
  path: string;
  basename: string;
  extension: string;
};

export type LinkedBookFile = {
  kind: BookFileKind;
  path: string;
};

export function normalizeVaultPath(path: string): string {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .replace(/^\//, "")
    .trim();
}

export function bookFileKind(path: string): BookFileKind | null {
  const ext = normalizeVaultPath(path).split(".").pop()?.toLowerCase() ?? "";
  if (ext === "epub" || ext === "pdf") return ext;
  return null;
}

export function bookTitleKey(title: string): string {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function noteBasename(notePath: string): string {
  const file = normalizeVaultPath(notePath).split("/").pop() ?? "";
  return file.replace(/\.md$/i, "");
}

export function vaultDirectory(path: string): string {
  const norm = normalizeVaultPath(path);
  const slash = norm.lastIndexOf("/");
  return slash === -1 ? "" : norm.slice(0, slash);
}

/** Frontmatter `source` may be a vault path or a wikilink. */
export function sourcePathFromFrontmatter(source: unknown): string {
  if (typeof source !== "string") return "";
  let text = source.trim();
  if (text.startsWith("!")) text = text.slice(1).trim();
  const wiki = text.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]$/);
  if (wiki) text = wiki[1].trim();
  return normalizeVaultPath(text);
}

function fileKey(file: BookFileRef): string {
  return bookTitleKey(file.basename);
}

function findByPath(files: readonly BookFileRef[], path: string): BookFileRef | null {
  const norm = normalizeVaultPath(path).toLowerCase();
  for (const file of files) {
    if (normalizeVaultPath(file.path).toLowerCase() === norm) return file;
  }
  return null;
}

function findByBasename(files: readonly BookFileRef[], source: string): BookFileRef | null {
  const base = source.split("/").pop() ?? source;
  const dot = base.lastIndexOf(".");
  const name = bookTitleKey(dot === -1 ? base : base.slice(0, dot));
  const kind = bookFileKind(base);
  if (!name || !kind) return null;
  const matches = files.filter(
    (file) => fileKey(file) === name && file.extension.toLowerCase() === kind,
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Explicit `source` wins. Otherwise an EPUB or PDF whose filename matches
 * the book title (same folder first, EPUB before PDF).
 */
export function resolveLinkedBookFile(input: {
  title: string;
  notePath: string;
  source: unknown;
  files: readonly BookFileRef[];
}): LinkedBookFile | null {
  const files = input.files.filter((file) => bookFileKind(file.path) != null);
  const source = sourcePathFromFrontmatter(input.source);
  const sourceKind = bookFileKind(source);
  if (source && sourceKind) {
    const exact = findByPath(files, source) ?? findByBasename(files, source);
    if (exact) {
      const kind = bookFileKind(exact.path);
      if (kind) return { kind, path: normalizeVaultPath(exact.path) };
    }
  }

  const keys = new Set(
    [input.title, noteBasename(input.notePath)]
      .map((value) => bookTitleKey(value))
      .filter(Boolean),
  );
  const noteDir = vaultDirectory(input.notePath);
  const matches = files.filter((file) => keys.has(fileKey(file)));
  if (!matches.length) return null;
  matches.sort((left, right) => {
    const leftDir = vaultDirectory(left.path) === noteDir ? 0 : 1;
    const rightDir = vaultDirectory(right.path) === noteDir ? 0 : 1;
    if (leftDir !== rightDir) return leftDir - rightDir;
    const leftKind = bookFileKind(left.path) === "epub" ? 0 : 1;
    const rightKind = bookFileKind(right.path) === "epub" ? 0 : 1;
    if (leftKind !== rightKind) return leftKind - rightKind;
    return left.path.localeCompare(right.path);
  });
  const best = matches[0];
  const kind = bookFileKind(best.path);
  if (!kind) return null;
  return { kind, path: normalizeVaultPath(best.path) };
}

export function chooserShowsOpenBook(file: LinkedBookFile | null): boolean {
  return file != null;
}
