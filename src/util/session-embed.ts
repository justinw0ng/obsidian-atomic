export type SessionEmbedKind = "timer" | "gym-log";

const NOTE_COLUMN = /(?:^|\s)(?:cm-sizer|markdown-preview-sizer)(?:\s|$)/;
const PREVIEW_SECTION = /markdown-preview-section/;
const STOP = /markdown-preview-view|markdown-source-view|cm-scroller|workspace-leaf/;
const WRAPPER = /code-block|codeblock|cm-embed-block|internal-embed|(?:^|\s)el-pre(?:\s|$)/;

export function sessionSlotClass(kind: SessionEmbedKind): string {
  return kind === "timer" ? "atomic-embed-slot-timer" : "atomic-embed-slot-gym";
}

function tokens(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

function hasToken(className: string, token: string): boolean {
  return tokens(className).includes(token);
}

function childrenOf(node: Element): Element[] {
  return Array.from(node.children);
}

/** Prefer the editor line, so two code blocks can sit on one row. */
function rowSlot(chosen: Element | null): Element | null {
  if (!chosen) return null;
  const parent = chosen.parentElement;
  if (parent && hasToken(parent.className, "cm-line")) return parent;
  return chosen;
}

/** The block Obsidian lays out as one note row: the embed, or the preview block. */
export function sessionEmbedSlot(start: Element): Element | null {
  let node: Element | null = start;
  let wrapper: Element | null = null;
  for (let depth = 0; depth < 12 && node?.parentElement; depth += 1) {
    const parent: Element = node.parentElement;
    const parentClass = parent.className ?? "";
    if (STOP.test(parentClass)) break;
    if (WRAPPER.test(node.className ?? "")) wrapper = node;
    if (NOTE_COLUMN.test(parentClass)) {
      const chosen = WRAPPER.test(node.className ?? "") ? node : wrapper;
      return rowSlot(chosen);
    }
    if (PREVIEW_SECTION.test(parentClass)) return rowSlot(node);
    node = parent;
  }
  return rowSlot(wrapper);
}

function noteColumn(slot: Element): Element | null {
  let node: Element | null = slot.parentElement;
  for (let depth = 0; depth < 12 && node; depth += 1) {
    if (NOTE_COLUMN.test(node.className ?? "")) return node;
    if (STOP.test(node.className ?? "")) return null;
    node = node.parentElement;
  }
  return null;
}

function isEmptyGap(node: Element): boolean {
  if ((node.textContent ?? "").trim() !== "") return false;
  const name = node.className ?? "";
  return !hasToken(name, "atomic-embed-slot") && !hasToken(name, "cm-embed-block");
}

function pairSessionSlots(slot: Element): void {
  const parent = slot.parentElement;
  if (!parent) return;
  const kids = childrenOf(parent);
  const timer = kids.find((el) => hasToken(el.className, "atomic-embed-slot-timer"));
  const gym = kids.find((el) => hasToken(el.className, "atomic-embed-slot-gym"));
  if (!timer || !gym) return;
  const from = kids.indexOf(timer);
  const to = kids.indexOf(gym);
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  for (let index = start + 1; index < end; index += 1) {
    const between = kids[index];
    if (!between || between === timer || between === gym) continue;
    if (!isEmptyGap(between)) return;
  }
  parent.classList.add("atomic-note-paired");
  for (let index = start + 1; index < end; index += 1) {
    const between = kids[index];
    if (between && (between.textContent ?? "").trim() === "") {
      between.classList.add("atomic-embed-gap");
    }
  }
}

/**
 * Stretch a timer or gym-log block to the note column, and mark a wide note
 * so those two blocks can share one row.
 */
export function markSessionEmbed(start: Element, kind: SessionEmbedKind): void {
  start.classList.add("atomic-embed-stretch");
  if (kind === "timer") start.classList.add("atomic-timer-host");
  const slot = sessionEmbedSlot(start);
  if (!slot) return;
  slot.classList.add("atomic-embed-slot", sessionSlotClass(kind));
  noteColumn(slot)?.classList.add("atomic-note-column");
  pairSessionSlots(slot);
}
