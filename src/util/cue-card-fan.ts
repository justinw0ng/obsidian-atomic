/** Descendants that keep their own click / Enter / Space behavior. */
export const CUE_CARD_INTERACTIVE_SELECTOR = [
  "a[href]",
  "a.internal-link",
  "a.external-link",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "label",
  "[contenteditable='true']",
  "[role='link']",
  "[role='button']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='textbox']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export type CueCardEventTarget = {
  closest?: (selector: string) => unknown;
  parentElement?: CueCardEventTarget | null;
};

export function isCueCardToggleKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export function isCueLightboxDismissKey(key: string): boolean {
  return key === "Escape";
}

/** Viewport inset around the flying card. Mirrored as `--atomic-cue-fly-inset`. */
export const CUE_CARD_FLY_INSET_PX = 48;

/** Resting fan paper width; the centered card never shrinks below this. */
export const CUE_CARD_FAN_WIDTH_PX = 228;

/** How much larger the fan paper becomes at the center. */
export const CUE_CARD_FLY_MAX_SCALE = 1.65;

/** Scale that enlarges the fan paper without overflowing the viewport width. */
export function cueCardFlyScale(
  card: { width: number },
  view: { innerWidth: number },
): number {
  const maxWidth = Math.max(1, view.innerWidth - CUE_CARD_FLY_INSET_PX);
  const width = Math.max(1, card.width);
  return Math.min(CUE_CARD_FLY_MAX_SCALE, maxWidth / width);
}

/**
 * Layout width of the centered card: at least the fan paper, up to the
 * content, never past the scaled viewport. Height overflow scrolls instead.
 */
export function cueLightboxLayoutWidth(
  contentWidth: number,
  view: { innerWidth: number },
  scale: number,
  minWidth = CUE_CARD_FAN_WIDTH_PX,
): number {
  const visualMax = Math.max(1, view.innerWidth - CUE_CARD_FLY_INSET_PX);
  const safeScale = Math.max(0.01, scale);
  const maxLayout = visualMax / safeScale;
  const floor = Math.min(Math.max(1, minWidth), maxLayout);
  const wanted = Number.isFinite(contentWidth) && contentWidth > 0 ? contentWidth : floor;
  return Math.min(maxLayout, Math.max(floor, wanted));
}

function isCueCardEventTarget(node: unknown): node is CueCardEventTarget {
  return !!node && typeof node === "object";
}

function eventElement(target: unknown): CueCardEventTarget | null {
  let node: unknown = target;
  while (isCueCardEventTarget(node)) {
    if (typeof node.closest === "function") return node;
    node = node.parentElement ?? null;
  }
  return null;
}

/** True when the event started on a control inside the card, not the card itself. */
export function cueCardEventFromInteractive(target: unknown, card: unknown): boolean {
  const el = eventElement(target);
  if (!el?.closest) return false;
  const interactive = el.closest(CUE_CARD_INTERACTIVE_SELECTOR);
  return interactive != null && interactive !== card;
}

/** Click / Enter / Space on the card sheet toggles; links and inputs do not. */
export function cueCardEventShouldToggle(target: unknown, card: unknown): boolean {
  return !cueCardEventFromInteractive(target, card);
}
