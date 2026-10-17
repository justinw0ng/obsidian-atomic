import { t, type Language } from "../../i18n";
import type { LinkedBookFile } from "./link";

export type ChooserChoice = "notes" | "book" | "cancel";

type ChooserSession = {
  overlay: HTMLElement;
  onKey: (event: KeyboardEvent) => void;
  view: Window;
};

let session: ChooserSession | null = null;

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
  const sheet = overlay.createDiv({
    cls: options.phone
      ? "atomic-chooser fitness-plugin is-phone"
      : "atomic-chooser fitness-plugin",
  });
  sheet.createDiv({ cls: "atomic-chooser-grab" });

  const notes = sheet.createEl("button", {
    cls: "atomic-chooser-row is-primary",
    attr: { type: "button", "data-testid": "atomic-chooser-notes", "data-chooser-act": "notes" },
  });
  const notesLabel = notes.createSpan({ cls: "atomic-chooser-label" });
  notesLabel.createEl("b", { text: t("view.reader.openNotes", options.language) });
  notesLabel.createSpan({ text: t("view.reader.openNotesHint", options.language) });
  notes.createSpan({ cls: "atomic-chooser-kbd", text: "↵" });

  if (options.file) {
    const book = sheet.createEl("button", {
      cls: "atomic-chooser-row",
      attr: { type: "button", "data-testid": "atomic-chooser-book", "data-chooser-act": "book" },
    });
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
    if (target === overlay) {
      choose("cancel");
      return;
    }
    const act = target.closest("[data-chooser-act]")?.getAttribute("data-chooser-act");
    if (act === "notes" || act === "book" || act === "cancel") choose(act);
  });

  view.addEventListener("keydown", onKey, true);
  session = { overlay, onKey, view };
  notes.focus();
}
