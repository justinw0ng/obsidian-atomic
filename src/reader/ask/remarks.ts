export type ReaderSurface = "desktop" | "phone";
export type MarginSide = "verso" | "recto" | "single";
export type GutterSide = "left" | "right" | "phone";

export interface MarginNote {
  id: string;
  kind: "remark" | "ask";
  page: number;
  side: MarginSide;
  /** Pixels from the top of the page, lined up with the highlight. */
  top: number;
  title: string;
  body: string;
}

export interface PlacedMarginNote extends MarginNote {
  gutter: GutterSide;
  presentation: "card" | "dot";
}

export interface ReaderChromeInput {
  /** Owned by the reader shell. Ask does not turn theater on or off. */
  theater: boolean;
  surface: ReaderSurface;
  askEnabled: boolean;
  hasSelection: boolean;
  askOpen: boolean;
}

export interface ReaderChrome {
  showHighlight: boolean;
  showRemark: boolean;
  showAsk: boolean;
  showMargins: boolean;
  showSelectionBar: boolean;
  askPresentation: "panel" | "screen" | "hidden";
}

const CARD_HEIGHT = 72;
const DOT_SIZE = 9;
const STACK_GAP = 8;

/** Odd pages sit on the right of a spread. Phone is one column. */
export function spreadSide(page: number, surface: ReaderSurface): MarginSide {
  if (surface === "phone") return "single";
  return page % 2 === 0 ? "verso" : "recto";
}

export function readerChrome(input: ReaderChromeInput): ReaderChrome {
  if (input.theater) {
    return {
      showHighlight: false,
      showRemark: false,
      showAsk: false,
      showMargins: false,
      showSelectionBar: false,
      askPresentation: "hidden",
    };
  }
  const showSelectionBar = input.hasSelection && !input.askOpen;
  const askPresentation = !input.askOpen || !input.askEnabled
    ? "hidden"
    : input.surface === "phone"
      ? "screen"
      : "panel";
  return {
    showHighlight: showSelectionBar,
    showRemark: showSelectionBar,
    showAsk: showSelectionBar && input.askEnabled,
    showMargins: true,
    showSelectionBar,
    askPresentation,
  };
}

function gutterFor(side: MarginSide, surface: ReaderSurface): GutterSide {
  if (surface === "phone") return "phone";
  return side === "verso" ? "left" : "right";
}

function clampTop(top: number, pageHeight: number, itemHeight: number): number {
  const max = Math.max(0, pageHeight - itemHeight);
  if (top < 0) return 0;
  if (top > max) return max;
  return top;
}

function placeColumn(notes: MarginNote[], pageHeight: number, presentation: "card" | "dot", gutter: GutterSide): PlacedMarginNote[] {
  const itemHeight = presentation === "dot" ? DOT_SIZE : CARD_HEIGHT;
  const sorted = notes.slice().sort((a, b) => a.top - b.top || a.id.localeCompare(b.id));
  let lastBottom = -STACK_GAP;
  return sorted.map((note) => {
    let top = clampTop(note.top, pageHeight, itemHeight);
    if (top < lastBottom + STACK_GAP) top = lastBottom + STACK_GAP;
    top = clampTop(top, pageHeight, itemHeight);
    lastBottom = top + itemHeight;
    return { ...note, top, gutter, presentation };
  });
}

/** Desktop cards sit in the 112px margin. Phone starts as one dot per note. */
export function placeMarginNotes(input: {
  theater: boolean;
  surface: ReaderSurface;
  pageHeight: number;
  notes: MarginNote[];
}): PlacedMarginNote[] {
  if (input.theater) return [];
  const presentation = input.surface === "phone" ? "dot" : "card";
  const columns = new Map<GutterSide, MarginNote[]>();
  for (const note of input.notes) {
    const gutter = gutterFor(note.side, input.surface);
    const list = columns.get(gutter) ?? [];
    list.push(note);
    columns.set(gutter, list);
  }
  const placed: PlacedMarginNote[] = [];
  for (const [gutter, notes] of columns) {
    placed.push(...placeColumn(notes, input.pageHeight, presentation, gutter));
  }
  return placed;
}

/** Left cards use the shell's desktop margin gutter. Right cards and phone dots use the ask slot. */
export function readerSlotForGutter(gutter: GutterSide): "ask" | "margin" {
  switch (gutter) {
    case "left":
      return "margin";
    case "right":
    case "phone":
      return "ask";
    default: {
      const unreachable: never = gutter;
      return unreachable;
    }
  }
}
