/**
 * Large synthetic Atomic vaults for daily-note first-open profiling.
 * Safe to call from unit tests with deployPlugin: false.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { seedE2eVault, utcToday } from "./vault.mjs";

export const NODE_DAILY_NOTE_SCALE = {
  gymSessions: 365,
  golfSessions: 200,
  readingItems: 150,
};

/** Smaller than the Node profile so Obsidian can still boot in the 180s e2e budget. */
export const E2E_DAILY_NOTE_SCALE = {
  gymSessions: 120,
  golfSessions: 80,
  readingItems: 60,
};

export const SCALE_DAILY_NOTE = "Daily/Atomic scale daily.md";
export const SCALE_IDLE_NOTE = "E2E/Idle.md";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function ymdFromIndex(year, index) {
  const dt = new Date(Date.UTC(year, 0, 1 + index));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function gymSessionMarkdown(date) {
  return `---
type: session
date: ${date}
activity: gym
duration_min: 45
timer_started_at:
location: Commercial
weight_unit: kg
---

# Gym — ${date}

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |

## Reminders

- Brace the core
`;
}

export function golfSessionMarkdown(date) {
  return `---
type: session
date: ${date}
activity: golf
duration_min: 60
location: Course
felt: good
---

# Golf — ${date}

## Reminders

- Smooth tempo
`;
}

export function readingItemMarkdown({ title, status, date, minutes }) {
  return `---
type: atomic-item
domain: hobby
activity: reading
status: ${status}
authors:
  - Scale Author
description: ""
cover: ""
tags:
  - books
spine_color:
total_min: ${minutes}
timer_started_at:
---

# ${title}

## Remarks

## Time log

- ${date} | ${minutes} min | seeded page
`;
}

export function scaleDailyNoteMarkdown(year) {
  return `# Atomic scale daily

\`\`\`atomic-bookshelf
activity: reading
\`\`\`

\`\`\`atomic-actions
\`\`\`

\`\`\`atomic-heatmap
year: ${year}
activity: gym, golf, reading
rows: 2
columns: 2
\`\`\`

\`\`\`atomic-today
\`\`\`
`;
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function write(p, content) {
  ensureDir(dirname(p));
  writeFileSync(p, content, "utf8");
}

/**
 * Extra gym/golf/reading notes plus a default-template daily note.
 * Does not wipe the vault; call after {@link seedE2eVault} or into an empty tree.
 */
export function seedScaleNotes(vaultPath, scale, options = {}) {
  const today = options.today ?? utcToday();
  const year = Number(options.year ?? today.slice(0, 4));
  const gymCount = scale.gymSessions;
  const golfCount = scale.golfSessions;
  const readingCount = scale.readingItems;

  for (let i = 0; i < gymCount; i++) {
    const date = ymdFromIndex(year, i);
    write(
      join(vaultPath, `atomics/exercise/Gym/${year}/${date}.md`),
      gymSessionMarkdown(date),
    );
  }
  for (let i = 0; i < golfCount; i++) {
    const date = ymdFromIndex(year, i);
    write(
      join(vaultPath, `atomics/exercise/Golf/${year}/${date}.md`),
      golfSessionMarkdown(date),
    );
  }
  for (let i = 0; i < readingCount; i++) {
    const title = `Scale Book ${i + 1}`;
    const date = ymdFromIndex(year, i % 365);
    write(
      join(vaultPath, `atomics/hobbies/Reading/Items/${title}.md`),
      readingItemMarkdown({
        title,
        status: i % 5 === 0 ? "reading" : "finished",
        date,
        minutes: 20 + (i % 15),
      }),
    );
  }

  const dailyPath = options.dailyNotePath ?? SCALE_DAILY_NOTE;
  write(join(vaultPath, dailyPath), scaleDailyNoteMarkdown(year));
  write(join(vaultPath, SCALE_IDLE_NOTE), "# Idle\n");
  return { vaultPath, today, year, dailyNotePath: dailyPath, scale };
}

export function seedScaleE2eVault(options = {}) {
  const scale = options.scale ?? E2E_DAILY_NOTE_SCALE;
  const seeded = seedE2eVault(options);
  const extra = seedScaleNotes(seeded.vault, scale, {
    today: seeded.today,
    year: seeded.year,
    dailyNotePath: options.dailyNotePath,
  });
  return { ...seeded, ...extra, scale };
}
