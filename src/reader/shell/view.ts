import { ItemView, TFile, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type FitnessPlugin from "../../main";
import { t } from "../../i18n";
import { readEpub } from "./epub";
import { readReaderNote, readerFieldsFromFrontmatter, updateReaderPage } from "./frontmatter";
import { sourcePathFromFrontmatter } from "./link";
import {
  canTurnPage,
  clampReaderPage,
  isPhoneReaderLayout,
  pageAfterTurn,
  readerPageBox,
  readerProgress,
  spreadPages,
  type ReaderSizeId,
} from "./model";
import { readerMounts, type CoverRect, type ReaderSession } from "./mount";
import { paginateReaderBlocks, type ReaderLeaf } from "./paginate";
import { inspectPdf, pdfViewerSrc } from "./pdf";

export const ATOMIC_READER_VIEW = "atomic-reader";

type ReaderKind = "epub" | "pdf";
type ReaderFailure = "opening" | "encrypted" | "unreadable" | "empty" | null;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function coverFromState(value: unknown): CoverRect | null {
  const record = asRecord(value);
  if (!record) return null;
  const x = Number(record.x);
  const y = Number(record.y);
  const width = Number(record.width);
  const height = Number(record.height);
  if (![x, y, width, height].every((part) => Number.isFinite(part))) return null;
  return {
    x,
    y,
    width,
    height,
    color: asText(record.color),
  };
}

function elementTarget(target: EventTarget | null): HTMLElement | null {
  if (!target || !("instanceOf" in target)) return null;
  const node = target as Node;
  return node.instanceOf(HTMLElement) ? node : null;
}

function readingAccent(plugin: FitnessPlugin): string {
  const reading = plugin.settings.activityTypes.find((activity) => activity.id === "reading");
  const color = reading?.baseColor ?? "";
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : "";
}

export class AtomicReaderView extends ItemView {
  private notePath = "";
  private filePath = "";
  private title = "";
  private kind: ReaderKind = "epub";
  private returnPath = "";
  private coverRect: CoverRect | null = null;
  private size: ReaderSizeId = "m";
  private canvasPath = "";
  private page = 1;
  private savedPage = 1;
  private total = 0;
  private leaves: ReaderLeaf[] = [];
  private pdfSrc = "";
  private failure: ReaderFailure = "opening";
  private phone = false;
  private dirty = false;
  private ready = false;
  private loadToken = 0;
  private saveTimer: number | null = null;
  private observed = false;
  private keys = false;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: FitnessPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return ATOMIC_READER_VIEW;
  }

  getDisplayText(): string {
    return this.title || "Book";
  }

  getIcon(): string {
    return "book-open";
  }

  getState(): Record<string, unknown> {
    return {
      notePath: this.notePath,
      filePath: this.filePath,
      title: this.title,
      kind: this.kind,
      returnPath: this.returnPath,
      coverRect: this.coverRect,
      page: this.page,
    };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    this.applyState(state);
    result.history = true;
    await this.loadDocument();
  }

  async onOpen(): Promise<void> {
    this.ensureObserver();
    this.ensureKeys();
    if (!this.ready) this.paint();
  }

  async onClose(): Promise<void> {
    this.loadToken += 1;
    await this.flushSave();
  }

  private applyState(state: unknown): void {
    const record = asRecord(state) ?? {};
    this.notePath = asText(record.notePath);
    this.filePath = asText(record.filePath);
    this.title = asText(record.title);
    this.kind = record.kind === "pdf" ? "pdf" : "epub";
    this.returnPath = asText(record.returnPath) || this.notePath;
    this.coverRect = coverFromState(record.coverRect);
    const page = Number(record.page);
    if (Number.isFinite(page) && page >= 1) this.page = Math.trunc(page);
  }

  private ensureObserver(): void {
    if (this.observed || typeof ResizeObserver === "undefined") return;
    this.observed = true;
    const observer = new ResizeObserver(() => {
      const phone = isPhoneReaderLayout(this.contentEl.clientWidth);
      if (phone === this.phone) return;
      this.phone = phone;
      this.paint();
    });
    observer.observe(this.contentEl);
    this.register(() => observer.disconnect());
  }

  private ensureKeys(): void {
    if (this.keys) return;
    this.keys = true;
    this.registerDomEvent(this.contentEl, "keydown", (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = elementTarget(event.target);
      if (target?.closest("input, textarea")) return;
      event.preventDefault();
      this.turn(event.key === "ArrowRight" ? 1 : -1);
    });
  }

  private async loadDocument(): Promise<void> {
    const token = ++this.loadToken;
    this.failure = "opening";
    this.ready = false;
    this.leaves = [];
    this.pdfSrc = "";
    this.total = 0;
    this.paint();

    const file = this.plugin.data.getFileByPath(this.filePath);
    if (!(file instanceof TFile)) {
      this.failure = "unreadable";
      this.ready = true;
      this.paint();
      return;
    }
    if (file.extension === "pdf") this.kind = "pdf";
    if (file.extension === "epub") this.kind = "epub";

    const note = this.plugin.data.getFileByPath(this.notePath);
    let storedPage = 1;
    if (note instanceof TFile) {
      const cache = this.plugin.app.metadataCache.getFileCache(note);
      const fields = cache?.frontmatter
        ? readerFieldsFromFrontmatter(cache.frontmatter)
        : readReaderNote(await this.plugin.app.vault.cachedRead(note));
      if (token !== this.loadToken) return;
      this.size = fields.size;
      this.canvasPath = sourcePathFromFrontmatter(fields.canvas);
      storedPage = fields.page;
    }
    this.page = storedPage;
    this.savedPage = storedPage;

    try {
      const bytes = new Uint8Array(await this.plugin.app.vault.readBinary(file));
      if (token !== this.loadToken) return;
      switch (this.kind) {
        case "pdf": {
          const info = inspectPdf(bytes);
          if (info.encrypted) this.failure = "encrypted";
          else if (info.pages < 1) this.failure = "unreadable";
          else {
            this.total = info.pages;
            this.pdfSrc = this.plugin.app.vault.getResourcePath(file);
            this.failure = null;
          }
          break;
        }
        case "epub": {
          const epub = await readEpub(bytes);
          if (token !== this.loadToken) return;
          this.leaves = paginateReaderBlocks(epub.blocks, readerPageBox(this.size));
          this.total = this.leaves.length;
          this.failure = this.total > 0 ? null : "empty";
          break;
        }
        default: {
          const unexpected: never = this.kind;
          throw new Error(unexpected);
        }
      }
    } catch {
      if (token !== this.loadToken) return;
      this.failure = "unreadable";
    }

    if (token !== this.loadToken) return;
    this.page = clampReaderPage(storedPage, Math.max(this.total, 1));
    this.savedPage = this.page;
    this.dirty = false;
    this.ready = true;
    this.phone = isPhoneReaderLayout(this.contentEl.clientWidth);
    this.paint();
  }

  private leafAt(number: number): ReaderLeaf | null {
    return this.leaves.find((leaf) => leaf.number === number) ?? null;
  }

  private turn(direction: -1 | 1): void {
    if (this.failure) return;
    const next = pageAfterTurn(this.page, this.total, direction);
    if (next === this.page) return;
    this.page = next;
    this.dirty = this.page !== this.savedPage;
    this.paint();
    if (this.dirty) this.scheduleSave();
  }

  private scheduleSave(): void {
    const view = this.contentEl.win;
    if (this.saveTimer != null) view.clearTimeout(this.saveTimer);
    const page = this.page;
    const path = this.notePath;
    this.saveTimer = view.setTimeout(() => {
      this.saveTimer = null;
      void this.writePage(path, page);
    }, 400);
  }

  private async writePage(path: string, page: number): Promise<void> {
    if (!path) return;
    await this.plugin.data.processNote(path, (current) => updateReaderPage(current, page));
    if (this.page === page) {
      this.savedPage = page;
      this.dirty = false;
    }
  }

  private async flushSave(): Promise<void> {
    if (this.saveTimer != null) {
      this.contentEl.win.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.dirty) return;
    await this.writePage(this.notePath, this.page);
  }

  private session(): ReaderSession {
    return {
      notePath: this.notePath,
      filePath: this.filePath,
      title: this.title,
      kind: this.kind,
      returnPath: this.returnPath,
      coverRect: this.coverRect,
      page: this.page,
      total: this.total,
      size: this.size,
    };
  }

  private attachMounts(root: HTMLElement): void {
    const session = this.session();
    const mounts = readerMounts();
    const sizeSlot = root.querySelector("[data-reader-slot='size']");
    if (sizeSlot?.instanceOf(HTMLElement)) mounts.size?.attach?.(sizeSlot, session);
    const theaterSlot = root.querySelector("[data-reader-slot='theater']");
    if (theaterSlot?.instanceOf(HTMLElement)) mounts.theater?.attach?.(theaterSlot, session);
    const askSlot = root.querySelector("[data-reader-slot='ask']");
    if (askSlot?.instanceOf(HTMLElement)) mounts.ask?.attach?.(askSlot, session);
  }

  private paint(): void {
    const language = this.plugin.settings.language;
    const box = readerPageBox(this.size);
    const progress = readerProgress(this.failure ? 0 : this.page, this.failure ? 0 : this.total);
    this.contentEl.empty();
    const root = this.contentEl.createDiv({
      cls: this.phone ? "fitness-plugin atomic-reader is-phone" : "fitness-plugin atomic-reader",
      attr: {
        "data-testid": "atomic-reader",
        "data-reader-mount": "shell",
        "data-kind": this.kind,
        "data-page": String(this.page),
        "data-total": String(this.total),
        "data-size": this.size,
        tabindex: "0",
      },
    });
    const accent = readingAccent(this.plugin);
    root.setCssProps({
      "--atomic-page-w": `${box.w}px`,
      "--atomic-page-h": `${box.h}px`,
      "--atomic-reader-progress": `${progress.percent}%`,
      ...(accent ? { "--atomic-c": accent } : {}),
    });

    const bar = root.createDiv({ cls: "atomic-reader-bar" });
    const shelf = bar.createEl("button", {
      cls: "atomic-btn is-quiet is-small",
      attr: { type: "button", "data-testid": "atomic-reader-shelf" },
    });
    shelf.setText(t("view.reader.shelf", language));
    shelf.addEventListener("click", () => {
      void this.plugin.data.openPath(this.returnPath || this.notePath);
    });
    const name = bar.createSpan({
      cls: "atomic-name atomic-reader-title",
      attr: { "data-testid": "atomic-reader-title" },
    });
    name.createSpan({ cls: "atomic-dot" });
    name.createSpan({ text: this.title || t("view.reader.openBook", language) });
    if (this.canvasPath) {
      const canvas = bar.createEl("button", {
        cls: "atomic-link",
        attr: { type: "button", "data-testid": "atomic-reader-canvas" },
      });
      canvas.setText(t("view.reader.canvas", language));
      canvas.addEventListener("click", () => {
        void this.plugin.data.openPath(this.canvasPath);
      });
    }
    const note = bar.createEl("button", {
      cls: "atomic-link",
      attr: { type: "button", "data-testid": "atomic-reader-note" },
    });
    note.setText(t("view.reader.note", language));
    note.addEventListener("click", () => {
      void this.plugin.data.openPath(this.notePath);
    });
    bar.createDiv({
      cls: "atomic-reader-slot",
      attr: { "data-reader-slot": "size", "data-testid": "atomic-reader-slot-size" },
    });
    bar.createDiv({
      cls: "atomic-reader-slot",
      attr: { "data-reader-slot": "theater", "data-testid": "atomic-reader-slot-theater" },
    });

    const spreadEl = root.createDiv({ cls: "atomic-reader-spread" });
    if (this.failure) {
      const key =
        this.failure === "encrypted"
          ? "view.reader.encrypted"
          : this.failure === "empty"
            ? "view.reader.empty"
            : this.failure === "opening"
              ? "view.reader.opening"
              : "view.reader.unreadable";
      spreadEl.createEl("p", {
        cls: "atomic-reader-status",
        attr: { "data-testid": "atomic-reader-status", "data-state": this.failure },
        text: t(key, language),
      });
    } else {
      const pair = spreadPages(this.page, this.total);
      if (!this.phone) {
        spreadEl.createDiv({
          cls: "atomic-reader-gutter is-margin",
          attr: { "data-reader-slot": "margin" },
        });
        this.paintPage(spreadEl, pair.verso, "verso");
        this.paintPage(spreadEl, pair.recto, "recto");
      } else {
        if (pair.verso) this.paintPage(spreadEl, pair.verso, "verso");
        if (pair.recto) this.paintPage(spreadEl, pair.recto, "recto");
      }
    }
    spreadEl.createDiv({
      cls: "atomic-reader-gutter is-ask",
      attr: { "data-reader-slot": "ask", "data-testid": "atomic-reader-slot-ask" },
    });

    this.paintFoot(root, language, progress);
    this.attachMounts(root);
  }

  private paintPage(parent: HTMLElement, number: number | null, side: "verso" | "recto"): void {
    const page = parent.createDiv({
      cls: `atomic-reader-page is-${side}`,
      attr: number
        ? { "data-testid": "atomic-reader-page", "data-page": String(number) }
        : { "data-blank": "true" },
    });
    if (!number) return;
    const leaf = this.leafAt(number);
    const chapter = leaf?.chapter ?? "";
    const label = this.phone
      ? [chapter, `p. ${number}`].filter(Boolean).join(" · ")
      : side === "verso"
        ? chapter
        : `p. ${number}`;
    if (label) page.createEl("h3", { text: label });
    if (this.kind === "pdf" && this.pdfSrc) {
      page.createEl("iframe", {
        cls: "atomic-reader-frame",
        attr: { src: pdfViewerSrc(this.pdfSrc, number), title: this.title },
      });
      return;
    }
    for (const paragraph of leaf?.paragraphs ?? []) {
      page.createEl("p", { text: paragraph });
    }
  }

  private paintFoot(
    root: HTMLElement,
    language: FitnessPlugin["settings"]["language"],
    progress: { page: number; total: number; percent: number },
  ): void {
    const foot = root.createDiv({ cls: "atomic-reader-foot" });
    const prev = foot.createEl("button", {
      cls: "atomic-btn is-quiet is-small",
      attr: { type: "button", "data-testid": "atomic-reader-prev" },
    });
    prev.setAttr("aria-label", t("view.reader.prev", language));
    prev.setText("‹");
    if (!canTurnPage(this.page, this.total, -1) || this.failure) prev.setAttr("disabled", "true");
    else prev.addEventListener("click", () => this.turn(-1));

    foot.createSpan({
      cls: "atomic-reader-last",
      attr: { "data-testid": "atomic-reader-last" },
      text: t("view.reader.lastRead", language, { page: progress.page || this.page }),
    });
    const meter = foot.createSpan({
      cls: "atomic-reader-progress",
      attr: { "data-testid": "atomic-reader-meter" },
    });
    meter.createEl("i");
    foot.createSpan({
      cls: "atomic-reader-count",
      attr: { "data-testid": "atomic-reader-progress" },
      text: t("view.reader.progress", language, {
        page: progress.page,
        total: progress.total,
        percent: progress.percent,
      }),
    });

    const next = foot.createEl("button", {
      cls: "atomic-btn is-quiet is-small",
      attr: { type: "button", "data-testid": "atomic-reader-next" },
    });
    next.setAttr("aria-label", t("view.reader.next", language));
    next.setText("›");
    if (!canTurnPage(this.page, this.total, 1) || this.failure) next.setAttr("disabled", "true");
    else next.addEventListener("click", () => this.turn(1));
  }
}
