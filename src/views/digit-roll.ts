// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { rollChars } from "../core/digit-roll.ts";

function viewOf(el: HTMLElement): Window | null {
  return el.ownerDocument.defaultView;
}

export function prefersReducedMotion(el: HTMLElement): boolean {
  const view = viewOf(el);
  if (!view?.matchMedia) return false;
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isDigitEl(node: ChildNode | undefined): node is HTMLElement {
  if (!node || typeof (node as HTMLElement).classList?.contains !== "function") return false;
  return (node as HTMLElement).classList.contains("atomic-digit");
}

function makeDigit(parent: HTMLElement, start: number): HTMLElement {
  const digit = parent.createSpan({ cls: "atomic-digit" });
  digit.createSpan({ cls: "atomic-digit-ghost", text: String(start) });
  const clip = digit.createSpan({
    cls: "atomic-digit-clip",
    attr: { "aria-hidden": "true" },
  });
  const reel = clip.createSpan({ cls: "atomic-reel" });
  reel.setCssProps({ "--d": String(start) });
  for (let i = 0; i < 10; i++) reel.createSpan({ text: String(i) });
  return digit;
}

function makeGlyph(parent: HTMLElement, value: string): HTMLElement {
  return parent.createSpan({ cls: "atomic-glyph", text: value });
}

function putChildren(el: HTMLElement, nodes: HTMLElement[]): void {
  if (typeof el.replaceChildren === "function") {
    el.replaceChildren(...nodes);
    return;
  }
  el.empty();
  for (const node of nodes) {
    if (typeof el.appendChild === "function") el.appendChild(node);
  }
}

function applyDigit(node: HTMLElement, value: number): void {
  const reel = node.querySelector(".atomic-reel");
  if (!reel || typeof (reel as HTMLElement).setCssProps !== "function") return;
  (reel as HTMLElement).setCssProps({ "--d": String(value) });
}

/** Paint or update a clipped digit reel. Rightmost digit moves first. */
export function setRoll(el: HTMLElement, text: string, animate: boolean): void {
  const motion = animate && !prefersReducedMotion(el);
  const old = Array.from(el.children).reverse();
  const next: Array<{ node: HTMLElement; digit: number | null }> = [];
  for (const part of rollChars(text)) {
    switch (part.kind) {
      case "digit": {
        const prev = old[part.indexFromRight];
        let node: HTMLElement;
        if (isDigitEl(prev)) {
          node = prev;
        } else {
          node = makeDigit(el, motion ? 0 : part.value);
          if (motion) node.classList.add("is-entering");
        }
        node.setCssProps({ "--i": String(part.indexFromRight) });
        const ghost = node.firstChild;
        if (ghost) ghost.textContent = String(part.value);
        next.push({ node, digit: part.value });
        break;
      }
      case "glyph":
        next.push({ node: makeGlyph(el, part.value), digit: null });
        break;
      default: {
        const unseen: never = part;
        throw new Error(`Unknown roll char: ${JSON.stringify(unseen)}`);
      }
    }
  }
  putChildren(el, next.map((item) => item.node));
  el.setAttribute("aria-label", text);
  const apply = (): void => {
    for (const item of next) {
      if (item.digit !== null) applyDigit(item.node, item.digit);
    }
  };
  const view = viewOf(el);
  if (motion && view?.requestAnimationFrame) {
    void el.offsetWidth;
    view.requestAnimationFrame(apply);
  } else {
    apply();
  }
}

export function appendRoll(parent: HTMLElement, text: string, animate = false): HTMLElement {
  const el = parent.createSpan({
    cls: "atomic-roll",
    attr: { "data-testid": "atomic-roll" },
  });
  setRoll(el, text, animate);
  return el;
}

/** Restart every reel from 0 using the labels already on the page. */
export function playRolls(root: ParentNode): void {
  const nodes = root.querySelectorAll(".atomic-roll");
  for (const node of Array.from(nodes)) {
    if (typeof (node as HTMLElement).empty !== "function") continue;
    const el = node as HTMLElement;
    if (prefersReducedMotion(el)) continue;
    const text = el.getAttribute("aria-label");
    if (!text) continue;
    el.empty();
    setRoll(el, text, true);
  }
}
