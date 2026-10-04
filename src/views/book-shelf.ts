import type { VaultDataSource } from "../data/vault-source";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, HobbyItemMeta } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_READING_STATUS, matchesBookShelfStatus, resolveBookShelfStatuses, statusRank } from "../core/reading-status.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { hobbyActivities } from "../util/activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { BOOK_GAP_PX, DEFAULT_BOOK_WIDTH_PX, MIN_BOOKS_PER_ROW, ROW_PADDING_PX, bookHeightForWidth, bookWidthForContainer, booksPerRow, chunkItems, resolveBookShelfScale, scaledBookSize } from "../util/book-shelf-layout.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { measureElementWidth } from "../util/element-width.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { PaintMemo, sameList } from "../util/paint-memo.ts";

export { bookHeightForWidth, bookWidthForContainer, booksPerRow, chunkItems, resolveBookShelfScale };

export type BookShelfItem = {
  path: string;
  title: string;
  authors: string[];
  status: string;
  spineColor: string;
  cover?: string;
  description?: string;
};

export type BookShelfPaintState = {
  items: readonly BookShelfItem[];
  activityId: string;
  hasActivity: boolean;
  scale: number;
  language: Language;
  statuses: readonly string[] | null;
  invalidStatuses: readonly string[];
};

function sameBookShelfItem(left: BookShelfItem, right: BookShelfItem): boolean {
  if (left === right) return true;
  return (
    left.path === right.path &&
    left.title === right.title &&
    sameList(left.authors, right.authors) &&
    left.status === right.status &&
    left.spineColor === right.spineColor &&
    left.cover === right.cover &&
    left.description === right.description
  );
}

/** True when a rescan would paint the same books and chrome. */
export function sameBookShelfPaintState(
  previous: BookShelfPaintState | undefined,
  next: BookShelfPaintState,
): boolean {
  if (!previous) return false;
  return (
    sameList(previous.items, next.items, sameBookShelfItem) &&
    previous.activityId === next.activityId &&
    previous.hasActivity === next.hasActivity &&
    previous.scale === next.scale &&
    previous.language === next.language &&
    sameList(previous.statuses, next.statuses) &&
    sameList(previous.invalidStatuses, next.invalidStatuses)
  );
}

export type CoverRef =
  | { kind: "url"; src: string }
  | { kind: "vault"; path: string }
  | { kind: "none" };

const resizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
const windowListeners = new WeakMap<HTMLElement, () => void>();
const bookShelfPaint = new PaintMemo<BookShelfPaintState>(
  '[data-testid="atomic-bookshelf"]',
  sameBookShelfPaintState,
);
const layoutFrames = new WeakMap<HTMLElement, number>();
const EMPTY_HOBBY_FILES: HobbyItemMeta[] = [];

function cancelBookShelfLayout(el: HTMLElement): void {
  const frame = layoutFrames.get(el);
  if (frame == null) return;
  window.cancelAnimationFrame(frame);
  layoutFrames.delete(el);
}

function requestBookShelfLayout(el: HTMLElement, layout: () => void): void {
  if (layoutFrames.has(el)) return;
  const frame = window.requestAnimationFrame(() => {
    layoutFrames.delete(el);
    layout();
  });
  layoutFrames.set(el, frame);
}

type OverflowElement = {
  className?: string;
  style: { overflow: string };
  parentElement: OverflowElement | null;
  setCssStyles: (styles: { overflow: string }) => void;
};

function setOverflowVisible(el: OverflowElement | HTMLElement): void {
  el.setCssStyles({ overflow: "visible" });
}

/** Codeblock wrappers that clip the hover title bubble if overflow stays hidden. */
export function shouldUnclipBookShelfAncestor(className: string): boolean {
  return className.split(/\s+/).some((token) => {
    const t = token.toLowerCase();
    return (
      t.includes("code-block") ||
      t.includes("codeblock") ||
      t === "cm-embed-block" ||
      t.includes("internal-embed")
    );
  });
}

/** Note scrollers must keep overflow so the pane still scrolls. */
export function isBookShelfUnclipStop(className: string): boolean {
  const t = className.toLowerCase();
  return (
    t.includes("markdown-preview-view") ||
    t.includes("markdown-source-view") ||
    t.includes("cm-scroller") ||
    t.includes("workspace-leaf")
  );
}

export function unclipBookShelfAncestors(
  el: OverflowElement | HTMLElement,
  maxDepth = 8,
): void {
  let current: OverflowElement | HTMLElement | null = el;
  let depth = 0;
  let reachedKnownWrapper = false;
  while (current && depth < maxDepth) {
    const className = current.className ?? "";
    if (isBookShelfUnclipStop(className)) break;
    const knownWrapper = shouldUnclipBookShelfAncestor(className);
    if (depth === 0 || !reachedKnownWrapper || knownWrapper) {
      setOverflowVisible(current);
    }
    if (knownWrapper) reachedKnownWrapper = true;
    current = current.parentElement;
    depth += 1;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value);
}

export function shelfColorFor(item: {
  spine_color?: string;
  title: string;
  path: string;
}): string {
  const explicit = asString(item.spine_color);
  if (isValidHexColor(explicit)) return explicit;

  const source = `${item.title}\n${item.path}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  const color = (hash & 0xffffff) | 0x303030;
  return `#${color.toString(16).padStart(6, "0").slice(-6)}`;
}

export function buildBookShelfItems(
  files: HobbyItemMeta[],
  activityId = "reading",
  statusFilter: string[] | null = null,
): BookShelfItem[] {
  return files
    .filter(
      (file) =>
        file.frontmatter.type === "atomic-item" &&
        file.frontmatter.activity === activityId,
    )
    .map((file) => {
      const title = asString(file.frontmatter.title) || file.basename;
      const status = asString(file.frontmatter.status) || DEFAULT_READING_STATUS;
      const cover = asString(file.frontmatter.cover);
      const description = asString(file.frontmatter.description);
      return {
        path: file.path,
        title,
        authors: asStringList(file.frontmatter.authors),
        status,
        spineColor: shelfColorFor({
          title,
          path: file.path,
          spine_color: asString(file.frontmatter.spine_color),
        }),
        ...(cover ? { cover } : {}),
        ...(description ? { description } : {}),
      };
    })
    .filter((item) => matchesBookShelfStatus(item.status, statusFilter))
    .sort(
      (a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        a.title.localeCompare(b.title) ||
        a.path.localeCompare(b.path),
    );
}

const SAFE_REMOTE_COVER =
  /^(https?:\/\/|app:\/\/)/i;
const SAFE_RASTER_DATA_COVER =
  /^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i;

/** Normalize frontmatter cover values into URL or vault path refs. */
export function parseCoverRef(raw: string): CoverRef {
  const value = raw.trim();
  if (!value) return { kind: "none" };
  if (/^(javascript|vbscript|data):/i.test(value)) {
    if (SAFE_RASTER_DATA_COVER.test(value)) return { kind: "url", src: value };
    return { kind: "none" };
  }
  if (SAFE_REMOTE_COVER.test(value)) {
    return { kind: "url", src: value };
  }

  let path = value;
  const wiki = value.match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
  if (wiki) path = wiki[1].trim();
  path = path.replace(/^\.\//, "").trim();
  if (!path) return { kind: "none" };
  return { kind: "vault", path };
}

export function resolveCoverSrc(
  cover: string | undefined,
  data: Pick<VaultDataSource, "resolveResourcePath">,
  sourcePath: string,
): string | null {
  const ref = parseCoverRef(cover ?? "");
  if (ref.kind === "none") return null;
  if (ref.kind === "url") return ref.src;
  return data.resolveResourcePath(ref.path, sourcePath);
}

const COVER_OPEN_CLASS = "is-cover-open";

export function hoverFinePointer(
  media: Pick<MediaQueryList, "matches"> | null | undefined,
): boolean {
  return Boolean(media?.matches);
}

/**
 * Hover on a fine pointer only pops the book. The click opens the cover.
 * The next click opens the note. A coarse pointer lifts on the first tap
 * and opens the note on the next. Reduced motion skips the cover swing.
 */
export function bookClickOpensNote(options: {
  hoverFine: boolean;
  coverOpen: boolean;
  reducedMotion?: boolean;
}): boolean {
  if (options.coverOpen) return true;
  return Boolean(options.hoverFine && options.reducedMotion);
}

function hoverFineMedia(): Pick<MediaQueryList, "matches"> | null {
  if (typeof window.matchMedia !== "function") return null;
  // pointer:none is a virtual display with a mouse, not a coarse phone.
  return window.matchMedia("(hover: hover) and (pointer: fine), (pointer: none)");
}

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function closeOpenCovers(root: ParentNode): void {
  root.querySelectorAll(`.atomic-book.${COVER_OPEN_CLASS}`).forEach((el) => {
    el.classList.remove(COVER_OPEN_CLASS);
  });
}

function shelfSummary(items: readonly BookShelfItem[], language: Language): string {
  const reading = items.filter((item) => item.status === "reading").length;
  const finished = items.filter((item) => item.status === "finished").length;
  return t("view.bookShelf.summary", language, {
    count: items.length,
    reading,
    finished,
  });
}

function showBookReadout(
  readout: HTMLElement,
  item: BookShelfItem,
  language: Language,
  mode: "preview" | "again",
  hoverFine = false,
): void {
  readout.empty();
  readout.createSpan({ cls: "atomic-shelf-readout-title", text: item.title });
  const meta = [item.authors[0] || item.status, item.status].filter(Boolean);
  readout.createSpan({ cls: "atomic-shelf-readout-meta", text: meta.join(" · ") });
  const again = mode === "again";
  const hint = readout.createDiv({ cls: again ? "atomic-readout is-live" : "atomic-readout" });
  const key = !again
    ? "view.bookShelf.clickToOpen"
    : hoverFine
      ? "view.bookShelf.clickAgain"
      : "view.bookShelf.tapAgain";
  hint.setText(t(key, language));
}

/** Smaller cover/page type for long titles so they wrap inside the book face. */
export function titleLengthClass(title: string): string {
  const length = title.trim().length;
  if (length > 36) return "is-title-xs";
  if (length > 22) return "is-title-sm";
  return "";
}

function createBook(
  parent: HTMLElement,
  item: BookShelfItem,
  data: VaultDataSource,
  language: Language,
  ribbonColor: string,
  readout: HTMLElement,
): void {
  const button = parent.createEl("button", {
    cls: "atomic-book",
    attr: {
      type: "button",
      "data-testid": "atomic-book",
      "data-title": item.title,
      "data-status": item.status,
      "data-path": item.path,
    },
  });
  button.style.setProperty("--atomic-book-color", item.spineColor);

  const titleClass = titleLengthClass(item.title);
  const pages = button.createDiv({ cls: "atomic-book-pages" });
  pages.createDiv({
    cls: ["atomic-book-pages-title", titleClass].filter(Boolean).join(" "),
    text: item.title,
  });
  const author = item.authors[0];
  if (author) pages.createDiv({ cls: "atomic-book-pages-meta", text: author });

  const face = button.createDiv({ cls: "atomic-book-face" });
  const coverSrc = resolveCoverSrc(item.cover, data, item.path);
  if (coverSrc) {
    face.createEl("img", {
      cls: "atomic-book-cover",
      attr: { src: coverSrc, alt: "", draggable: "false" },
    });
  } else {
    face.createDiv({
      cls: ["atomic-book-cover", "atomic-book-cover-title", titleClass].filter(Boolean).join(" "),
      text: item.title,
    });
  }
  if (item.status === "reading") {
    const ribbon = button.createSpan({ cls: "atomic-book-ribbon" });
    ribbon.style.setProperty("--atomic-c", ribbonColor);
  }

  button.addEventListener("pointermove", (event) => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    button.style.setProperty("--px", px.toFixed(3));
    button.style.setProperty("--py", py.toFixed(3));
    button.style.setProperty("--sx", `${Math.round((event.clientX - rect.left) / rect.width * 100)}%`);
    button.style.setProperty("--sy", `${Math.round((event.clientY - rect.top) / rect.height * 100)}%`);
  });
  button.addEventListener("pointerenter", () => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    showBookReadout(readout, item, language, "preview");
  });
  button.addEventListener("pointerleave", () => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    button.classList.remove(COVER_OPEN_CLASS);
    const summary = readout.dataset.shelfSummary;
    if (summary) readout.setText(summary);
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hoverFine = hoverFinePointer(hoverFineMedia());
    const coverOpen = button.classList.contains(COVER_OPEN_CLASS);
    if (!bookClickOpensNote({
      hoverFine,
      coverOpen,
      reducedMotion: prefersReducedMotion(),
    })) {
      const shelf = parent.closest(".atomic-book-shelf") ?? parent;
      closeOpenCovers(shelf);
      button.classList.add(COVER_OPEN_CLASS);
      showBookReadout(readout, item, language, "again", hoverFine);
      return;
    }
    button.classList.remove(COVER_OPEN_CLASS);
    void data.openPath(item.path);
  });
}

function paintRows(
  frame: HTMLElement,
  items: BookShelfItem[],
  perRow: number,
  data: VaultDataSource,
  language: Language,
  emptyText: string,
  ribbonColor: string,
  readout: HTMLElement,
): void {
  frame.empty();
  readout.dataset.shelfSummary = shelfSummary(items, language);
  const rows = items.length ? chunkItems(items, perRow) : [[]];
  for (const rowItems of rows) {
    const scroll = frame.createDiv({
      cls: "atomic-book-row-books atomic-shelf-scroll atomic-scrollport",
      attr: { "data-testid": "atomic-bookshelf-scroll" },
    });
    const row = scroll.createDiv({ cls: "atomic-book-shelf-row atomic-shelf-row" });
    if (!rowItems.length) {
      row.createDiv({
        cls: "atomic-book-empty",
        text: emptyText,
      });
    } else {
      for (const item of rowItems) {
        createBook(row, item, data, language, ribbonColor, readout);
      }
    }
    scroll.createDiv({ cls: "atomic-book-shelf-plank atomic-plank" });
  }
  readout.setText(shelfSummary(items, language));
}

function applyBookSize(frame: HTMLElement, bookWidth: number): void {
  const height = bookHeightForWidth(bookWidth);
  frame.style.setProperty("--atomic-book-width", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-height", `${height}px`);
  frame.style.setProperty("--atomic-book-w", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-h", `${height}px`);
}

export function renderBookShelf(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  options: Record<string, string>,
  language: Language,
): void {
  const scale = resolveBookShelfScale(options);
  const { maxWidth, minWidth } = scaledBookSize(scale);
  const activityId = options.activity?.trim() || "reading";
  const activity = hobbyActivities(activityTypes).find(
    (candidate) => candidate.id === activityId,
  );
  const { statuses, invalidStatuses } = resolveBookShelfStatuses(options.status);
  const files = activity ? data.listHobbyItems(activity) : EMPTY_HOBBY_FILES;
  const items = activity
    ? buildBookShelfItems(files, activityId, statuses)
    : [];
  const paintState: BookShelfPaintState = {
    items,
    activityId,
    hasActivity: Boolean(activity),
    scale,
    language,
    statuses,
    invalidStatuses,
  };
  if (bookShelfPaint.shouldSkip(el, paintState)) return;

  resizeObservers.get(el)?.disconnect();
  resizeObservers.delete(el);
  const previousWindowListener = windowListeners.get(el);
  if (previousWindowListener) {
    window.removeEventListener("resize", previousWindowListener);
    windowListeners.delete(el);
  }
  cancelBookShelfLayout(el);
  el.empty();
  // Keep hover title bubbles visible above books (preview codeblocks often clip).
  unclipBookShelfAncestors(el);

  const root = el.createDiv({
    cls: "fitness-plugin atomic-book-shelf atomic-shelf",
    attr: {
      "data-testid": "atomic-bookshelf",
      "data-scale": String(scale),
    },
  });
  if (!activity) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.noActivity", language, { activity: activityId }),
    });
    return;
  }

  if (invalidStatuses.length > 0) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.invalidStatuses", language, {
        statuses: invalidStatuses.join(", "),
      }),
    });
  }

  const emptyText =
    statuses && statuses.length > 0
      ? t("view.bookShelf.emptyFiltered", language, {
          statuses: statuses.join(", "),
        })
      : t("view.bookShelf.empty", language);
  const frame = root.createDiv({ cls: "atomic-book-shelf-frame" });
  const readout = root.createDiv({ cls: "atomic-shelf-readout" });
  readout.setText(shelfSummary(items, language));
  const ribbonColor = activity.colors[2];
  let lastKey = "";

  const layout = (): void => {
    const fallback =
      typeof window !== "undefined" && Number.isFinite(window.innerWidth)
        ? window.innerWidth
        : DEFAULT_BOOK_WIDTH_PX * 3 + BOOK_GAP_PX * 2 + ROW_PADDING_PX;
    const width = measureElementWidth(frame, fallback);
    const bookWidth = bookWidthForContainer(
      width,
      BOOK_GAP_PX,
      ROW_PADDING_PX,
      minWidth,
      maxWidth,
    );
    // The width above is for exactly three books. Keep that count so a
    // wide pane grows the row instead of adding a fourth book and a gap.
    const perRow = MIN_BOOKS_PER_ROW;
    const key = `${bookWidth}:${perRow}`;
    if (key === lastKey && frame.childElementCount > 0) return;
    lastKey = key;
    applyBookSize(frame, bookWidth);
    paintRows(frame, items, perRow, data, language, emptyText, ribbonColor, readout);
  };

  layout();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(layout);
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      requestBookShelfLayout(el, layout);
    });
    observer.observe(frame);
    resizeObservers.set(el, observer);
    return;
  }

  // Fallback only: a window listener holds `el` until removed, so it would
  // leak across note unmounts until the next resize if registered alongside
  // ResizeObserver (which Obsidian's WebViews always provide).
  const onWindowResize = (): void => {
    if (!el.isConnected) {
      window.removeEventListener("resize", onWindowResize);
      windowListeners.delete(el);
      return;
    }
    requestBookShelfLayout(el, layout);
  };
  window.addEventListener("resize", onWindowResize);
  windowListeners.set(el, onWindowResize);
}
