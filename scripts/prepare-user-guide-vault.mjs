/**
 * Seed a demo vault with original demo covers, then add the notes used by
 * user-guide screenshot capture. Defaults to /workspace/obsidian-demo.
 *
 * Demo titles and cover art are invented typographic pieces (see
 * docs/demo-covers/). Do not point cover fields at publisher art or Open Library.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GOLF_SHOWCASE_CUES } from "./cue-hero-content.mjs";
import { DEFAULT_DEMO_VAULT } from "./hero-capture-options.mjs";
import { E2E_CUE_LOG_FENCE, E2E_TIMER_FENCE } from "../e2e/lib/vault.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const USER_GUIDE_VAULT = DEFAULT_DEMO_VAULT;

export const TIMER_ITEM_TITLE = "The Unhurried Advantage";
export const OPEN_COVER_TITLE = "The Honest Hour";

export const DEMO_AUTHORS = {
  "A Smaller Ambition": "June Calder",
  "Decisions in Daylight": "Chris Lang",
  "Drafts Before Decks": "Marcus Reed",
  "Evenings Without Email": "Priya Nair",
  "Ship Before You Brand": "Jonah Hale",
  "Skill Before Scale": "Noah Berg",
  "The Honest Hour": "Lila Hart",
  "The Narrow Yes": "Sable Quinn",
  "The Practice of Enough": "Elena Voss",
  "The Unhurried Advantage": "Mara Ellison",
  "White Space First": "Owen Park",
  "Work That Leaves": "Ivy Chen",
};

/** Real published titles that must not appear in user-guide demo notes. */
export const FORBIDDEN_PUBLISHER_TITLES = [
  "Atomic Habits",
  "Dungeon Crawler Carl",
  "How to Read a Book",
  "Project Hail Mary",
  "Regime Change",
  "The Calamity Club",
  "The Let Them Theory",
  "The Odyssey",
  "The Wedding People",
  "Theo of Golden",
  "Whistler",
  "Yesteryear",
];

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function itemPath(vault, title) {
  return join(vault, "atomics/hobbies/Reading/Items", `${title}.md`);
}

function coverWikilink(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `[[atomics/hobbies/Reading/Covers/${slug}.png]]`;
}

export function patchReadingItems(vault = USER_GUIDE_VAULT) {
  const itemsDir = join(vault, "atomics/hobbies/Reading/Items");
  if (!existsSync(itemsDir)) {
    throw new Error(`Missing reading items directory: ${itemsDir}`);
  }
  for (const name of readdirSync(itemsDir)) {
    if (!name.endsWith(".md")) continue;
    const title = name.slice(0, -3);
    const author = DEMO_AUTHORS[title];
    if (!author) continue;
    const path = join(itemsDir, name);
    let markdown = readFileSync(path, "utf8");
    markdown = markdown.replace(
      /authors:\n(?:  - .*\n)*/,
      `authors:\n  - ${author}\n`,
    );
    markdown = markdown.replace(/^cover: ".*"$/m, `cover: "${coverWikilink(title)}"`);
    writeFileSync(path, markdown);
  }

  const timerPath = itemPath(vault, TIMER_ITEM_TITLE);
  if (!existsSync(timerPath)) {
    throw new Error(`Missing timer item: ${timerPath}`);
  }
  let timerMarkdown = readFileSync(timerPath, "utf8");
  if (/^status:/m.test(timerMarkdown)) {
    timerMarkdown = timerMarkdown.replace(/^status:.*$/m, "status: reading");
  }
  if (/^timer_started_at:/m.test(timerMarkdown)) {
    timerMarkdown = timerMarkdown.replace(
      /^timer_started_at:.*$/m,
      'timer_started_at: "2026-08-11T14:20:00.000Z"',
    );
  } else {
    timerMarkdown = timerMarkdown.replace(
      /\n---\n/,
      '\ntimer_started_at: "2026-08-11T14:20:00.000Z"\n---\n',
    );
  }
  writeFileSync(timerPath, timerMarkdown);
}

export const BOOK_SHELF_NOTE = [
  "```atomic-bookshelf",
  "# Uncomment a line to use it. Lines that start with # are ignored.",
  "activity: reading  # habit id (enabled item habit with a timer). Default: reading",
  "# status: all  # all, or to-read, reading, to-read-again, finished. Default: all",
  "# scale: 1  # book size vs default, 0.25–4. Default: 1. Alias: ratio",
  "```",
  "",
].join("\n");

export const HEATMAP_READING_NOTE = [
  "# Reading heatmap",
  "",
  "```atomic-heatmap",
  "year: 2026",
  "activity: reading",
  "```",
  "",
].join("\n");

export const HEATMAP_EXERCISE_NOTE = [
  "# Gym and golf heatmaps",
  "",
  "```atomic-heatmap",
  "year: 2026",
  "activity: gym, golf",
  "```",
  "",
].join("\n");

export const HEATMAP_GRID_NOTE = [
  "# All habits",
  "",
  "```atomic-heatmap",
  "year: 2026",
  "activity: gym, golf, reading",
  "rows: 2",
  "columns: 2",
  "```",
  "",
].join("\n");

export const TODAY_NOTE = [
  "# Today",
  "",
  "```atomic-today",
  "date: 2026-08-11",
  "```",
  "",
].join("\n");

const GYM_GUIDE_CUES = [
  "Brace before the first plate moves",
  "Knees track over the toes",
  "Finish the lockout, then breathe",
  "Scapula set, then press",
];

export function writeUserGuideNotes(vault = USER_GUIDE_VAULT) {
  writeFileSync(join(vault, "atomics/hobbies/Reading/Book Shelf.md"), BOOK_SHELF_NOTE);
  writeFileSync(join(vault, "atomics/Heatmap reading.md"), HEATMAP_READING_NOTE);
  writeFileSync(join(vault, "atomics/Heatmap gym golf.md"), HEATMAP_EXERCISE_NOTE);
  writeFileSync(join(vault, "atomics/Heatmap.md"), HEATMAP_GRID_NOTE);
  writeFileSync(join(vault, "atomics/Today.md"), TODAY_NOTE);
}

export function enrichGuideCues(vault = USER_GUIDE_VAULT) {
  const golfDir = join(vault, "atomics/exercise/Golf/2026");
  if (existsSync(golfDir)) {
    const golfFiles = readdirSync(golfDir)
      .filter((name) => name.endsWith(".md"))
      .sort();
    for (let index = 0; index < Math.min(GOLF_SHOWCASE_CUES.length, golfFiles.length); index += 1) {
      const path = join(golfDir, golfFiles[index]);
      const cue = GOLF_SHOWCASE_CUES[index];
      let markdown = readFileSync(path, "utf8");
      if (!markdown.includes(cue)) {
        markdown = markdown.replace(/- Short game focus/, `- ${cue}`);
        writeFileSync(path, markdown);
      }
    }
  }

  const golfToday = join(vault, "atomics/exercise/Golf/2026/2026-08-11.md");
  if (existsSync(golfToday)) {
    let markdown = readFileSync(golfToday, "utf8");
    if (!markdown.includes("```atomic-cue-log")) {
      markdown = markdown.replace(
        /## Reminders\n\n/,
        `## Reminders\n\n${E2E_CUE_LOG_FENCE}\n\n`,
      );
      writeFileSync(golfToday, markdown);
    }
  }

  const gymDir = join(vault, "atomics/exercise/Gym/2026");
  if (existsSync(gymDir)) {
    const gymFiles = readdirSync(gymDir)
      .filter((name) => name.endsWith(".md"))
      .sort();
    for (let index = 0; index < Math.min(GYM_GUIDE_CUES.length, gymFiles.length); index += 1) {
      const path = join(gymDir, gymFiles[index]);
      const cue = GYM_GUIDE_CUES[index];
      let markdown = readFileSync(path, "utf8");
      if (!markdown.includes(cue)) {
        markdown = markdown.replace(/## Reminders\n\n- \n/, `## Reminders\n\n- ${cue}\n`);
        writeFileSync(path, markdown);
      }
    }
  }

  const gymToday = join(vault, "atomics/exercise/Gym/2026/2026-08-11.md");
  if (existsSync(gymToday)) {
    let markdown = readFileSync(gymToday, "utf8");
    if (!markdown.includes("```atomic-timer")) {
      markdown = markdown.replace(
        /# Gym — 2026-08-11\n\n/,
        `# Gym — 2026-08-11\n\n${E2E_TIMER_FENCE}\n\n`,
      );
    }
    if (!markdown.includes("```atomic-cue-log")) {
      markdown = markdown.replace(
        /## Reminders\n\n/,
        `## Reminders\n\n${E2E_CUE_LOG_FENCE}\n\n`,
      );
    }
    writeFileSync(gymToday, markdown);
  }
}

export function patchObsidianConfig(vault = USER_GUIDE_VAULT) {
  const appPath = join(vault, ".obsidian/app.json");
  const app = readJson(appPath);
  app.readableLineLength = false;
  app.theme = "moonstone";
  app.livePreview = true;
  app.propertiesInDocument = "visible";
  app.baseFontSize = 16;
  writeJson(appPath, app);

  const appearancePath = join(vault, ".obsidian/appearance.json");
  const appearance = readJson(appearancePath);
  appearance.theme = "moonstone";
  appearance.showRibbon = true;
  writeJson(appearancePath, appearance);

  const corePath = join(vault, ".obsidian/core-plugins.json");
  const core = readJson(corePath);
  core.properties = true;
  writeJson(corePath, core);
}

export function assertOriginalDemoNotes(vault = USER_GUIDE_VAULT) {
  const itemsDir = join(vault, "atomics/hobbies/Reading/Items");
  const body = readdirSync(itemsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readFileSync(join(itemsDir, name), "utf8"))
    .join("\n");
  for (const title of FORBIDDEN_PUBLISHER_TITLES) {
    if (body.includes(title)) {
      throw new Error(`Publisher title ${JSON.stringify(title)} found in demo notes`);
    }
  }
  if (/openlibrary\.org|covers\.openlibrary/i.test(body)) {
    throw new Error("Open Library cover URL found in demo notes");
  }
  if (/James Clear|Mortimer Adler/i.test(body)) {
    throw new Error("Publisher author found in demo notes");
  }
}

export function seedDemoVaultArgs(vault = USER_GUIDE_VAULT) {
  return [join(ROOT, "scripts/seed-readme-demo-vault.mjs"), "--vault", vault];
}

export function prepareUserGuideVault(vault = USER_GUIDE_VAULT) {
  const seed = spawnSync("node", seedDemoVaultArgs(vault), {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (seed.status !== 0) {
    throw new Error(
      `seed-readme-demo-vault failed: ${(seed.stderr || seed.stdout || "").trim()}`,
    );
  }
  writeUserGuideNotes(vault);
  patchReadingItems(vault);
  enrichGuideCues(vault);
  patchObsidianConfig(vault);
  assertOriginalDemoNotes(vault);
  return vault;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vault = prepareUserGuideVault();
  console.log(`Prepared user-guide vault at ${vault}`);
}
