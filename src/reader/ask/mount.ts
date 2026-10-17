import { Notice, requireApiVersion, TFile } from "obsidian";
import type FitnessPlugin from "../../main";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../../i18n/index.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readEpub } from "../shell/epub.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageBox, spreadPages } from "../shell/model.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { registerReaderAsk, type ReaderSession } from "../shell/mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { runAsk, type AskRunResult } from "./ask.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { applyBookCard, ensureRelatedCanvas, readRelatedCanvas, type BookCard } from "./canvas.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { obsidianHttpPort, obsidianSecretPort } from "./obsidian-port.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { paintReaderAsk, type ReaderAskHandlers } from "./paint.ts";
import type { AskScope } from "./provider.ts";
import type { ReaderSurface } from "./remarks.ts";
import type { SecretPort } from "./settings-record.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { marginNotesForPage, readerAskView, type AskTurn } from "./view.ts";

const SECRET_API = "1.11.4";

type Mark = {
  text: string;
  page: number;
  left: number;
  top: number;
};

type AskLive = {
  scope: AskScope;
  turns: AskTurn[];
  askOpen: boolean;
  saved: boolean;
  expandedId: string | null;
  selection: Mark | null;
  confirmCharacters: number | null;
  pendingQuestion: string;
};

const liveByNote = new Map<string, AskLive>();
const paintTokens = new WeakMap<HTMLElement, number>();

const EMPTY_SECRETS: SecretPort = {
  get: () => null,
  set: () => undefined,
  list: () => [],
};

function liveFor(path: string): AskLive {
  const existing = liveByNote.get(path);
  if (existing) return existing;
  const created: AskLive = {
    scope: "page",
    turns: [],
    askOpen: false,
    saved: false,
    expandedId: null,
    selection: null,
    confirmCharacters: null,
    pendingQuestion: "",
  };
  liveByNote.set(path, created);
  return created;
}

export function resetAskSession(): void {
  liveByNote.clear();
}

function asElement(node: EventTarget | null): HTMLElement | null {
  if (!node || !("instanceOf" in node)) return null;
  const current = node as Node;
  if (current.instanceOf(HTMLElement)) return current;
  const parent = current.parentElement;
  if (parent?.instanceOf(HTMLElement)) return parent;
  return null;
}

function readerOf(slot: HTMLElement): HTMLElement | null {
  return asElement(slot.closest(".atomic-reader"));
}

function surfaceOf(root: HTMLElement | null): ReaderSurface {
  return root?.classList.contains("is-phone") ? "phone" : "desktop";
}

function theaterOn(root: HTMLElement | null): boolean {
  if (!root) return false;
  return root.classList.contains("is-theater") || root.getAttribute("data-theater") === "on";
}

function pagesOnScreen(session: ReaderSession): number[] {
  const pair = spreadPages(session.page, session.total);
  const pages = [pair.verso, pair.recto].filter((page): page is number => page != null);
  if (pages.length > 0) return pages;
  return session.page >= 1 ? [session.page] : [];
}

function textOfPage(root: HTMLElement, page: number): string {
  const nodes = root.querySelectorAll(`[data-testid="atomic-reader-page"][data-page="${page}"] p`);
  const parts: string[] = [];
  nodes.forEach((node) => {
    const text = node.textContent?.trim();
    if (text) parts.push(text);
  });
  return parts.join("\n");
}

function syncSelection(root: HTMLElement, notePath: string, target: HTMLElement | null): boolean {
  if (target?.closest("[data-reader-slot]")) return false;
  const selection = root.ownerDocument.defaultView?.getSelection();
  const text = selection && !selection.isCollapsed
    ? selection.toString().replace(/\s+/g, " ").trim()
    : "";
  const state = liveFor(notePath);
  if (!text || !selection || selection.rangeCount === 0) {
    if (!state.selection) return false;
    state.selection = null;
    return true;
  }
  const anchor = asElement(selection.anchorNode);
  if (!anchor || !root.contains(anchor) || anchor.closest("[data-reader-slot]")) return false;
  const pageNode = anchor.closest("[data-testid='atomic-reader-page']");
  const page = Number(pageNode?.getAttribute("data-page") ?? "");
  if (!Number.isInteger(page) || page < 1) return false;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const next: Mark = {
    text: text.slice(0, 4_000),
    page,
    left: rect.left + rect.width / 2,
    top: rect.top,
  };
  const prev = state.selection;
  if (prev && prev.text === next.text && prev.page === next.page && Math.abs(prev.left - next.left) < 2) {
    return false;
  }
  state.selection = next;
  return true;
}

async function canvasJsonFor(plugin: FitnessPlugin, notePath: string): Promise<string | null> {
  if (!notePath) return null;
  const note = await plugin.data.readBody(notePath);
  const canvasPath = readRelatedCanvas(note);
  if (!canvasPath) return null;
  const body = await plugin.data.readBody(canvasPath);
  return body.trim() ? body : null;
}

async function bookPassage(plugin: FitnessPlugin, session: ReaderSession): Promise<string> {
  if (session.kind !== "epub" || !session.filePath) return "";
  const file = plugin.app.vault.getAbstractFileByPath(session.filePath);
  if (!(file instanceof TFile)) return "";
  try {
    const bytes = new Uint8Array(await plugin.app.vault.readBinary(file));
    const book = await readEpub(bytes);
    return book.blocks.map((block) => block.text).join("\n");
  } catch {
    return "";
  }
}

async function writeCard(plugin: FitnessPlugin, session: ReaderSession, card: BookCard): Promise<boolean> {
  const note = await plugin.data.readBody(session.notePath);
  const linked = readRelatedCanvas(note);
  const existing = linked ? await plugin.data.readBody(linked) : "";
  const written = applyBookCard({
    notePath: session.notePath,
    noteMarkdown: note,
    canvasJson: existing.trim() ? existing : null,
    card,
  });
  if (!written.ok) return false;
  await plugin.data.writeNote(written.canvasPath, written.canvasJson);
  if (!linked) {
    await plugin.data.processNote(session.notePath, (current) => ensureRelatedCanvas(current, written.canvasPath));
  }
  return true;
}

function noticeFor(result: AskRunResult, language: Language): string | null {
  switch (result.status) {
    case "ok":
      return t("notice.askAnswered", language);
    case "confirm-book":
    case "need-question":
      return null;
    case "ask-off":
      return t("settings.askUpdate", language);
    case "need-secret":
      return t("notice.askNeedSecret", language);
    case "bad-url":
      return t("notice.askInvalidUrl", language);
    case "need-passage":
    case "provider-error":
    case "canvas-error":
      return t("notice.askFailed", language);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

async function paintSession(plugin: FitnessPlugin, slot: HTMLElement, session: ReaderSession): Promise<void> {
  const token = (paintTokens.get(slot) ?? 0) + 1;
  paintTokens.set(slot, token);
  let canvasJson: string | null = null;
  try {
    canvasJson = await canvasJsonFor(plugin, session.notePath);
  } catch {
    canvasJson = null;
  }
  if (paintTokens.get(slot) !== token || !slot.isConnected) return;

  const root = readerOf(slot);
  const surface = surfaceOf(root);
  const state = liveFor(session.notePath);
  const language = plugin.settings.language;
  const notes = pagesOnScreen(session).flatMap((page) =>
    marginNotesForPage({ language, canvasJson, page, surface }),
  );
  const secrets = obsidianSecretPort(plugin.app);
  const secretReady = Boolean(secrets && plugin.settings.ask.secretName && secrets.get(plugin.settings.ask.secretName));
  const view = readerAskView({
    language,
    theater: theaterOn(root),
    surface,
    askEnabled: requireApiVersion(SECRET_API),
    hasSelection: Boolean(state.selection),
    askOpen: state.askOpen,
    pageHeight: readerPageBox(session.size).h,
    notes,
    expandedId: state.expandedId,
    selectionAnchor: state.selection ? { left: state.selection.left, top: state.selection.top } : null,
    bookTitle: session.title,
    page: state.selection?.page ?? session.page,
    scope: state.scope,
    turns: state.turns,
    savedToCanvas: state.saved,
    secretReady,
    confirmCharacters: state.confirmCharacters,
  });
  paintReaderAsk(slot, view, handlersFor(plugin, slot, session));
}

function handlersFor(plugin: FitnessPlugin, slot: HTMLElement, session: ReaderSession): ReaderAskHandlers {
  return {
    onHighlight: () => {
      void saveMark(plugin, slot, session, "highlight");
    },
    onRemark: () => {
      void saveMark(plugin, slot, session, "remark");
    },
    onAsk: () => {
      const state = liveFor(session.notePath);
      state.askOpen = true;
      if (state.selection) state.scope = "selection";
      void paintSession(plugin, slot, session);
    },
    onNote: (id) => {
      const state = liveFor(session.notePath);
      state.expandedId = state.expandedId === id ? null : id;
      void paintSession(plugin, slot, session);
    },
    onScope: (scope) => {
      const state = liveFor(session.notePath);
      state.scope = scope;
      state.confirmCharacters = null;
      void paintSession(plugin, slot, session);
    },
    onSend: (question) => {
      void sendQuestion(plugin, slot, session, question, false);
    },
    onConfirmBook: () => {
      const question = liveFor(session.notePath).pendingQuestion;
      void sendQuestion(plugin, slot, session, question, true);
    },
    onOpenCanvas: () => {
      void openCanvas(plugin, session);
    },
  };
}

async function saveMark(
  plugin: FitnessPlugin,
  slot: HTMLElement,
  session: ReaderSession,
  kind: "highlight" | "remark",
): Promise<void> {
  const state = liveFor(session.notePath);
  const quote = state.selection?.text ?? "";
  if (!quote) return;
  const ok = await writeCard(plugin, session, {
    kind,
    page: state.selection?.page ?? session.page,
    quote,
    body: quote,
  });
  const language = plugin.settings.language;
  if (!ok) {
    new Notice(t("notice.askFailed", language));
    return;
  }
  state.selection = null;
  state.saved = true;
  new Notice(t("reader.savedCanvas", language));
  void paintSession(plugin, slot, session);
}

async function sendQuestion(
  plugin: FitnessPlugin,
  slot: HTMLElement,
  session: ReaderSession,
  question: string,
  confirmed: boolean,
): Promise<void> {
  const state = liveFor(session.notePath);
  state.pendingQuestion = question;
  const language = plugin.settings.language;
  const note = await plugin.data.readBody(session.notePath);
  const linked = readRelatedCanvas(note);
  const existing = linked ? await plugin.data.readBody(linked) : "";
  const root = readerOf(slot);
  const page = state.selection?.page ?? session.page;
  const bookText = state.scope === "book" ? await bookPassage(plugin, session) : "";
  const result = await runAsk({
    askEnabled: requireApiVersion(SECRET_API),
    settings: plugin.settings.ask,
    secrets: obsidianSecretPort(plugin.app) ?? EMPTY_SECRETS,
    http: obsidianHttpPort(),
    notePath: session.notePath,
    noteMarkdown: note,
    canvasJson: existing.trim() ? existing : null,
    request: {
      scope: state.scope,
      page,
      question,
      pageText: root ? textOfPage(root, page) : "",
      selection: state.selection?.text ?? "",
      bookText,
      bookConfirmed: confirmed,
      quote: state.selection?.text || question,
    },
  });
  if (result.status === "ok") {
    await plugin.data.writeNote(result.canvasPath, result.canvasJson);
    if (readRelatedCanvas(note) !== result.canvasPath) {
      await plugin.data.processNote(session.notePath, (current) => ensureRelatedCanvas(current, result.canvasPath));
    }
    state.turns = [
      ...state.turns,
      { role: "user", text: question },
      { role: "assistant", text: result.answer },
    ];
    state.saved = true;
    state.askOpen = true;
    state.confirmCharacters = null;
    state.expandedId = result.cardId;
  } else if (result.status === "confirm-book") {
    state.confirmCharacters = result.characters;
    state.askOpen = true;
  }
  const message = noticeFor(result, language);
  if (message) new Notice(message);
  void paintSession(plugin, slot, session);
}

async function openCanvas(plugin: FitnessPlugin, session: ReaderSession): Promise<void> {
  const note = await plugin.data.readBody(session.notePath);
  const canvasPath = readRelatedCanvas(note);
  if (canvasPath) await plugin.data.openPath(canvasPath);
}

function watchSelection(plugin: FitnessPlugin, slot: HTMLElement, session: ReaderSession): void {
  const root = readerOf(slot);
  if (!root || root.getAttribute("data-ask-listen") === "on") return;
  root.setAttribute("data-ask-listen", "on");
  const onPointer = (event: Event) => {
    const changed = syncSelection(root, session.notePath, asElement(event.target));
    if (changed) void paintSession(plugin, slot, session);
  };
  root.addEventListener("mouseup", onPointer);
  root.addEventListener("keyup", onPointer);
}

/** Register Ask on the shell slot. The shell calls this; Ask does not paint the page. */
export function registerAskOnShell(plugin: FitnessPlugin): void {
  registerReaderAsk({
    attach(slot, session) {
      watchSelection(plugin, slot, session);
      void paintSession(plugin, slot, session);
    },
  });
}
