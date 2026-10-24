import { Notice, TFile, type WorkspaceLeaf } from "obsidian";
import type FitnessPlugin from "../../main";
import { t } from "../../i18n";
import { readReaderNote } from "./frontmatter";
import { isPhoneReaderLayout } from "./model";
import { bookFileKind, resolveLinkedBookFile, type BookFileRef, type LinkedBookFile } from "./link";
import type { ReaderOpenRequest } from "./mount";
import { closeBookChooser, openBookChooser as mountBookChooser } from "./chooser";
import { ATOMIC_READER_VIEW } from "./view";
import type { BookChooserRequest } from "./present";

export type { ReaderOpenRequest };

function bookFiles(plugin: FitnessPlugin): BookFileRef[] {
  const out: BookFileRef[] = [];
  for (const file of plugin.app.vault.getFiles()) {
    const kind = bookFileKind(file.path);
    if (!kind) continue;
    out.push({ path: file.path, basename: file.basename, extension: file.extension });
  }
  return out;
}

function frontmatterOf(plugin: FitnessPlugin, path: string): Record<string, unknown> {
  const file = plugin.data.getFileByPath(path);
  if (!file) return {};
  const cache = plugin.app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? {};
}

function linkedFile(
  plugin: FitnessPlugin,
  notePath: string,
  title: string,
): LinkedBookFile | null {
  const frontmatter = frontmatterOf(plugin, notePath);
  return resolveLinkedBookFile({
    title,
    notePath,
    source: frontmatter.source,
    files: bookFiles(plugin),
  });
}

async function savedReaderPage(plugin: FitnessPlugin, notePath: string): Promise<number> {
  const file = plugin.data.getFileByPath(notePath);
  if (!(file instanceof TFile)) return 1;
  try {
    return readReaderNote(await plugin.app.vault.cachedRead(file)).page;
  } catch {
    return 1;
  }
}

export async function openReaderDirect(
  plugin: FitnessPlugin,
  request: ReaderOpenRequest,
): Promise<void> {
  const page = request.page ?? (await savedReaderPage(plugin, request.notePath));
  const leaf: WorkspaceLeaf = plugin.app.workspace.getLeaf(false);
  await leaf.setViewState({
    type: ATOMIC_READER_VIEW,
    active: true,
    state: {
      notePath: request.notePath,
      filePath: request.filePath,
      title: request.title,
      kind: request.kind,
      returnPath: request.returnPath,
      coverRect: request.coverRect,
      page,
    },
  });
  plugin.app.workspace.revealLeaf(leaf);
}

async function openLinkedBook(
  plugin: FitnessPlugin,
  request: ReaderOpenRequest,
): Promise<void> {
  if (!plugin.settings.reader.enabled) {
    new Notice(t("notice.readerOff", plugin.settings.language));
    return;
  }
  const page = request.page ?? (await savedReaderPage(plugin, request.notePath));
  await openReaderDirect(plugin, { ...request, page });
}

export async function openBookChooser(
  plugin: FitnessPlugin,
  request: BookChooserRequest,
): Promise<void> {
  const language = plugin.settings.language;
  if (!plugin.settings.reader.enabled) {
    new Notice(t("notice.readerOff", language));
    return;
  }
  const file = linkedFile(plugin, request.notePath, request.title);
  const width = request.ownerDocument.defaultView?.innerWidth ?? activeWindow.innerWidth;
  const returnPath = plugin.app.workspace.getActiveFile()?.path || request.notePath;
  if (plugin.settings.reader.defaultOpen === "notes") {
    void plugin.data.openPath(request.notePath);
    return;
  }
  if (plugin.settings.reader.defaultOpen === "book" && file) {
    void openLinkedBook(plugin, {
      notePath: request.notePath,
      filePath: file.path,
      title: request.title,
      kind: file.kind,
      returnPath,
      coverRect: request.coverRect,
    });
    return;
  }
  mountBookChooser({
    ownerDocument: request.ownerDocument,
    title: request.title,
    file,
    language,
    phone: isPhoneReaderLayout(width),
    onChoose: (choice) => {
      if (choice === "notes") {
        void plugin.data.openPath(request.notePath);
        return;
      }
      if (choice === "book" && file) {
        void openLinkedBook(plugin, {
          notePath: request.notePath,
          filePath: file.path,
          title: request.title,
          kind: file.kind,
          returnPath,
          coverRect: request.coverRect,
        });
      }
    },
  });
}

function titleFromFrontmatter(
  frontmatter: Record<string, unknown>,
  basename: string,
): string {
  const title = frontmatter.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  return basename;
}

export async function openActiveNoteBook(plugin: FitnessPlugin): Promise<void> {
  const language = plugin.settings.language;
  const active = plugin.app.workspace.getActiveFile();
  if (!(active instanceof TFile) || active.extension !== "md") {
    new Notice(t("notice.readerNeedsNote", language));
    return;
  }
  const frontmatter = frontmatterOf(plugin, active.path);
  let source: unknown = frontmatter.source;
  if (typeof source !== "string" || !source.trim()) {
    source = readReaderNote(await plugin.app.vault.cachedRead(active)).source;
  }
  const title = titleFromFrontmatter(frontmatter, active.basename);
  const file = resolveLinkedBookFile({
    title,
    notePath: active.path,
    source,
    files: bookFiles(plugin),
  });
  if (!file) {
    new Notice(t("notice.readerNoFile", language));
    return;
  }
  await openLinkedBook(plugin, {
    notePath: active.path,
    filePath: file.path,
    title,
    kind: file.kind,
    returnPath: active.path,
    coverRect: null,
  });
}

export function closeReaderChrome(): void {
  closeBookChooser();
}
