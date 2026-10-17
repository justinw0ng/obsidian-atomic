// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { READER_SIZE_ORDER, effectiveReaderSize, parseReaderSize, readerPageGeometry, readerSizeLabel, stepReaderSize, type ReaderPageGeometry, type ReaderSizeId, type ReaderSizeSurface } from "./geometry.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerSizeShortcutDirection } from "./shortcut.ts";

export const READER_SIZE_CLASS = "atomic-reader-size";
export const READER_PAGE_CLASS = "atomic-reader-sized";
export const READER_LINES_CLASS = "atomic-reader-lines";

const PAGE_PROPS = [
  "--atomic-reader-page-w",
  "--atomic-reader-page-h",
  "--atomic-reader-clip-h",
  "--atomic-reader-font-size",
  "--atomic-reader-line-height",
] as const;

const PHONE_HINT = "Larger book, same type size — more lines per page. Saved for this book.";
const DESK_HINT = "⌘− / ⌘+";

export type ReaderSizeChrome = "bar" | "sheet";

export type ReaderSizePaint = "page" | "shell";

export type MountReaderSizeOptions = {
  /** Toolbar slot on the desk, or the book-size slot on the phone sheet. */
  controlEl: HTMLElement;
  /**
   * Page that grows, or both leaves of a spread.
   * Not the control slot. Every leaf gets the same box.
   */
  pageHost: HTMLElement | readonly HTMLElement[];
  surface?: ReaderSizeSurface;
  /**
   * "sheet" is the phone reading sheet. "bar" fits `[data-reader-slot="size"]`.
   * Desk is always a bar. Phone defaults to the sheet.
   */
  chrome?: ReaderSizeChrome;
  /**
   * "page" sizes pageHost. "shell" writes `--atomic-page-w/h` on boxEl
   * and leaves the shell page markup alone.
   */
  paint?: ReaderSizePaint;
  /** Reader root for paint "shell". */
  boxEl?: HTMLElement;
  /**
   * Theater draws XL and hides S·M·L·XL. The saved size is left alone.
   * The shell owns theater chrome; this flag is the only theater hook.
   */
  theaterLocked?: boolean;
  /** Settled size for this book. Unknown values become M. */
  size?: ReaderSizeId | string;
  /**
   * Focus inside this element arms ⌘− / ⌘+.
   * Defaults to the control slot and the page.
   */
  shortcutRoot?: HTMLElement;
  /** Fired when the reader changes the settled size. Not fired for theater. */
  onChange?: (size: ReaderSizeId) => void;
  /** Board or test override. The OS reduced-motion setting still wins. */
  reducedMotion?: boolean;
};

export type ReaderSizeControl = {
  destroy(): void;
  /** Settled size, including while theater is showing XL. */
  getSize(): ReaderSizeId;
  getEffectiveSize(): ReaderSizeId;
  setSize(size: ReaderSizeId | string): void;
  setTheaterLocked(locked: boolean): void;
};

export function mountReaderSize(options: MountReaderSizeOptions): ReaderSizeControl {
  const controlEl = options.controlEl;
  const pages = pageList(options.pageHost);
  if (pages.length === 0 || pages.some((page) => page === controlEl)) {
    throw new Error("Book size control and page must be different elements");
  }

  const surface: ReaderSizeSurface = options.surface === "phone" ? "phone" : "desk";
  const chrome = chromeFor(surface, options.chrome);
  const shellPaint = options.paint === "shell";
  let settled = parseReaderSize(options.size);
  let theaterLocked = options.theaterLocked === true;
  let destroyed = false;

  controlEl.empty();
  const slot = mountSlot(chrome, controlEl, surface);
  const buttons = new Map<ReaderSizeId, HTMLButtonElement>();
  for (const size of READER_SIZE_ORDER) {
    const button = slot.segment.createEl("button", {
      cls: "atomic-reader-size-opt",
      attr: {
        type: "button",
        "data-size": size,
        "data-testid": `atomic-reader-size-${size}`,
        "aria-pressed": "false",
      },
    });
    button.createSpan({
      cls: `atomic-reader-size-book is-${size}`,
      attr: { "aria-hidden": "true" },
    });
    button.createSpan({ text: readerSizeLabel(size) });
    button.addEventListener("click", () => {
      if (destroyed || theaterLocked) return;
      commit(size);
    });
    buttons.set(size, button);
  }

  const view = ownerView(pages[0]);
  const motionQuery = view?.matchMedia("(prefers-reduced-motion: reduce)") ?? null;
  const onMotion = (): void => {
    if (!destroyed) paint();
  };
  motionQuery?.addEventListener("change", onMotion);

  const onKey = (event: KeyboardEvent): void => {
    if (destroyed || theaterLocked || event.defaultPrevented) return;
    const direction = readerSizeShortcutDirection(event);
    if (direction == null) return;
    if (isTextField(keyTarget(event))) return;
    if (!shortcutArmed(options.shortcutRoot, controlEl, pages)) return;
    event.preventDefault();
    commit(stepReaderSize(settled, direction));
  };
  view?.addEventListener("keydown", onKey);

  paint();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      motionQuery?.removeEventListener("change", onMotion);
      view?.removeEventListener("keydown", onKey);
      controlEl.empty();
      if (shellPaint) options.boxEl?.removeClass("is-instant");
      else for (const page of pages) clearPage(page);
    },
    getSize: () => settled,
    getEffectiveSize: () => effectiveReaderSize(settled, theaterLocked),
    setSize(size) {
      if (destroyed) return;
      settled = parseReaderSize(size);
      paint();
    },
    setTheaterLocked(locked) {
      if (destroyed) return;
      theaterLocked = locked;
      paint();
    },
  };

  function commit(next: ReaderSizeId): void {
    if (next === settled) {
      paint();
      return;
    }
    settled = next;
    paint();
    options.onChange?.(settled);
  }

  function paint(): void {
    const drawn = readerPageGeometry(settled, {
      surface,
      theater: theaterLocked,
    });
    const reduced = prefersReduced(motionQuery, options.reducedMotion);
    if (shellPaint) applyShellBox(options.boxEl, drawn, reduced);
    else for (const page of pages) applyPage(page, drawn, reduced);
    slot.root.toggleClass("is-theater-locked", theaterLocked);
    if (theaterLocked) slot.root.setAttr("hidden", "true");
    else slot.root.removeAttribute("hidden");
    slot.root.setAttr("aria-hidden", theaterLocked ? "true" : "false");
    if (slot.value) slot.value.setText(readerSizeLabel(settled));
    for (const size of READER_SIZE_ORDER) {
      const button = buttons.get(size);
      if (!button) continue;
      const on = size === settled;
      button.toggleClass("is-on", on);
      button.setAttr("aria-pressed", on ? "true" : "false");
    }
  }
}

type SizeSlot = {
  root: HTMLElement;
  segment: HTMLElement;
  value: HTMLElement | null;
};

function chromeFor(surface: ReaderSizeSurface, chrome: ReaderSizeChrome | undefined): ReaderSizeChrome {
  switch (chrome) {
    case "bar":
    case "sheet":
      return chrome;
    case undefined:
      return surface === "phone" ? "sheet" : "bar";
    default: {
      const unseen: never = chrome;
      return unseen;
    }
  }
}

function mountSlot(
  chrome: ReaderSizeChrome,
  controlEl: HTMLElement,
  surface: ReaderSizeSurface,
): SizeSlot {
  switch (chrome) {
    case "bar":
      return mountBarSlot(controlEl, surface);
    case "sheet":
      return mountPhoneSlot(controlEl);
    default: {
      const unseen: never = chrome;
      return unseen;
    }
  }
}

function mountBarSlot(controlEl: HTMLElement, surface: ReaderSizeSurface): SizeSlot {
  const phone = surface === "phone";
  const root = controlEl.createDiv({
    cls: phone
      ? `fitness-plugin ${READER_SIZE_CLASS} is-phone is-bar`
      : `fitness-plugin ${READER_SIZE_CLASS}`,
    attr: {
      "data-testid": "atomic-reader-size",
      "aria-label": "Book size",
    },
  });
  const segment = root.createDiv({
    cls: "atomic-reader-size-seg",
    attr: { role: "group", "aria-label": "Book size" },
  });
  if (!phone) {
    root.createSpan({
      cls: "atomic-reader-size-hint",
      text: DESK_HINT,
      attr: { "data-testid": "atomic-reader-size-hint", "aria-hidden": "true" },
    });
  }
  return { root, segment, value: null };
}

function mountPhoneSlot(controlEl: HTMLElement): SizeSlot {
  const sheet = controlEl.createDiv({
    cls: "fitness-plugin atomic-reader-size-sheet",
    attr: { "data-testid": "atomic-reader-size-sheet" },
  });
  const row = sheet.createDiv({ cls: "atomic-reader-size-row" });
  row.createSpan({ text: "Book size" });
  const value = row.createSpan({
    cls: "atomic-reader-size-value",
    attr: { "data-testid": "atomic-reader-size-value" },
  });
  const control = sheet.createDiv({
    cls: `${READER_SIZE_CLASS} is-phone`,
    attr: {
      "data-testid": "atomic-reader-size",
      "aria-label": "Book size",
    },
  });
  const segment = control.createDiv({
    cls: "atomic-reader-size-seg",
    attr: { role: "group", "aria-label": "Book size" },
  });
  sheet.createDiv({
    cls: "atomic-reader-size-note",
    text: PHONE_HINT,
  });
  return { root: sheet, segment, value };
}

function applyShellBox(
  box: HTMLElement | undefined,
  geometry: ReaderPageGeometry,
  reduced: boolean,
): void {
  if (!box) return;
  box.setCssProps({
    "--atomic-page-w": `${geometry.width}px`,
    "--atomic-page-h": `${geometry.height}px`,
  });
  box.toggleClass("is-instant", reduced);
  box.setAttr("data-size", geometry.size);
}

function applyPage(pageHost: HTMLElement, geometry: ReaderPageGeometry, reduced: boolean): void {
  pageHost.addClass(READER_PAGE_CLASS);
  pageHost.toggleClass("is-phone", geometry.surface === "phone");
  pageHost.toggleClass("is-instant", reduced);
  pageHost.setCssProps({
    "--atomic-reader-page-w": `${geometry.width}px`,
    "--atomic-reader-page-h": `${geometry.height}px`,
    "--atomic-reader-clip-h": `${geometry.clipHeight}px`,
    "--atomic-reader-font-size": `${geometry.fontSizePx}px`,
    "--atomic-reader-line-height": `${geometry.lineHeightPx}px`,
  });
}

function clearPage(pageHost: HTMLElement): void {
  pageHost.removeClass(READER_PAGE_CLASS);
  pageHost.removeClass("is-phone");
  pageHost.removeClass("is-instant");
  for (const prop of PAGE_PROPS) pageHost.style.removeProperty(prop);
}

function prefersReduced(query: MediaQueryList | null, override: boolean | undefined): boolean {
  if (query?.matches) return true;
  return override === true;
}

function pageList(pageHost: HTMLElement | readonly HTMLElement[]): HTMLElement[] {
  if (isPageList(pageHost)) return [...pageHost];
  return [pageHost];
}

function isPageList(
  value: HTMLElement | readonly HTMLElement[],
): value is readonly HTMLElement[] {
  return Array.isArray(value);
}

function shortcutArmed(
  shortcutRoot: HTMLElement | undefined,
  controlEl: HTMLElement,
  pages: readonly HTMLElement[],
): boolean {
  const active = controlEl.ownerDocument.activeElement;
  if (!active?.instanceOf(Node)) return false;
  if (shortcutRoot) return shortcutRoot.contains(active);
  if (controlEl.contains(active)) return true;
  return pages.some((page) => page.contains(active));
}

function keyTarget(event: KeyboardEvent): Node | null {
  if (event.targetNode) return event.targetNode;
  const target = event.target;
  if (target instanceof Node) return target;
  return null;
}

function isTextField(target: Node | null): boolean {
  if (!target?.instanceOf(HTMLElement)) return false;
  if (target.instanceOf(HTMLInputElement) || target.instanceOf(HTMLTextAreaElement)) return true;
  return target.isContentEditable;
}

function ownerView(node: HTMLElement): Window | null {
  return node.ownerDocument.defaultView;
}
