/** Shared markdown set-table scan used by gym log writes and dashboard volume. */

export type SetRow = {
  exercise: string;
  muscle: string;
  weight: string | number;
  reps: string | number;
  notes: string;
};

const SET_TABLE_ALIGN_RE = /^:?-{1,}:?$/;

export type SetTableRange = {
  header: number;
  firstData: number;
  end: number;
  columnCount: number;
};

export function parsePipeCells(line: string): string[] {
  if (!line.trim().startsWith("|")) return [];
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

export function isSetTableHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return joined.includes("exercise") && joined.includes("muscle");
}

export function isAlignmentRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => SET_TABLE_ALIGN_RE.test(cell));
}

export function isEmptySetTableRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => cell === "");
}

export function findSetTableRange(lines: string[]): SetTableRange | null {
  let header = -1;
  let columnCount = 5;
  for (let i = 0; i < lines.length; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!isSetTableHeader(cells)) continue;
    header = i;
    columnCount = cells.length;
    break;
  }
  if (header < 0) return null;

  let firstData = header + 1;
  while (
    firstData < lines.length &&
    isAlignmentRow(parsePipeCells(lines[firstData] ?? ""))
  ) {
    firstData += 1;
  }
  let end = firstData - 1;
  for (let i = firstData; i < lines.length; i += 1) {
    if (!String(lines[i] ?? "").trim().startsWith("|")) break;
    end = i;
  }
  return { header, firstData, end, columnCount };
}

export function parseSetTable(markdown: string): SetRow[] {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return [];
  const rows: SetRow[] = [];
  for (let i = table.firstData; i <= table.end; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!cells.length || isAlignmentRow(cells)) continue;
    rows.push({
      exercise: cells[0] || "",
      muscle: cells[1] || "",
      weight: cells[2] || "",
      reps: cells[3] || "",
      notes: cells[4] || "",
    });
  }
  return rows;
}
