export type SessionEmbedKind = "timer" | "gym-log";

const EMBED_SLOT =
  ".cm-embed-block, .cm-preview-code-block, .internal-embed, .el-pre, .codeblock, [class*='code-block']";
const NOTE_COLUMN = ".cm-sizer, .markdown-preview-sizer";

function slotClass(kind: SessionEmbedKind): string {
  return kind === "timer" ? "atomic-embed-slot-timer" : "atomic-embed-slot-gym";
}

/** Prefer the editor line so adjacent timer and gym slots stay siblings. */
function rowSlot(chosen: Element): Element {
  const parent = chosen.parentElement;
  if (parent?.classList.contains("cm-line")) return parent;
  return chosen;
}

/** The block Obsidian lays out as one note row: the embed, or the preview block. */
export function sessionEmbedSlot(start: Element): Element | null {
  const wrapper = start.closest(EMBED_SLOT);
  return wrapper ? rowSlot(wrapper) : null;
}

function isEmptyGap(node: Element): boolean {
  if ((node.textContent ?? "").trim() !== "") return false;
  return !node.classList.contains("atomic-embed-slot") && !node.classList.contains("cm-embed-block");
}

function pairSessionSlots(slot: Element): void {
  const parent = slot.parentElement;
  if (!parent) return;
  const kids = Array.from(parent.children);
  const timer = kids.find((el) => el.classList.contains("atomic-embed-slot-timer"));
  const gym = kids.find((el) => el.classList.contains("atomic-embed-slot-gym"));
  if (!timer || !gym) return;
  const start = Math.min(kids.indexOf(timer), kids.indexOf(gym));
  const end = Math.max(kids.indexOf(timer), kids.indexOf(gym));
  for (let index = start + 1; index < end; index += 1) {
    const between = kids[index];
    if (between && !isEmptyGap(between)) return;
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
 * Stretch a timer or gym-log block to the note column. Mark adjacent
 * timer and gym slots so a narrow note can stretch both to that column.
 */
export function markSessionEmbed(start: Element, kind: SessionEmbedKind): void {
  start.classList.add("atomic-embed-stretch");
  if (kind === "timer") start.classList.add("atomic-timer-host");
  if (kind === "gym-log") start.classList.add("atomic-gym-log-host");
  const slot = sessionEmbedSlot(start);
  if (!slot) return;
  slot.classList.add("atomic-embed-slot", slotClass(kind));
  slot.closest(NOTE_COLUMN)?.classList.add("atomic-note-column");
  pairSessionSlots(slot);
}
