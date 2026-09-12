import {
  cueCardEventShouldToggle,
  isCueCardToggleKey,
  isCueLightboxDismissKey,
} from "../util/cue-card-fan";

const LIGHTBOX_LABEL_ID = "atomic-cue-lightbox-label";

type LightboxSession = {
  source: HTMLElement;
  overlay: HTMLElement;
  card: HTMLElement;
  view: Window;
  onKey: (event: KeyboardEvent) => void;
};

let session: LightboxSession | null = null;

export function cueLightboxIsOpen(source?: HTMLElement): boolean {
  if (!session) return false;
  return source ? session.source === source : true;
}

export function closeCueLightbox(restoreFocus = false): void {
  const current = session;
  if (!current) return;
  session = null;
  current.view.removeEventListener("keydown", current.onKey, true);
  current.source.removeClass("is-open");
  current.source.setAttr("aria-expanded", "false");
  current.overlay.detach();
  if (restoreFocus && current.source.isConnected) current.source.focus();
}

export function toggleCueLightbox(source: HTMLElement): void {
  if (cueLightboxIsOpen(source)) {
    closeCueLightbox(true);
    return;
  }
  openCueLightbox(source);
}

function openCueLightbox(source: HTMLElement): void {
  closeCueLightbox();
  const doc = source.ownerDocument;
  const view = doc.defaultView;
  if (!view) return;

  const originEl = source.querySelector(".atomic-cue-sheet") ?? source;
  const origin = originEl.getBoundingClientRect();
  const overlay = source.createDiv({
    cls: "fitness-plugin atomic-cues atomic-cue-lightbox",
    attr: {
      "data-testid": "atomic-cue-lightbox",
    },
  });
  overlay.createDiv({
    cls: "atomic-cue-lightbox-backdrop",
    attr: { "data-testid": "atomic-cue-lightbox-backdrop" },
  });
  const card = overlay.createDiv({
    cls: "atomic-cue-card atomic-cue-lightbox-card",
    attr: {
      "data-testid": "atomic-cue-lightbox-card",
      role: "dialog",
      "aria-modal": "true",
      tabindex: "0",
      "aria-labelledby": LIGHTBOX_LABEL_ID,
    },
  });
  copyCuePaperVars(source, overlay, card);
  paintLightboxSheet(source, card);
  card.style.setProperty("--atomic-cue-origin-left", `${origin.left}px`);
  card.style.setProperty("--atomic-cue-origin-top", `${origin.top}px`);
  card.style.setProperty("--atomic-cue-origin-width", `${origin.width}px`);

  overlay.detach();
  doc.body.appendChild(overlay);

  const onKey = (event: KeyboardEvent): void => {
    if (!isCueLightboxDismissKey(event.key)) return;
    event.preventDefault();
    closeCueLightbox(true);
  };
  view.addEventListener("keydown", onKey, true);
  overlay.addEventListener("click", (event) => {
    if (!cueCardEventShouldToggle(event.target, card)) return;
    closeCueLightbox(true);
  });
  card.addEventListener("keydown", (event) => {
    if (!isCueCardToggleKey(event.key)) return;
    if (!cueCardEventShouldToggle(event.target, card)) return;
    event.preventDefault();
    closeCueLightbox(true);
  });

  source.addClass("is-open");
  source.setAttr("aria-expanded", "true");
  session = { source, overlay, card, view, onKey };

  const place = (): void => {
    overlay.addClass("is-placed");
    card.focus();
  };
  if (prefersReducedMotion(view)) {
    place();
    return;
  }
  view.requestAnimationFrame(() => {
    view.requestAnimationFrame(place);
  });
}

function prefersReducedMotion(view: Window): boolean {
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function copyCuePaperVars(
  source: HTMLElement,
  overlay: HTMLElement,
  card: HTMLElement,
): void {
  const view = source.ownerDocument.defaultView;
  if (!view) return;
  const sourceStyle = view.getComputedStyle(source);
  const tint = sourceStyle.getPropertyValue("--atomic-cue-tint").trim();
  if (tint) card.style.setProperty("--atomic-cue-tint", tint);
  const root = source.closest(".atomic-cues");
  if (!root) return;
  const accent = view.getComputedStyle(root).getPropertyValue("--atomic-cue-accent").trim();
  if (accent) overlay.style.setProperty("--atomic-cue-accent", accent);
}

function paintLightboxSheet(source: HTMLElement, card: HTMLElement): void {
  const sheet = card.createDiv({ cls: "atomic-cue-sheet" });
  const body = sheet.createDiv({ cls: "atomic-cue-body" });
  const text = source.querySelector(".atomic-cue-text");
  const dest = body.createDiv({
    cls: "atomic-cue-text",
    attr: { id: LIGHTBOX_LABEL_ID },
  });
  if (text) {
    for (const child of Array.from(text.childNodes)) {
      dest.appendChild(child.cloneNode(true));
    }
  }
  const meta = source.querySelector(".atomic-cue-meta");
  if (meta) sheet.appendChild(meta.cloneNode(true));
}
