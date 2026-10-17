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

type BoardId = "opening" | "quote" | "ask" | "characters" | "themes";

interface CanvasAtomic {
  role: "book" | "chapter" | "board" | "card";
  kind?: CanvasCardKind;
  board?: BoardId;
  page?: number;
  chapter?: string;
  anchor?: string;
  quote?: string;
  seed?: boolean;
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
const TEXT_CAP = 4_000;
const CARD_GAP = 12;
const GROUP_PAD = 16;

interface BoardSpec {
  id: BoardId;
  label: string;
  seed: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  color?: string;
}

/** Positions match `09-canvas.png`. Groups wrap those cards. */
const BOARDS: readonly BoardSpec[] = [
  {
    id: "opening",
    label: "Opening",
    seed: "Opening\nSocial pressure as the first character.",
    x: 64,
    y: 48,
    width: 232,
    height: 156,
    cardWidth: 200,
    cardHeight: 96,
  },
  {
    id: "quote",
    label: "Quote",
    seed: "Quote · p.47\n“a truth universally acknowledged”",
    x: 324,
    y: 88,
    width: 252,
    height: 160,
    cardWidth: 220,
    cardHeight: 100,
    color: "3",
  },
  {
    id: "ask",
    label: "Ask thread",
    seed: "Ask thread\nWhy lead with fortune, not wit?",
    x: 604,
    y: 54,
    width: 242,
    height: 168,
    cardWidth: 210,
    cardHeight: 108,
    color: "5",
  },
  {
    id: "characters",
    label: "Characters",
    seed: "Characters\nBennet · Darcy · Bingley · Elizabeth",
    x: 184,
    y: 248,
    width: 272,
    height: 152,
    cardWidth: 240,
    cardHeight: 96,
  },
  {
    id: "themes",
    label: "Themes",
    seed: "Themes\nPride · class · misreading",
    x: 484,
    y: 268,
    width: 232,
    height: 148,
    cardWidth: 200,
    cardHeight: 92,
  },
];

const BOARD_EDGES: ReadonlyArray<readonly [BoardId, BoardId]> = [
  ["opening", "quote"],
  ["quote", "ask"],
  ["quote", "characters"],
  ["characters", "themes"],
];

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

/** The board a new book canvas opens on. Groups, seed cards, and edges. */
export function seedBookCanvas(notePath: string): { canvasPath: string; canvasJson: string } | null {
  const canvasPath = canvasPathForNote(notePath);
  if (!canvasPath) return null;
  const canvas = parseBookCanvas("");
  if (!canvas) return null;
  const ids = (): string => `board-${(fallbackSeq += 1)}`;
  ensureBookNode(canvas, normalizeSlashes(notePath.trim()), ids);
  ensureBoard(canvas, ids);
  return { canvasPath, canvasJson: serialize(canvas) };
}

export function resolveCanvasPath(notePath: string, markdown: string): string | null {
  const linked = readRelatedCanvas(markdown);
  if (linked) return linked;
  return canvasPathForNote(notePath);
}

function isCardKind(value: unknown): value is CanvasCardKind {
  return value === "highlight" || value === "remark" || value === "ask";
}

function isBoardId(value: unknown): value is BoardId {
  return value === "opening" || value === "quote" || value === "ask" || value === "characters" || value === "themes";
}

function readAtomic(value: unknown): CanvasAtomic | null {
  if (
    !isRecord(value) ||
    (value.role !== "book" && value.role !== "chapter" && value.role !== "board" && value.role !== "card")
  ) {
    return null;
  }
  const atomic: CanvasAtomic = { role: value.role };
  if (isCardKind(value.kind)) atomic.kind = value.kind;
  if (isBoardId(value.board)) atomic.board = value.board;
  if (value.seed === true) atomic.seed = true;
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
    width: typeof value.width === "number" ? value.width : 200,
    height: typeof value.height === "number" ? value.height : 96,
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

function boardFor(kind: CanvasCardKind): BoardId {
  switch (kind) {
    case "highlight":
    case "remark":
      return "quote";
    case "ask":
      return "ask";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function boardSpec(id: BoardId): BoardSpec {
  const spec = BOARDS.find((item) => item.id === id);
  if (spec) return spec;
  return BOARDS[0];
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
    x: 880,
    y: 48,
    width: 220,
    height: 96,
    atomic: { role: "book" },
  });
  return id;
}

function findBoard(canvas: CanvasFile, id: BoardId): CanvasNode | undefined {
  return canvas.nodes.find((node) => node.type === "group" && node.atomic?.role === "board" && node.atomic.board === id);
}

function ensureBoard(canvas: CanvasFile, ids: () => string): void {
  for (const spec of BOARDS) {
    if (findBoard(canvas, spec.id)) continue;
    canvas.nodes.unshift({
      id: nextId(ids, `board-${spec.id}`),
      type: "group",
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      label: spec.label,
      atomic: { role: "board", board: spec.id },
    });
  }
  for (const spec of BOARDS) {
    const hasCard = canvas.nodes.some((node) => node.atomic?.role === "card" && node.atomic.board === spec.id);
    if (hasCard) continue;
    const group = findBoard(canvas, spec.id);
    if (!group) continue;
    canvas.nodes.push({
      id: nextId(ids, `seed-${spec.id}`),
      type: "text",
      text: spec.seed,
      x: group.x + GROUP_PAD,
      y: group.y + 36,
      width: spec.cardWidth,
      height: spec.cardHeight,
      ...(spec.color ? { color: spec.color } : {}),
      atomic: { role: "card", board: spec.id, seed: true },
    });
  }
  ensureBoardEdges(canvas, ids);
}

function ensureBoardEdges(canvas: CanvasFile, ids: () => string): void {
  for (const [from, to] of BOARD_EDGES) {
    const fromNode = findBoard(canvas, from);
    const toNode = findBoard(canvas, to);
    if (!fromNode || !toNode) continue;
    const exists = canvas.edges.some(
      (edge) =>
        (edge.fromNode === fromNode.id && edge.toNode === toNode.id) ||
        (edge.fromNode === toNode.id && edge.toNode === fromNode.id),
    );
    if (exists) continue;
    canvas.edges.push({
      id: nextId(ids, `edge-${from}-${to}`),
      fromNode: fromNode.id,
      toNode: toNode.id,
      fromSide: "right",
      toSide: "left",
    });
  }
}

function cardsIn(canvas: CanvasFile, id: BoardId): CanvasNode[] {
  return canvas.nodes
    .filter((node) => node.atomic?.role === "card" && node.atomic.board === id)
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function overlaps(a: CanvasNode, b: CanvasNode): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function moveBoard(canvas: CanvasFile, group: CanvasNode, dy: number): void {
  const id = group.atomic?.board;
  group.y += dy;
  if (!id) return;
  for (const node of canvas.nodes) {
    if (node.atomic?.role === "card" && node.atomic.board === id) node.y += dy;
  }
}

function separateBoards(canvas: CanvasFile): void {
  const groups = canvas.nodes.filter((node) => node.atomic?.role === "board");
  for (let guard = 0; guard < 12; guard += 1) {
    let moved = false;
    const ordered = groups.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const above = ordered[i];
        const below = ordered[j];
        if (!above || !below || !overlaps(above, below)) continue;
        const shift = above.y + above.height + 24 - below.y;
        if (shift > 0) {
          moveBoard(canvas, below, shift);
          moved = true;
        }
      }
    }
    if (!moved) return;
  }
}

function fitBoard(group: CanvasNode, card: CanvasNode): void {
  const right = Math.max(group.x + group.width, card.x + card.width + GROUP_PAD);
  const bottom = Math.max(group.y + group.height, card.y + card.height + GROUP_PAD);
  group.width = right - group.x;
  group.height = bottom - group.y;
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
  ensureBookNode(canvas, normalizeSlashes(input.notePath.trim()), ids);
  ensureBoard(canvas, ids);
  const board = boardFor(input.card.kind);
  const spec = boardSpec(board);
  const group = findBoard(canvas, board);
  if (!group) return { ok: false, reason: "bad-canvas" };
  const chapter = input.card.chapter?.trim() ?? "";
  const atomic: CanvasAtomic = {
    role: "card",
    kind: input.card.kind,
    board,
    page: input.card.page,
    ...(chapter ? { chapter } : {}),
    ...(input.card.anchor?.trim() ? { anchor: input.card.anchor.trim() } : {}),
    ...(input.card.quote.trim() ? { quote: input.card.quote.trim().slice(0, TEXT_CAP) } : {}),
  };
  const seed = cardsIn(canvas, board).find((node) => node.atomic?.seed === true);
  let cardId: string;
  if (seed) {
    seed.text = text;
    seed.atomic = atomic;
    if (spec.color) seed.color = spec.color;
    cardId = seed.id;
  } else {
    const stack = cardsIn(canvas, board);
    const last = stack[stack.length - 1];
    const x = group.x + GROUP_PAD;
    const y = last ? last.y + last.height + CARD_GAP : group.y + 36;
    cardId = nextId(ids, input.card.kind);
    const node: CanvasNode = {
      id: cardId,
      type: "text",
      text,
      x,
      y,
      width: spec.cardWidth,
      height: spec.cardHeight,
      ...(spec.color ? { color: spec.color } : {}),
      atomic,
    };
    canvas.nodes.push(node);
    fitBoard(group, node);
    separateBoards(canvas);
  }
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
