/** Pure vault-relative folder validation (no Obsidian imports). */

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

function isSafeRelativeSegments(path: string): boolean {
  if (!path || path === "/") return false;
  if (path.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(path)) return false;

  const segments = path.split("/");
  if (segments.length === 0) return false;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return false;
  }
  return true;
}

/**
 * Returns true when `folder` is a non-empty vault-relative path with no
 * `.` / `..` segments and no absolute/drive prefix.
 */
export function isSafeVaultFolder(folder: string): boolean {
  if (typeof folder !== "string") return false;
  const trimmed = folder.trim();
  if (!trimmed) return false;

  const normalized = normalizeSlashes(trimmed).replace(/\/$/, "");
  return isSafeRelativeSegments(normalized);
}

/**
 * True when `path` is a vault-relative markdown note (`.md`) with no
 * `.` / `..` segments and no absolute/drive prefix.
 */
export function isSafeVaultNotePath(path: string): boolean {
  if (typeof path !== "string") return false;
  const normalized = normalizeSlashes(path.trim());
  if (!normalized.endsWith(".md")) return false;
  if (normalized.endsWith("/.md")) return false;
  return isSafeRelativeSegments(normalized);
}

/**
 * Join a vault folder (empty = vault root) with a markdown note path.
 * Returns null when the folder or the result is not a safe vault note.
 */
export function joinVaultNotePath(folder: string, notePath: string): string | null {
  const leaf = normalizeSlashes(notePath.trim()).replace(/^\/+/, "");
  const base = normalizeSlashes(folder.trim()).replace(/\/+$/, "");
  if (base && !isSafeVaultFolder(base)) return null;
  const path = base ? `${base}/${leaf}` : leaf;
  return isSafeVaultNotePath(path) ? path : null;
}

/**
 * Boundary-safe scan prefix `{folder}/{year}/`, or null if folder is unsafe.
 * Trailing slash prevents matching sibling path prefixes.
 */
export function sessionScanPrefix(
  folder: string,
  year: number,
): string | null {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/${year}/`;
}

export function readingItemsFolder(folder: string): string | null {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/Items`;
}

export function hobbyItemsScanPrefix(folder: string): string | null {
  const itemsFolder = readingItemsFolder(folder);
  return itemsFolder ? `${itemsFolder}/` : null;
}

function normalizeVaultPath(path: string): string {
  return normalizeSlashes(path.trim()).replace(/\/$/, "");
}

/**
 * True when `path` is the scope, a descendant of it, or an ancestor of it.
 * Used to drop folder-scoped list caches after a vault path change.
 */
export function pathTouchesScope(path: string, scope: string): boolean {
  if (!path || !scope) return false;
  const p = normalizeVaultPath(path);
  const s = normalizeVaultPath(scope);
  if (!p || !s) return false;
  return p === s || p.startsWith(`${s}/`) || s.startsWith(`${p}/`);
}
