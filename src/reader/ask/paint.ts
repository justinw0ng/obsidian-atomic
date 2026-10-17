import type { AskScope } from "./provider.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerSlotForGutter, type PlacedMarginNote } from "./remarks.ts";
import type { ReaderAskView } from "./view.ts";

export interface ReaderAskHandlers {
  onHighlight?: () => void;
  onRemark?: () => void;
  onAsk?: () => void;
  onNote?: (id: string) => void;
  onScope?: (scope: AskScope) => void;
  onSend?: (question: string) => void;
  onConfirmBook?: () => void;
  onOpenCanvas?: () => void;
}

function setVar(el: HTMLElement, name: string, value: string): void {
  el.setCssProps({ [name]: value });
}

function clearRoot(host: HTMLElement): void {
  const stale: Element[] = [];
  for (const child of Array.from(host.children)) {
    if (child.getAttribute("data-atomic-ask-root") === "true") stale.push(child);
  }
  for (const child of stale) child.remove();
}

function button(doc: Document, className: string, label: string, onClick?: () => void): HTMLButtonElement {
  const el = doc.createElement("button");
  el.type = "button";
  el.className = className;
  el.textContent = label;
  if (onClick) el.addEventListener("click", onClick);
  return el;
}

function sendIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M5 12h14M13 6l6 6-6 6");
  svg.append(path);
  return svg;
}

function paintNote(doc: Document, note: PlacedMarginNote, onNote?: (id: string) => void): HTMLButtonElement {
  const dot = note.presentation === "dot";
  const el = doc.createElement("button");
  el.type = "button";
  el.className = dot
    ? "atomic-mdot"
    : note.kind === "ask"
      ? "atomic-remark is-ai"
      : "atomic-remark";
  el.setAttribute("data-testid", dot ? "atomic-mdot" : "atomic-remark");
  el.setAttribute("data-note", note.id);
  el.setAttribute("data-kind", note.kind);
  setVar(el, "--atomic-remark-top", `${Math.round(note.top)}px`);
  if (dot) {
    el.setAttribute("aria-label", note.title);
  } else {
    const title = doc.createElement("strong");
    title.textContent = note.title;
    const body = doc.createElement("span");
    body.textContent = note.body;
    el.append(title, body);
  }
  if (onNote) el.addEventListener("click", () => onNote(note.id));
  return el;
}

function isHtmlElement(node: Element | null): node is HTMLElement {
  if (!node || !("instanceOf" in node)) return false;
  return (node as Node).instanceOf(HTMLElement);
}

function paintSlip(doc: Document, root: HTMLElement, note: PlacedMarginNote): void {
  const slip = doc.createElement("div");
  slip.className = "atomic-slip";
  slip.setAttribute("data-kind", note.kind === "ask" ? "ai" : "quote");
  slip.setAttribute("data-testid", "atomic-slip");
  setVar(slip, "--atomic-remark-top", `${Math.round(note.top)}px`);
  const title = doc.createElement("strong");
  title.className = "atomic-caption";
  title.textContent = note.title;
  const body = doc.createElement("p");
  body.className = "atomic-hint";
  body.textContent = note.body;
  slip.append(title, body);
  root.append(slip);
}

function paintSelection(doc: Document, root: HTMLElement, view: ReaderAskView, handlers: ReaderAskHandlers): void {
  if (!view.selection || !view.chrome.showSelectionBar) return;
  const bar = doc.createElement("div");
  bar.className = "atomic-selbar";
  bar.setAttribute("data-testid", "atomic-selbar");
  setVar(bar, "--atomic-sel-left", `${Math.round(view.selection.left)}px`);
  setVar(bar, "--atomic-sel-top", `${Math.round(view.selection.top)}px`);
  const glass = doc.createElement("div");
  glass.className = "atomic-glass";
  if (view.chrome.showHighlight) {
    glass.append(button(doc, "atomic-btn is-small", view.labels.highlight, handlers.onHighlight));
  }
  if (view.chrome.showRemark) {
    glass.append(button(doc, "atomic-btn is-small", view.labels.remark, handlers.onRemark));
  }
  if (view.chrome.showAsk) {
    glass.append(button(doc, "atomic-btn is-small is-primary", view.labels.ask, handlers.onAsk));
  }
  bar.append(glass);
  root.append(bar);
}

function paintPanel(doc: Document, root: HTMLElement, view: ReaderAskView, handlers: ReaderAskHandlers): void {
  const panel = view.panel;
  if (!panel) return;
  const el = doc.createElement("div");
  el.className = panel.presentation === "sheet" ? "atomic-ask is-sheet" : "atomic-ask";
  el.setAttribute("data-testid", "atomic-ask");
  if (panel.presentation === "sheet") {
    const grab = doc.createElement("div");
    grab.className = "atomic-sheet-grab";
    el.append(grab);
  }
  const title = doc.createElement("h4");
  title.textContent = panel.title;
  const subtitle = doc.createElement("span");
  subtitle.className = "atomic-readout";
  subtitle.textContent = panel.subtitle;
  el.append(title, subtitle);
  if (panel.saved) {
    const saved = doc.createElement("div");
    saved.className = "atomic-saved";
    const dot = doc.createElement("i");
    const label = doc.createElement("span");
    label.className = "atomic-readout is-live";
    label.textContent = panel.savedLabel;
    saved.append(dot, label);
    el.append(saved);
  }
  const seg = doc.createElement("div");
  seg.className = "atomic-seg";
  for (const scope of panel.scopes) {
    const option = button(doc, scope.id === panel.scope ? "atomic-seg-option is-on" : "atomic-seg-option", scope.label, () => {
      handlers.onScope?.(scope.id);
    });
    option.setAttribute("aria-pressed", scope.id === panel.scope ? "true" : "false");
    seg.append(option);
  }
  el.append(seg);
  if (panel.confirm) {
    const confirm = doc.createElement("p");
    confirm.className = "atomic-hint";
    confirm.textContent = panel.confirm;
    el.append(confirm, button(doc, "atomic-btn is-small", view.labels.send, handlers.onConfirmBook));
  }
  const thread = doc.createElement("div");
  thread.className = "atomic-thread";
  for (const turn of panel.turns) {
    const bubble = doc.createElement("div");
    bubble.className = turn.role === "user" ? "atomic-bubble is-user" : "atomic-bubble atomic-answer";
    bubble.textContent = turn.text;
    thread.append(bubble);
  }
  if (panel.saved) {
    const open = button(doc, "atomic-link", view.labels.openCanvas, handlers.onOpenCanvas);
    thread.append(open);
  }
  const compose = doc.createElement("div");
  compose.className = "atomic-compose";
  const field = doc.createElement("textarea");
  field.rows = 1;
  field.placeholder = panel.placeholder;
  field.setAttribute("aria-label", panel.title);
  const send = doc.createElement("button");
  send.type = "button";
  send.className = "atomic-btn is-primary is-icon";
  send.setAttribute("aria-label", view.labels.send);
  send.append(sendIcon(doc));
  send.addEventListener("click", () => {
    const question = field.value.trim();
    if (question) handlers.onSend?.(question);
  });
  compose.append(field, send);
  const hint = doc.createElement("p");
  hint.className = "atomic-hint";
  hint.textContent = panel.secretHint;
  el.append(thread, compose, hint);
  root.append(el);
}

function paintSlot(
  host: HTMLElement,
  view: ReaderAskView,
  handlers: ReaderAskHandlers,
  slot: "ask" | "margin",
): void {
  const doc = host.ownerDocument;
  if (!doc) return;
  host.setAttribute("data-atomic-ask-host", "true");
  clearRoot(host);
  const root = doc.createElement("div");
  root.setAttribute("data-atomic-ask-root", "true");
  root.setAttribute("data-testid", slot === "margin" ? "atomic-reader-margin" : "atomic-reader-ask");
  root.setAttribute("data-theater", view.theater ? "on" : "off");
  const phone = view.surface === "phone" ? " is-phone" : "";
  const theater = view.theater ? " is-theater" : "";
  root.className = `fitness-plugin atomic-reader-ask${phone}${theater}`;
  if (view.chrome.showMargins) {
    for (const note of view.margins) {
      if (readerSlotForGutter(note.gutter) === slot) root.append(paintNote(doc, note, handlers.onNote));
    }
  }
  if (slot === "ask") {
    if (view.slip && readerSlotForGutter(view.slip.gutter) === "ask") paintSlip(doc, root, view.slip);
    paintSelection(doc, root, view, handlers);
    paintPanel(doc, root, view, handlers);
    const panel = root.querySelector(".atomic-ask");
    if (panel && isHtmlElement(panel) && view.panel?.presentation === "sheet") {
      const reader = host.closest(".atomic-reader");
      const width = reader ? Math.round(reader.getBoundingClientRect().width) : 0;
      if (width > 0) panel.setCssProps({ "--atomic-ask-span": `${width}px` });
    }
  }
  host.append(root);
}

/**
 * Paint remarks into the shell's ask slot and, on desktop, its margin gutter.
 * The shell owns the page. `theater` on the view hides Highlight, Remark, and Ask.
 */
export function paintReaderAsk(host: HTMLElement, view: ReaderAskView, handlers: ReaderAskHandlers = {}): void {
  const slot = host.getAttribute("data-reader-slot") === "margin" ? "margin" : "ask";
  paintSlot(host, view, handlers, slot);
  if (slot !== "ask") return;
  const margin = host.closest(".atomic-reader")?.querySelector("[data-reader-slot='margin']") ?? null;
  if (isHtmlElement(margin)) paintSlot(margin, view, handlers, "margin");
  const spread = host.closest(".atomic-reader-spread");
  const reader = host.closest(".atomic-reader");
  const open = Boolean(view.panel || view.slip || view.selection);
  if (spread) spread.classList.toggle("is-ask-open", open);
  if (reader) reader.classList.toggle("is-ask-panel", Boolean(view.panel));
}
