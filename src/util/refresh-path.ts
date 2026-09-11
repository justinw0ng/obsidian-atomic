/** Pure vault path checks for refresh gating (no Obsidian imports). */

import type { FitnessSettings } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultFolder, normalizeSlashes } from "./vault-path.ts";

function normalizeVaultPath(path: string): string {
  return normalizeSlashes(path.trim());
}

function parentFolder(filePath: string): string | null {
  const norm = normalizeVaultPath(filePath);
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  const parent = norm.slice(0, idx);
  return isSafeVaultFolder(parent) ? parent : null;
}

export type AtomicDataRoots = {
  /** Normalized, no trailing slash. */
  folderRoots: string[];
  /** Normalized vault file paths. */
  filePaths: string[];
};

/**
 * Folder roots and exact file paths that can affect Atomic plugin data or views.
 * Output is normalized once so {@link pathAffectsAtomicRefresh} can compare directly.
 */
export function collectAtomicDataRoots(settings: FitnessSettings): AtomicDataRoots {
  const folderRoots = new Set<string>(["atomics"]);
  const filePaths = new Set<string>();

  for (const activity of settings.activityTypes) {
    if (isSafeVaultFolder(activity.folder)) {
      folderRoots.add(normalizeVaultPath(activity.folder).replace(/\/$/, ""));
    }
  }

  for (const configured of [
    settings.dashboardPath,
    settings.golfCuesPath,
    settings.gymCuesPath,
  ]) {
    const norm = normalizeVaultPath(configured);
    if (!norm) continue;
    filePaths.add(norm);
    const parent = parentFolder(norm);
    if (parent) folderRoots.add(parent);
  }

  return {
    folderRoots: [...folderRoots],
    filePaths: [...filePaths],
  };
}

function isUnderFolderRoot(normPath: string, normRoot: string): boolean {
  return normPath === normRoot || normPath.startsWith(`${normRoot}/`);
}

/**
 * True when a vault path change could affect Atomic data or a live block host note.
 * `roots` must come from {@link collectAtomicDataRoots}; `liveBlockSourcePaths`
 * are Obsidian source paths, which are already normalized.
 */
export function pathAffectsAtomicRefresh(
  path: string,
  roots: AtomicDataRoots,
  liveBlockSourcePaths: string[],
): boolean {
  const norm = normalizeVaultPath(path);
  if (!norm) return false;

  if (liveBlockSourcePaths.includes(norm)) return true;
  if (roots.filePaths.includes(norm)) return true;
  return roots.folderRoots.some((root) => isUnderFolderRoot(norm, root));
}
