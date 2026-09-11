import { App, TFile, TFolder, normalizePath } from "obsidian";
import { parseReminders, parseSetTable, type SetRow } from "../core";
import {
  parseTimeLog,
  type TimeLogEntry,
} from "../core/hobby";
import type { ActivityType, DayActivity, HobbyItemMeta, SessionMeta } from "../types";
import { durationMapFromHobbyLogs, durationMapFromSessions } from "../util/duration-map";
import { markdownFilesInFolder, type VaultFolderLike } from "../util/folder-files";
import { hobbyItemFromFileCache } from "../util/hobby-item-scan";
import { NoteParseCache } from "../util/note-parse-cache";
import { sessionMetaFromFile } from "../util/session-meta";
import { VaultListCache } from "../util/vault-list-cache";
import {
  hobbyItemsScanPrefix,
  isSafeVaultFolder,
  sessionScanPrefix,
} from "../util/vault-path";

const EMPTY_TIME_LOG: TimeLogEntry[] = [];
const EMPTY_SET_ROWS: SetRow[] = [];
const EMPTY_REMINDERS: string[] = [];

export class VaultDataSource {
  private readonly timeLogCache = new NoteParseCache<TimeLogEntry[]>();
  private readonly setTableCache = new NoteParseCache<SetRow[]>();
  private readonly reminderCache = new NoteParseCache<string[]>();
  private readonly noteParseCaches: readonly NoteParseCache<unknown>[] = [
    this.timeLogCache,
    this.setTableCache,
    this.reminderCache,
  ];
  private readonly sessionListCache = new VaultListCache<SessionMeta[]>();
  private readonly hobbyItemListCache = new VaultListCache<HobbyItemMeta[]>();
  private readonly durationMapCache = new VaultListCache<Map<string, DayActivity>>();
  private readonly needsMetadataRefreshPrefixes = new Set<string>();

  constructor(private app: App) {}

  /** Drop cached note parses (all paths, or one path after edit/delete). */
  invalidateNoteParseCaches(path?: string): void {
    const scoped = path ? normalizePath(path) : undefined;
    for (const cache of this.noteParseCaches) cache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }

  /** Keep parse cache entries aligned when a note is renamed. */
  renameNoteParseCaches(oldPath: string, newPath: string): void {
    const from = normalizePath(oldPath);
    const to = normalizePath(newPath);
    for (const cache of this.noteParseCaches) cache.rename(from, to);
  }

  /** Drop cached vault list scans (sessions / hobby items / duration maps). */
  invalidateListCache(path?: string): void {
    const scoped = path ? normalizePath(path) : undefined;
    this.sessionListCache.invalidate(scoped);
    this.hobbyItemListCache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }

  /**
   * Invalidate list caches for scan prefixes whose `getFileCache()` was null
   * (index not ready). Returns true when at least one prefix was consumed.
   * Empty frontmatter on an existing cache does not record a prefix.
   */
  invalidateUnreadyPrefixes(): boolean {
    const prefixes = [...this.needsMetadataRefreshPrefixes];
    this.needsMetadataRefreshPrefixes.clear();
    if (!prefixes.length) return false;
    for (const prefix of prefixes) this.invalidateListCache(prefix);
    return true;
  }

  /**
   * Parsed Time log entries for a hobby item note.
   * Reuses an in-memory parse while the file mtime is unchanged.
   */
  getHobbyTimeLogEntries(path: string): Promise<TimeLogEntry[]> {
    return this.parsedNote(this.timeLogCache, path, parseTimeLog, EMPTY_TIME_LOG);
  }

  /** Parsed set-table rows of a session note; same mtime reuse as Time logs. */
  getSessionSetRows(path: string): Promise<SetRow[]> {
    return this.parsedNote(this.setTableCache, path, parseSetTable, EMPTY_SET_ROWS);
  }

  /** Reminder bullets of a session note; same mtime reuse as Time logs. */
  getSessionReminders(path: string): Promise<string[]> {
    return this.parsedNote(this.reminderCache, path, parseReminders, EMPTY_REMINDERS);
  }

  /**
   * One parsed view of a note, reused while its mtime is unchanged. Reads go
   * through `cachedRead`: these values are displayed, never written back.
   */
  private parsedNote<T>(
    cache: NoteParseCache<T>,
    path: string,
    parse: (markdown: string) => T,
    empty: T,
  ): Promise<T> {
    const file = this.getFileByPath(path);
    if (!file) return Promise.resolve(empty);
    return cache.resolve(file.path, file.stat.mtime, async () =>
      parse(await this.app.vault.cachedRead(file)),
    );
  }

  listSessions(folder: string, year: number): SessionMeta[] {
    const prefix = sessionScanPrefix(folder, year);
    if (!prefix) return [];
    const cached = this.sessionListCache.get(prefix);
    if (cached) return cached;

    const out: SessionMeta[] = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file, prefix);
      out.push(
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: cache == null ? undefined : (cache.frontmatter ?? {}),
        }),
      );
    }
    this.sessionListCache.set(prefix, out, prefix);
    return out;
  }

  listHobbyItems(activity: ActivityType): HobbyItemMeta[] {
    if (
      activity.domain !== "hobby" ||
      activity.noteModel !== "item" ||
      !activity.supportsTimer
    ) {
      return [];
    }
    const prefix = hobbyItemsScanPrefix(activity.folder);
    if (!prefix) return [];
    const cacheKey = `${activity.id}\0${prefix}`;
    const cached = this.hobbyItemListCache.get(cacheKey);
    if (cached) return cached;

    const out: HobbyItemMeta[] = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file, prefix);
      const item = hobbyItemFromFileCache({
        path: file.path,
        basename: file.basename,
        frontmatter: cache == null ? null : (cache.frontmatter ?? {}),
        activityId: activity.id,
      });
      if (item) out.push(item);
    }
    this.hobbyItemListCache.set(cacheKey, out, prefix);
    return out;
  }

  /**
   * Minutes-by-date for one activity/year. Shared by every heatmap that
   * asks for the same pair until a touching vault path invalidates it.
   */
  async getActivityDurationMap(
    activity: ActivityType,
    year: number,
  ): Promise<Map<string, DayActivity>> {
    const prefix =
      activity.domain === "hobby"
        ? hobbyItemsScanPrefix(activity.folder)
        : sessionScanPrefix(activity.folder, year);
    if (!prefix) return new Map();
    const cacheKey = `${activity.id}\0${prefix}\0${year}`;
    const cached = this.durationMapCache.get(cacheKey);
    if (cached) return cached;

    if (activity.domain === "hobby") {
      const items = this.listHobbyItems(activity);
      const perItem = await Promise.all(
        items.map(async (item) => ({
          path: item.path,
          entries: await this.getHobbyTimeLogEntries(item.path),
        })),
      );
      const map = durationMapFromHobbyLogs(perItem, year);
      this.durationMapCache.set(cacheKey, map, prefix);
      return map;
    }

    const map = durationMapFromSessions(this.listSessions(activity.folder, year));
    this.durationMapCache.set(cacheKey, map, prefix);
    return map;
  }

  /** Fresh disk read. Use before deciding on or composing a write. */
  async readBody(path: string): Promise<string> {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(af instanceof TFile)) return "";
    return this.app.vault.read(af);
  }

  /** Display-only read served from Obsidian's content cache when unchanged. */
  async readCachedBody(path: string): Promise<string> {
    const file = this.getFileByPath(path);
    if (!file) return "";
    return this.app.vault.cachedRead(file);
  }

  exists(path: string): boolean {
    return !!this.app.vault.getAbstractFileByPath(normalizePath(path));
  }

  async ensureFolder(folderPath: string): Promise<void> {
    const norm = normalizePath(folderPath);
    if (this.app.vault.getAbstractFileByPath(norm)) return;
    const parts = norm.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }

  async createNote(path: string, content: string): Promise<TFile> {
    const norm = normalizePath(path);
    const parent = norm.includes("/")
      ? norm.slice(0, norm.lastIndexOf("/"))
      : "";
    if (parent) await this.ensureFolder(parent);
    return this.app.vault.create(norm, content);
  }

  async writeNote(path: string, content: string): Promise<TFile> {
    const norm = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(norm);
    if (existing instanceof TFile) {
      await this.app.vault.process(existing, () => content);
      return existing;
    }
    return this.createNote(norm, content);
  }

  /**
   * Apply an updater to the current file bytes. Returns null when the path
   * is missing. Unchanged content is returned as-is so callers can skip a rewrite.
   */
  async processNote(
    path: string,
    updater: (current: string) => string,
  ): Promise<TFile | null> {
    const existing = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(existing instanceof TFile)) return null;
    await this.app.vault.process(existing, updater);
    return existing;
  }

  async openPath(path: string): Promise<void> {
    const norm = normalizePath(path);
    const file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    // Create-on-open not desired; open via link text for missing files
    await this.app.workspace.openLinkText(norm, "", false);
  }

  getFileByPath(path: string): TFile | null {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFile ? af : null;
  }

  getFolder(path: string): TFolder | null {
    const af = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return af instanceof TFolder ? af : null;
  }

  listMarkdownInFolder(folder: string): TFile[] {
    if (!isSafeVaultFolder(folder)) return [];
    return this.markdownNotesInFolder(folder);
  }

  /** Resolve a vault path/wikilink target (or absolute URL) into an img src. */
  resolveResourcePath(linkOrPath: string, sourcePath = ""): string | null {
    const trimmed = linkOrPath.trim();
    if (!trimmed) return null;
    if (/^(javascript|vbscript):/i.test(trimmed)) return null;
    if (/^data:/i.test(trimmed)) {
      if (!/^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i.test(trimmed)) {
        return null;
      }
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed) || /^app:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const fromLink = this.app.metadataCache.getFirstLinkpathDest(
      trimmed,
      sourcePath,
    );
    const fromPath = this.app.vault.getAbstractFileByPath(normalizePath(trimmed));
    const file =
      fromLink instanceof TFile
        ? fromLink
        : fromPath instanceof TFile
          ? fromPath
          : null;
    if (!file) return null;
    return this.app.vault.getResourcePath(file);
  }

  private markdownNotesInFolder(folderPath: string): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(normalizePath(folderPath));
    return markdownFilesInFolder(asFolderLike(folder)) as TFile[];
  }

  private fileCache(
    file: TFile,
    scanPrefix: string,
  ): { frontmatter?: Record<string, unknown> } | null {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache == null) this.needsMetadataRefreshPrefixes.add(scanPrefix);
    return cache;
  }
}

function asFolderLike(node: unknown): VaultFolderLike | null {
  if (!node || typeof node !== "object") return null;
  if (!("children" in node) || !Array.isArray((node as VaultFolderLike).children)) {
    return null;
  }
  return node as VaultFolderLike;
}
