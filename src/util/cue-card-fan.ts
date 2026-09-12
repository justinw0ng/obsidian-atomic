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
