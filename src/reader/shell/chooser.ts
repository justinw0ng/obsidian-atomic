import { t, type Language } from "../../i18n";
import type { LinkedBookFile } from "./link";

export type ChooserChoice = "notes" | "book" | "cancel";

type ChooserSession = {
  overlay: HTMLElement;
  onKey: (event: KeyboardEvent) => void;
  onPlace: () => void;
  view: Window;
  observer: ResizeObserver | null;
};

let session: ChooserSession | null = null;

function rowIcon(doc: Document | null, kind: "notes" | "book"): HTMLElement {
  const owner = doc ?? activeDocument;
  const host = owner.createElement("span");
  host.className = "atomic-chooser-ico";
  host.setAttribute("aria-hidden", "true");
  const svg = owner.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const paths = kind === "notes"
    ? ["M4 20h4l10.2-10.2a1.6 1.6 0 0 0 0-2.3l-1.7-1.7a1.6 1.6 0 0 0-2.3 0L4 16v4z", "M13 7l4 4"]
    : ["M12 6.2C10.2 5 8.2 4.6 5.6 4.6H4v13.4h1.8c2.2 0 4 .5 6.2 1.6 2.2-1.1 4-1.6 6.2-1.6H20V4.6h-1.6c-2.6 0-4.6.4-6.4 1.6z", "M12 6.2v13.4"];
  for (const d of paths) {
    const path = owner.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  host.append(svg);
  return host;
}

function asHtml(node: Element | null): HTMLElement | null {
  if (!node || !("instanceOf" in node)) return null;
  const current = node as Node;
  return current.instanceOf(HTMLElement) ? current : null;
}

/** The open note, not the ribbon or the tab strip. */
function notePane(doc: Document): HTMLElement | null {
  return asHtml(doc.querySelector(".workspace-leaf.mod-active .view-content"));
}

function placeChooser(overlay: HTMLElement): void {
  const doc = overlay.ownerDocument;
  const view = doc.defaultView;
  const pane = notePane(doc);
  const rect = pane?.getBoundingClientRect();
  const width = rect && rect.width > 1 ? rect.width : (view?.innerWidth ?? 0);
  const height = rect && rect.height > 1 ? rect.height : (view?.innerHeight ?? 0);
  const top = rect && rect.height > 1 ? rect.top : 0;
  const left = rect && rect.width > 1 ? rect.left : 0;
  overlay.setCssProps({
    "--atomic-chooser-top": `${Math.round(top)}px`,
    "--atomic-chooser-left": `${Math.round(left)}px`,
    "--atomic-chooser-width": `${Math.round(width)}px`,
    "--atomic-chooser-height": `${Math.round(height)}px`,
  });
}

function overlayBody(owner: Document | undefined): HTMLElement {
  if (owner?.body && owner === activeDocument) return activeDocument.body;
  if (owner?.body) return owner.body;
  return activeDocument.body;
}

function elementTarget(target: EventTarget | null): HTMLElement | null {
  if (!target || !("instanceOf" in target)) return null;
  const node = target as Node;
  return node.instanceOf(HTMLElement) ? node : null;
}

export function closeBookChooser(): void {
  const current = session;
  if (!current) return;
  session = null;
  current.view.removeEventListener("keydown", current.onKey, true);
  current.view.removeEventListener("resize", current.onPlace);
  current.observer?.disconnect();
  current.overlay.detach();
}

export function bookChooserIsOpen(): boolean {
  return session != null && session.overlay.isConnected;
}

/**
 * Chooser lives on the window body, not under a MarkdownRenderChild.
 * Unloading the bookshelf block must not remove it.
 */
export function openBookChooser(options: {
  ownerDocument: Document | undefined;
  title: string;
  file: LinkedBookFile | null;
  language: Language;
  phone: boolean;
  onChoose: (choice: ChooserChoice) => void;
}): void {
  closeBookChooser();
  let settled = false;
  const body = overlayBody(options.ownerDocument);
  const view = body.win;
  const overlay = body.createDiv({
    cls: "atomic-chooser-scrim",
    attr: {
      "data-testid": "atomic-chooser",
      "data-overlay-host": "window",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": options.title,
    },
  });
  if (options.phone) overlay.addClass("is-phone");
  const veil = overlay.createDiv({
    cls: options.phone ? "atomic-chooser-veil is-phone" : "atomic-chooser-veil",
    attr: { "data-testid": "atomic-chooser-veil" },
  });
  const sheet = veil.createDiv({
    cls: options.phone
      ? "atomic-chooser fitness-plugin is-phone"
      : "atomic-chooser fitness-plugin",
  });
  sheet.createDiv({ cls: "atomic-chooser-grab" });

  const notes = sheet.createEl("button", {
    cls: "atomic-chooser-row is-primary",
    attr: { type: "button", "data-testid": "atomic-chooser-notes", "data-chooser-act": "notes" },
  });
  notes.append(rowIcon(sheet.ownerDocument, "notes"));
  const notesLabel = notes.createSpan({ cls: "atomic-chooser-label" });
  notesLabel.createEl("b", { text: t("view.reader.openNotes", options.language) });
  notesLabel.createSpan({ text: t("view.reader.openNotesHint", options.language) });
  notes.createSpan({ cls: "atomic-chooser-kbd", text: "↵" });

  if (options.file) {
    const book = sheet.createEl("button", {
      cls: "atomic-chooser-row",
      attr: { type: "button", "data-testid": "atomic-chooser-book", "data-chooser-act": "book" },
    });
    book.append(rowIcon(sheet.ownerDocument, "book"));
    const bookLabel = book.createSpan({ cls: "atomic-chooser-label" });
    bookLabel.createEl("b", { text: t("view.reader.openBook", options.language) });
    const fileName = options.file.path.split("/").pop() ?? options.file.path;
    bookLabel.createSpan({ text: fileName });
  }

  const cancel = sheet.createEl("button", {
    cls: "atomic-chooser-cancel",
    attr: { type: "button", "data-testid": "atomic-chooser-cancel", "data-chooser-act": "cancel" },
  });
  cancel.setText(t("view.reader.cancel", options.language));

  const choose = (choice: ChooserChoice): void => {
    if (settled) return;
    settled = true;
    closeBookChooser();
    options.onChoose(choice);
  };

  const onKey = (event: KeyboardEvent): void => {
    if (!session || session.overlay !== overlay) return;
    if (event.key === "Escape") {
      event.preventDefault();
      choose("cancel");
      return;
    }
    if (event.key !== "Enter" || event.repeat) return;
    const target = elementTarget(event.target);
    const act = target?.getAttribute("data-chooser-act");
    if (act === "book" || act === "cancel") return;
    event.preventDefault();
    choose("notes");
  };

  overlay.addEventListener("click", (event) => {
    const target = elementTarget(event.target);
    if (!target) return;
    if (target === overlay || target === veil) {
      choose("cancel");
      return;
    }
    const act = target.closest("[data-chooser-act]")?.getAttribute("data-chooser-act");
    if (act === "notes" || act === "book" || act === "cancel") choose(act);
  });

  const onPlace = (): void => placeChooser(overlay);
  onPlace();
  const pane = notePane(overlay.ownerDocument);
  const observer = pane ? new ResizeObserver(onPlace) : null;
  if (pane && observer) observer.observe(pane);
  view.addEventListener("keydown", onKey, true);
  view.addEventListener("resize", onPlace);
  session = { overlay, onKey, onPlace, view, observer };
  notes.focus();
}
