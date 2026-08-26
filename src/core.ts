/** Pure fitness domain logic — no Obsidian imports. */

// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { extractYmdFromPath } from "./dates.ts";
export type { SetRow } from "./core/set-table";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { parseSetTable } from "./core/set-table.ts";

export type Cue = { text: string; date: string; focus?: string };

export const LB_TO_KG = 0.45359237;

export const MUSCLES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];

export const GOLF_FOCUS = [
  "Grip",
  "Stance",
  "Takeaway",
  "Backswing",
  "Transition",
  "Downswing",
  "Impact",
  "Follow-through",
  "Tempo",
  "Alignment",
];

export const GOLF_CLUBS = [
  "Driver",
  "3W",
  "5W",
  "Hybrid",
  "4i",
  "5i",
  "6i",
  "7i",
  "8i",
  "9i",
  "PW",
  "GW",
  "SW",
  "LW",
  "Putter",
  "Mixed",
];

export const GYM_LOCATIONS = ["Home", "Commercial", "Hotel/Travel", "Other"];
export const GOLF_LOCATIONS = ["Home net", "Driving range", "Course", "Other"];
export const CONDITIONS = [
  "Indoor",
  "Calm",
  "Windy",
  "Hot/Humid",
  "Rain/Wet",
  "Cold",
  "Other",
];
export const FELT = ["good", "ok", "bad"];

export function isLoadedWeight(weight: unknown): boolean {
  if (weight === null || weight === undefined) return false;
  const s = String(weight).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === "bw" || s === "—" || s === "-" || lower === "n/a") return false;
  return !Number.isNaN(Number(s));
}

export function toKg(weight: unknown, unit: string): number {
  const n = Number(weight);
  if (Number.isNaN(n)) return 0;
  return unit === "lb" ? n * LB_TO_KG : n;
}

export function rowVolumeKg(
  row: { weight?: unknown; reps?: unknown },
  unit = "kg",
): number {
  if (!isLoadedWeight(row.weight)) return 0;
  const reps = Number(row.reps);
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  return toKg(row.weight, unit) * reps;
}

export function durationToLevel(minutes: unknown): number {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 30) return 1;
  if (n < 60) return 2;
  if (n < 90) return 3;
  return 4;
}

export function yearFromDailyPath(path: string, fallbackYear: number): number {
  const ymd = extractYmdFromPath(path);
  return ymd ? Number(ymd.slice(0, 4)) : fallbackYear;
}

export function normalizeCue(text: string): string {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function cuesInCalendarMonth(
  cues: Cue[],
  year: number,
  month: number,
): Cue[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return cues
    .filter((c) => String(c.date || "").startsWith(prefix))
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function buildKeepers(
  cues: Cue[],
  year: number,
): Array<{
  key: string;
  text: string;
  focus: string;
  count: number;
  lastSeen: string;
}> {
  const prefix = `${year}-`;
  const map = new Map<
    string,
    { key: string; text: string; focus: string; count: number; lastSeen: string }
  >();
  const yearCues = cues
    .filter((c) => String(c.date || "").startsWith(prefix))
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const c of yearCues) {
    const key = normalizeCue(c.text);
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        key,
        text: c.text,
        focus: c.focus || "",
        count: 1,
        lastSeen: c.date,
      });
    } else {
      prev.count += 1;
      prev.text = c.text;
      prev.focus = c.focus || prev.focus;
      prev.lastSeen = c.date;
    }
  }
  return [...map.values()]
    .filter((k) => k.count >= 2)
    .sort(
      (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen),
    );
}

export function parseReminders(markdown: string): string[] {
  const lines = String(markdown).split(/\r?\n/);
  const out: string[] = [];
  let inRem = false;
  for (const line of lines) {
    if (/^##\s+(?:\S+\s+)?Reminders(?:\s*\/\s*.+)?\s*$/i.test(line.trim())) {
      inRem = true;
      continue;
    }
    if (inRem && /^##\s+/.test(line)) break;
    if (inRem) {
      const m = line.match(/^\s*[-*]\s+(.+)$/);
      if (m) out.push(m[1].trim());
    }
  }
  return out;
}
