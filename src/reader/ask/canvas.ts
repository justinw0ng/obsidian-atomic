// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "../../util/record.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { yamlScalar } from "../../util/yaml.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isSafeVaultNotePath, normalizeSlashes } from "../../util/vault-path.ts";

export type CanvasCardKind = "highlight" | "remark" | "ask";

export interface BookCard {
  kind: CanvasCardKind;
  page: number;
  quote: string;
  body: string;
  chapter?: string;
  anchor?: string;
}

interface CanvasAtomic {
  role: "book" | "chapter" | "card";
  kind?: CanvasCardKind;
  page?: number;
  chapter?: string;
  anchor?: string;
  quote?: string;
}

interface CanvasNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  label?: string;
  atomic?: CanvasAtomic;
  [key: string]: unknown;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  [key: string]: unknown;
}

interface CanvasFile {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  extra: Record<string, unknown>;
}

const MAX_CARDS = 200;
const CARD_W = 240;
const CARD_H = 120;
const BOOK_W = 280;
const BOOK_H = 160;
const BOOK_X = 480;
const BOOK_Y = 320;
const GAP = 48;
const TEXT_CAP = 4_000;

let fallbackSeq = 0;

export function canvasPathForNote(notePath: string): string | null {
  const normalized = normalizeSlashes(notePath.trim());
  if (!isSafeVaultNotePath(normalized)) return null;
  return `${normalized.slice(0, -".md".length)}.canvas`;
}

export function isSafeCanvasPath(path: string): boolean {
  const normalized = normalizeSlashes(path.trim());
  if (!normalized.toLowerCase().endsWith(".canvas")) return false;
  const asNote = `${normalized.slice(0, -".canvas".length)}.md`;
  return isSafeVaultNotePath(asNote);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function cleanCanvasRef(raw: string): string {
  let value = unquote(raw).trim();
  if (value.startsWith("[[") && value.endsWith("]]")) {
    value = value.slice(2, -2);
    const alias = value.indexOf("|");
    if (alias >= 0) value = value.slice(0, alias);
    value = value.trim();
  }
  return normalizeSlashes(value);
}

function splitFrontmatter(markdown: string): { lines: string[]; endIndex: number } | null {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") return { lines, endIndex: index };
  }
  return null;
}

function joinLines(lines: string[], source: string): string {
  const nl = source.includes("\r\n") ? "\r\n" : "\n";
  const text = lines.join(nl);
  return source.endsWith("\n") || source.endsWith("\r\n") ? `${text}${nl}` : text;
}

/** Empty when the note has no canvas yet. Those notes stay valid. */
export function readRelatedCanvas(markdown: string): string {
  const parts = splitFrontmatter(markdown);
  if (!parts) return "";
  for (let index = 1; index < parts.endIndex; index += 1) {
    const match = parts.lines[index]?.match(/^related_canvas\s*:\s*(.*)$/);
    if (!match) continue;
    const ref = cleanCanvasRef(match[1] ?? "");
    return isSafeCanvasPath(ref) ? ref : "";
  }
  return "";
}

export function ensureRelatedCanvas(markdown: string, canvasPath: string): string {
  if (!isSafeCanvasPath(canvasPath)) return markdown;
  if (readRelatedCanvas(markdown)) return markdown;
  const line = `related_canvas: ${yamlScalar(canvasPath)}`;
  const parts = splitFrontmatter(markdown);
  if (!parts) {
    return `---\n${line}\n---\n\n${markdown}`;
  }
  const next = parts.lines.slice();
  let replaced = false;
  for (let index = 1; index < parts.endIndex; index += 1) {
    if (/^related_canvas\s*:/.test(next[index] ?? "")) {
      next[index] = line;
      replaced = true;
      break;
    }
  }
  if (!replaced) next.splice(parts.endIndex, 0, line);
  return joinLines(next, markdown);
}

export function resolveCanvasPath(notePath: string, markdown: string): string | null {
  const linked = readRelatedCanvas(markdown);
  if (linked) return linked;
  return canvasPathForNote(notePath);
}

function isCardKind(value: unknown): value is CanvasCardKind {
  return value === "highlight" || value === "remark" || value === "ask";
}

function readAtomic(value: unknown): CanvasAtomic | null {
  if (!isRecord(value) || (value.role !== "book" && value.role !== "chapter" && value.role !== "card")) {
    return null;
  }
  const atomic: CanvasAtomic = { role: value.role };
  if (isCardKind(value.kind)) atomic.kind = value.kind;
  if (typeof value.page === "number" && Number.isFinite(value.page)) atomic.page = value.page;
  if (typeof value.chapter === "string") atomic.chapter = value.chapter;
  if (typeof value.anchor === "string") atomic.anchor = value.anchor;
  if (typeof value.quote === "string") atomic.quote = value.quote;
  return atomic;
}

function asNode(value: unknown): CanvasNode | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.type !== "string") return null;
  const node: CanvasNode = {
    ...value,
    id: value.id,
    type: value.type,
    x: typeof value.x === "number" ? value.x : 0,
    y: typeof value.y === "number" ? value.y : 0,
    width: typeof value.width === "number" ? value.width : CARD_W,
    height: typeof value.height === "number" ? value.height : CARD_H,
  };
  const atomic = readAtomic(value.atomic);
  if (atomic) node.atomic = atomic;
  return node;
}

function asEdge(value: unknown): CanvasEdge | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (typeof value.fromNode !== "string" || typeof value.toNode !== "string") return null;
  return { ...value, id: value.id, fromNode: value.fromNode, toNode: value.toNode };
}

export function parseBookCanvas(json: string | null | undefined): CanvasFile | null {
  if (json == null || json.trim() === "") return { nodes: [], edges: [], extra: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes.map(asNode).filter((node): node is CanvasNode => node !== null)
    : [];
  const edges = Array.isArray(parsed.edges)
    ? parsed.edges.map(asEdge).filter((edge): edge is CanvasEdge => edge !== null)
    : [];
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== "nodes" && key !== "edges") extra[key] = value;
  }
  return { nodes, edges, extra };
}

function serialize(canvas: CanvasFile): string {
  return `${JSON.stringify({ ...canvas.extra, nodes: canvas.nodes, edges: canvas.edges }, null, 2)}\n`;
}

function kindLabel(kind: CanvasCardKind): string {
  switch (kind) {
    case "highlight":
      return "Highlight";
    case "remark":
      return "Remark";
    case "ask":
      return "Ask";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function kindColor(kind: CanvasCardKind): string {
  switch (kind) {
    case "highlight":
    case "remark":
      return "3";
    case "ask":
      return "5";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function cardBody(card: BookCard): string | null {
  const quote = card.quote.trim().slice(0, TEXT_CAP);
  const body = card.body.trim().slice(0, TEXT_CAP);
  switch (card.kind) {
    case "highlight":
      if (!quote) return null;
      return `${kindLabel(card.kind)} · p. ${card.page}\n${quote}`;
    case "remark":
      if (!body) return null;
      return [`${kindLabel(card.kind)} · p. ${card.page}`, quote, body].filter(Boolean).join("\n");
    case "ask":
      if (!body) return null;
      return [`${kindLabel(card.kind)} · p. ${card.page}`, quote ? `Q: ${quote}` : "", body]
        .filter(Boolean)
        .join("\n");
    default: {
      const unreachable: never = card.kind;
      return unreachable;
    }
  }
}

function nextId(ids: () => string, prefix: string): string {
  const id = ids().trim();
  return id || `${prefix}-${(fallbackSeq += 1)}`;
}

function cardCount(canvas: CanvasFile): number {
  return canvas.nodes.filter((node) => node.atomic?.role === "card").length;
}

function ensureBookNode(canvas: CanvasFile, notePath: string, ids: () => string): string {
  const existing = canvas.nodes.find(
    (node) => node.atomic?.role === "book" || (node.type === "file" && node.file === notePath),
  );
  if (existing) {
    existing.atomic = { role: "book" };
    if (existing.type === "file" && !existing.file) existing.file = notePath;
    return existing.id;
  }
  const id = nextId(ids, "book");
  canvas.nodes.push({
    id,
    type: "file",
    file: notePath,
    x: BOOK_X,
    y: BOOK_Y,
    width: BOOK_W,
    height: BOOK_H,
    atomic: { role: "book" },
  });
  return id;
}

function placeCard(canvas: CanvasFile, index: number): { x: number; y: number; side: "left" | "right" } {
  const side = index % 2 === 0 ? "left" : "right";
  const column = canvas.nodes.filter((node) => {
    if (node.atomic?.role !== "card") return false;
    return side === "left" ? node.x < BOOK_X : node.x >= BOOK_X;
  });
  const y = column.reduce((max, node) => Math.max(max, node.y + node.height + GAP), BOOK_Y);
  const x = side === "left" ? BOOK_X - GAP - CARD_W : BOOK_X + BOOK_W + GAP;
  return { x, y, side };
}

function ensureChapterGroup(
  canvas: CanvasFile,
  chapter: string,
  card: CanvasNode,
  ids: () => string,
): void {
  const pad = 28;
  const existing = canvas.nodes.find(
    (node) => node.type === "group" && node.atomic?.role === "chapter" && node.atomic.chapter === chapter,
  );
  if (!existing) {
    canvas.nodes.unshift({
      id: nextId(ids, "chapter"),
      type: "group",
      x: card.x - pad,
      y: card.y - 36,
      width: card.width + pad * 2,
      height: card.height + 56,
      label: chapter,
      atomic: { role: "chapter", chapter },
    });
    return;
  }
  const left = Math.min(existing.x, card.x - pad);
  const top = Math.min(existing.y, card.y - 36);
  const right = Math.max(existing.x + existing.width, card.x + card.width + pad);
  const bottom = Math.max(existing.y + existing.height, card.y + card.height + pad);
  existing.x = left;
  existing.y = top;
  existing.width = right - left;
  existing.height = bottom - top;
}

export type CanvasWrite =
  | {
      ok: true;
      canvasPath: string;
      canvasJson: string;
      noteMarkdown: string;
      cardId: string;
    }
  | {
      ok: false;
      reason: "unsafe-path" | "bad-canvas" | "canvas-full" | "empty-card" | "bad-page";
    };

/**
 * One `.canvas` per book. The first highlight, remark, or Ask creates it and
 * sets `related_canvas`. A note that already points at a canvas keeps that path.
 */
export function applyBookCard(input: {
  notePath: string;
  noteMarkdown: string;
  canvasJson: string | null;
  card: BookCard;
  ids?: () => string;
}): CanvasWrite {
  const canvasPath = resolveCanvasPath(input.notePath, input.noteMarkdown);
  if (!canvasPath || !isSafeVaultNotePath(normalizeSlashes(input.notePath.trim()))) {
    return { ok: false, reason: "unsafe-path" };
  }
  if (!Number.isInteger(input.card.page) || input.card.page < 1) {
    return { ok: false, reason: "bad-page" };
  }
  const text = cardBody(input.card);
  if (!text) return { ok: false, reason: "empty-card" };
  const canvas = parseBookCanvas(input.canvasJson);
  if (!canvas) return { ok: false, reason: "bad-canvas" };
  if (cardCount(canvas) >= MAX_CARDS) return { ok: false, reason: "canvas-full" };

  const ids = input.ids ?? (() => `${input.card.kind}-${(fallbackSeq += 1)}`);
  const bookId = ensureBookNode(canvas, normalizeSlashes(input.notePath.trim()), ids);
  const spot = placeCard(canvas, cardCount(canvas));
  const cardId = nextId(ids, input.card.kind);
  const chapter = input.card.chapter?.trim() ?? "";
  const node: CanvasNode = {
    id: cardId,
    type: "text",
    text,
    x: spot.x,
    y: spot.y,
    width: CARD_W,
    height: CARD_H,
    color: kindColor(input.card.kind),
    atomic: {
      role: "card",
      kind: input.card.kind,
      page: input.card.page,
      ...(chapter ? { chapter } : {}),
      ...(input.card.anchor?.trim() ? { anchor: input.card.anchor.trim() } : {}),
      ...(input.card.quote.trim() ? { quote: input.card.quote.trim().slice(0, TEXT_CAP) } : {}),
    },
  };
  canvas.nodes.push(node);
  if (chapter) ensureChapterGroup(canvas, chapter, node, ids);
  canvas.edges.push({
    id: `e-${cardId}`,
    fromNode: bookId,
    toNode: cardId,
    fromSide: spot.side === "left" ? "left" : "right",
    toSide: spot.side === "left" ? "right" : "left",
  });
  return {
    ok: true,
    canvasPath,
    canvasJson: serialize(canvas),
    noteMarkdown: ensureRelatedCanvas(input.noteMarkdown, canvasPath),
    cardId,
  };
}

export interface CanvasMarginSource {
  id: string;
  kind: "remark" | "ask";
  page: number;
  body: string;
  quote: string;
}

const LABEL_LINE = /^(Highlight|Remark|Ask) · p\. (\d+)\s*$/;

/** Remark and Ask cards for one page. Highlights stay on the text, not in the margin. */
export function marginSourcesFromCanvas(json: string | null | undefined, page: number): CanvasMarginSource[] {
  const canvas = parseBookCanvas(json);
  if (!canvas) return [];
  const sources: CanvasMarginSource[] = [];
  for (const node of canvas.nodes) {
    if (node.atomic?.role !== "card") continue;
    const kind = node.atomic.kind;
    const cardPage = node.atomic.page;
    if ((kind !== "remark" && kind !== "ask") || cardPage !== page) continue;
    const lines = (node.text ?? "").split("\n");
    const bodyLines = lines[0] && LABEL_LINE.test(lines[0]) ? lines.slice(1) : lines;
    sources.push({
      id: node.id,
      kind,
      page,
      quote: node.atomic.quote ?? "",
      body: bodyLines.join("\n").trim(),
    });
  }
  return sources;
}

export function cardPage(node: { atomic?: { page?: number }; text?: string }): number | null {
  if (typeof node.atomic?.page === "number" && node.atomic.page >= 1) return node.atomic.page;
  const first = node.text?.split("\n")[0] ?? "";
  const match = first.match(LABEL_LINE);
  return match ? Number(match[2]) : null;
}
