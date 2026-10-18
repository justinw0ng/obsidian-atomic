import { ItemView, TFile, type ViewStateResult, type WorkspaceLeaf } from "obsidian";
import type FitnessPlugin from "../../main";
import { t } from "../../i18n";
import { readEpub } from "./epub";
import { readReaderNote, readerFieldsFromFrontmatter, updateReaderPage } from "./frontmatter";
import { sourcePathFromFrontmatter } from "./link";
import {
  clampReaderPage,
  isPhoneReaderLayout,
  pageAfterTurn,
  readerProgress,
  spreadPages,
  type ReaderPageBox,
  type ReaderSizeId,
} from "./model";
import { readerMounts, type CoverRect, type ReaderLayoutRequest, type ReaderSession } from "./mount";
import { canvasPathForNote, ensureRelatedCanvas, seedBookCanvas } from "../ask/canvas";
import { preferReaderTheater } from "../theater/slot";
import { paginateReaderBlocks, type ReaderBlock, type ReaderLeaf } from "./paginate";
import { readerReflowBox } from "../size/reflow";
import { inspectPdf, pdfViewerSrc } from "./pdf";

function layoutBox(size: ReaderSizeId, theater = false): ReaderPageBox {
  const request = readerReflowBox(size, theater);
  return {
    w: request.width,
    h: request.height,
    bodyLines: request.bodyLines,
    charsPerLine: request.charsPerLine,
  };
}

function paintedBox(host: HTMLElement): { w: string; h: string } | null {
  const root = host.querySelector(".atomic-reader");
  if (!root?.instanceOf(HTMLElement)) return null;
  const width = root.style.getPropertyValue("--atomic-page-w").trim();
  const height = root.style.getPropertyValue("--atomic-page-h").trim();
  if (!width || !height) return null;
  return { w: width, h: height };
}

/** Start the existing page transition from the box that was just on screen. */
function slideBox(
  root: HTMLElement,
  previous: { w: string; h: string } | null,
  box: ReaderPageBox,
): void {
  if (!previous) return;
  const width = `${box.w}px`;
  const height = `${box.h}px`;
  if (previous.w === width && previous.h === height) return;
  root.setCssProps({ "--atomic-page-w": previous.w, "--atomic-page-h": previous.h });
  void root.getBoundingClientRect();
  root.setCssProps({ "--atomic-page-w": width, "--atomic-page-h": height });
}

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
  private size: ReaderSizeId = "xl";
  private blocks: ReaderBlock[] = [];
  private layout: ReaderPageBox = layoutBox("xl");
  /** True after the size control paginates during this load. */
  private sizeFromReader = false;
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
  private theaterWanted = false;
  private phoneAfterFlight: boolean | null = null;

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
      if (this.contentEl.querySelector("[data-testid='atomic-open-flight']")) {
        this.phoneAfterFlight = phone;
        return;
      }
      this.phone = phone;
      this.paint();
    });
    observer.observe(this.contentEl);
    this.register(() => observer.disconnect());
    const onFlightDone = (): void => {
      const phone = this.phoneAfterFlight;
      this.phoneAfterFlight = null;
      if (phone == null || phone === this.phone) return;
      if (this.contentEl.querySelector("[data-testid='atomic-open-flight']")) return;
      this.phone = phone;
      this.paint();
    };
    this.contentEl.addEventListener("atomic-flight-done", onFlightDone);
    this.register(() => this.contentEl.removeEventListener("atomic-flight-done", onFlightDone));
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
    this.blocks = [];
    this.sizeFromReader = false;
    this.pdfSrc = "";
    this.total = 0;

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
    let storedPage = this.page >= 1 ? this.page : 1;
    if (note instanceof TFile) {
      const fields = await this.noteFields(note);
      if (token !== this.loadToken) return;
      this.size = "xl";
      const linked = sourcePathFromFrontmatter(fields.canvas);
      this.canvasPath = linked || canvasPathForNote(this.notePath) || "";
      storedPage = fields.page;
    }
    this.theaterWanted = this.plugin.settings.reader.theater;
    if (!this.sizeFromReader) this.layout = layoutBox(this.size, this.theaterWanted);
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
          this.blocks = epub.blocks;
          this.leaves = paginateReaderBlocks(this.blocks, this.layout);
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
    this.phone = this.readerIsPhone();
    this.paint();
  }

  /** Content width wins after layout. Before that, the window width avoids a desktop spread on a phone. */
  private readerIsPhone(): boolean {
    const contentWidth = this.contentEl.clientWidth;
    if (contentWidth > 0) return isPhoneReaderLayout(contentWidth);
    return isPhoneReaderLayout(this.contentEl.win.innerWidth || 0);
  }

  /** The note file is the saved page. The metadata cache can still say page 1. */
  private async noteFields(note: TFile): Promise<ReturnType<typeof readReaderNote>> {
    try {
      return readReaderNote(await this.plugin.app.vault.cachedRead(note));
    } catch {
      const cache = this.plugin.app.metadataCache.getFileCache(note);
      return readerFieldsFromFrontmatter(cache?.frontmatter);
    }
  }

  private leafAt(number: number): ReaderLeaf | null {
    return this.leaves.find((leaf) => leaf.number === number) ?? null;
  }

  /** Phone moves one page. Desktop moves one spread. */
  private step(direction: -1 | 1): number {
    if (!this.phone) return pageAfterTurn(this.page, this.total, direction);
    if (this.total <= 0) return 1;
    const current = clampReaderPage(this.page, this.total);
    const next = current + direction;
    if (next < 1 || next > this.total) return current;
    return next;
  }

  private turn(direction: -1 | 1): void {
    if (this.failure) return;
    const next = this.step(direction);
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
      relayout: (request) => {
        this.applyLayout(request);
      },
    };
  }

  /** Paginate the open EPUB. Size stays XL. Theater only changes the box. */
  private applyLayout(request: ReaderLayoutRequest): void {
    const box: ReaderPageBox = {
      w: request.width,
      h: request.height,
      bodyLines: Math.max(1, Math.round(request.bodyLines)),
      charsPerLine: Math.max(1, Math.round(request.charsPerLine)),
    };
    if (
      this.size === "xl" &&
      this.layout.w === box.w &&
      this.layout.h === box.h &&
      this.layout.bodyLines === box.bodyLines &&
      this.layout.charsPerLine === box.charsPerLine
    ) {
      return;
    }
    this.sizeFromReader = true;
    this.size = "xl";
    this.layout = box;
    if (this.kind === "epub" && this.blocks.length > 0) {
      this.leaves = paginateReaderBlocks(this.blocks, box);
      this.total = this.leaves.length;
      this.failure = this.total > 0 ? null : "empty";
      const nextPage = clampReaderPage(this.page, Math.max(this.total, 1));
      if (nextPage !== this.page) {
        this.page = nextPage;
        this.dirty = this.page !== this.savedPage;
        if (this.dirty) this.scheduleSave();
      }
    }
    this.paint();
  }

  private attachMounts(root: HTMLElement): void {
    const session = this.session();
    const mounts = readerMounts();
    const sizeSlot = root.querySelector("[data-reader-slot='size']");
    if (sizeSlot?.instanceOf(HTMLElement)) mounts.size?.attach?.(sizeSlot, session);
    const theaterSlot = root.querySelector("[data-reader-slot='theater']");
    if (theaterSlot?.instanceOf(HTMLElement)) {
      if (this.theaterWanted) {
        preferReaderTheater(this.notePath, true);
        this.theaterWanted = false;
      }
      mounts.theater?.attach?.(theaterSlot, session);
    }
    const askSlot = root.querySelector("[data-reader-slot='ask']");
    if (askSlot?.instanceOf(HTMLElement)) mounts.ask?.attach?.(askSlot, session);
  }

  private paint(): void {
    const language = this.plugin.settings.language;
    const box = this.layout;
    const previousRoot = this.contentEl.querySelector(".atomic-reader");
    const previousSettled =
      previousRoot?.instanceOf(HTMLElement) === true &&
      previousRoot.getAttribute("data-settled") === "true";
    const previous = previousSettled ? paintedBox(this.contentEl) : null;
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
        "data-body-lines": String(box.bodyLines),
        "data-settled": this.ready ? "true" : "false",
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
        cls: "atomic-btn is-quiet is-small",
        attr: { type: "button", "data-testid": "atomic-reader-canvas" },
      });
      canvas.setText(t("view.reader.canvas", language));
      canvas.addEventListener("click", () => {
        void this.openCanvas();
      });
    }
    const note = bar.createEl("button", {
      cls: "atomic-btn is-quiet is-small",
      attr: { type: "button", "data-testid": "atomic-reader-note" },
    });
    note.setText(t("view.reader.note", language));
    note.addEventListener("click", () => {
      void this.plugin.data.openPath(this.notePath);
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
        const shown = clampReaderPage(this.page, Math.max(this.total, 1));
        this.paintPage(spreadEl, this.total > 0 ? shown : null, "recto");
      }
    }
    spreadEl.createDiv({
      cls: "atomic-reader-gutter is-ask",
      attr: { "data-reader-slot": "ask", "data-testid": "atomic-reader-slot-ask" },
    });

    this.paintFoot(root, language, progress);
    this.attachMounts(root);
    slideBox(root, previous, box);
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
    page.createSpan({
      cls: "atomic-reader-pn",
      text: String(number),
      attr: { "data-testid": "atomic-reader-pn" },
    });
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

  private async openCanvas(): Promise<void> {
    const path = this.canvasPath;
    if (!path) return;
    if (!this.plugin.data.getFileByPath(path)) {
      const seeded = seedBookCanvas(this.notePath);
      if (!seeded) return;
      await this.plugin.data.writeNote(seeded.canvasPath, seeded.canvasJson);
      await this.plugin.data.processNote(this.notePath, (current) =>
        ensureRelatedCanvas(current, seeded.canvasPath),
      );
    }
    await this.plugin.data.openPath(path);
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
    if (this.step(-1) === this.page || this.failure) prev.setAttr("disabled", "true");
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
      }),
    });

    const next = foot.createEl("button", {
      cls: "atomic-btn is-quiet is-small",
      attr: { type: "button", "data-testid": "atomic-reader-next" },
    });
    next.setAttr("aria-label", t("view.reader.next", language));
    next.setText("›");
    if (this.step(1) === this.page || this.failure) next.setAttr("disabled", "true");
    else next.addEventListener("click", () => this.turn(1));
  }
}
