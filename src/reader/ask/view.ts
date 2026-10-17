// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { marginSourcesFromCanvas } from "./canvas.ts";
import type { AskScope } from "./provider.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { placeMarginNotes, readerChrome, spreadSide, type MarginNote, type MarginSide, type PlacedMarginNote, type ReaderChrome, type ReaderSurface } from "./remarks.ts";

export function marginNote(input: {
  language: Language;
  id: string;
  kind: "remark" | "ask";
  page: number;
  side: MarginSide;
  top: number;
  body: string;
}): MarginNote {
  const title = input.kind === "ask"
    ? t("reader.askLabel", input.language, { page: input.page })
    : t("reader.remarkLabel", input.language, { page: input.page });
  return {
    id: input.id,
    kind: input.kind,
    page: input.page,
    side: input.side,
    top: input.top,
    title,
    body: input.body,
  };
}

/** Cards on this page, placed in the margin. Side defaults to the spread. */
export function marginNotesForPage(input: {
  language: Language;
  canvasJson: string | null;
  page: number;
  surface: ReaderSurface;
  tops?: Record<string, number>;
  sides?: Record<string, MarginSide>;
}): MarginNote[] {
  return marginSourcesFromCanvas(input.canvasJson, input.page).map((source) =>
    marginNote({
      language: input.language,
      id: source.id,
      kind: source.kind,
      page: source.page,
      side: input.sides?.[source.id] ?? spreadSide(source.page, input.surface),
      top: input.tops?.[source.id] ?? 0,
      body: source.body,
    }),
  );
}

export interface AskTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AskPanelView {
  presentation: "panel" | "sheet";
  title: string;
  subtitle: string;
  scope: AskScope;
  turns: AskTurn[];
  saved: boolean;
  savedLabel: string;
  secretHint: string;
  confirm: string | null;
  placeholder: string;
  scopes: { id: AskScope; label: string }[];
}

export interface ReaderAskView {
  theater: boolean;
  surface: ReaderSurface;
  chrome: ReaderChrome;
  margins: PlacedMarginNote[];
  slip: PlacedMarginNote | null;
  selection: { left: number; top: number } | null;
  panel: AskPanelView | null;
  labels: {
    highlight: string;
    remark: string;
    ask: string;
    send: string;
    openCanvas: string;
  };
}

export function readerAskView(input: {
  language: Language;
  theater: boolean;
  surface: ReaderSurface;
  askEnabled: boolean;
  hasSelection: boolean;
  askOpen: boolean;
  pageHeight: number;
  notes: MarginNote[];
  expandedId?: string | null;
  selectionAnchor?: { left: number; top: number } | null;
  bookTitle: string;
  page: number;
  scope: AskScope;
  turns: AskTurn[];
  savedToCanvas: boolean;
  secretReady: boolean;
  confirmCharacters?: number | null;
}): ReaderAskView {
  const language = input.language;
  const chrome = readerChrome({
    theater: input.theater,
    surface: input.surface,
    askEnabled: input.askEnabled,
    hasSelection: input.hasSelection,
    askOpen: input.askOpen,
  });
  const margins = placeMarginNotes({
    theater: input.theater,
    surface: input.surface,
    pageHeight: input.pageHeight,
    notes: input.notes,
  });
  const slip = input.surface === "phone" && !input.theater
    ? margins.find((note) => note.id === input.expandedId) ?? null
    : null;
  const panel = chrome.askPresentation === "hidden"
    ? null
    : {
        presentation: chrome.askPresentation,
        title: t("reader.askTitle", language),
        subtitle: t("reader.pageLabel", language, {
          title: input.bookTitle,
          page: input.page,
        }),
        scope: input.scope,
        turns: input.turns,
        saved: input.savedToCanvas,
        savedLabel: t("reader.savedCanvas", language),
        secretHint: input.secretReady
          ? t("reader.secretReady", language)
          : t("reader.secretMissing", language),
        confirm: input.scope === "book" && input.confirmCharacters != null
          ? t("reader.confirmBook", language, { chars: input.confirmCharacters })
          : null,
        placeholder: input.surface === "phone"
          ? t("reader.askPlaceholderPhone", language)
          : t("reader.askPlaceholder", language),
        scopes: [
          { id: "page" as const, label: t("reader.scopePage", language) },
          { id: "selection" as const, label: t("reader.scopeSelection", language) },
          { id: "book" as const, label: t("reader.scopeBook", language) },
        ],
      };
  return {
    theater: input.theater,
    surface: input.surface,
    chrome,
    margins,
    slip,
    selection: chrome.showSelectionBar
      ? (input.selectionAnchor ?? { left: 16, top: 16 })
      : null,
    panel,
    labels: {
      highlight: t("reader.highlight", language),
      remark: t("reader.remark", language),
      ask: t("reader.ask", language),
      send: t("reader.send", language),
      openCanvas: t("reader.openCanvas", language),
    },
  };
}
