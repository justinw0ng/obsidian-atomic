/**
 * Seed a small English-language vault for the Selenium health check.
 * Safe to call from unit tests with deployPlugin: false.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

export const E2E_VAULT_ID = "atomicE2e000001";
export const DEFAULT_E2E_VAULT = "/tmp/atomic-tracker-e2e-vault";
export const E2E_TIMEZONE = "UTC";

export const E2E_GYM_LOG_FENCE = `\`\`\`atomic-gym-log
# No options. Pick an exercise, enter weight and reps, then add a set. No need to type the table row yourself.
\`\`\``;

export const E2E_TIMER_FENCE = `\`\`\`atomic-timer
# No options. Start, Stop, Resume, or Discard the timer on this note.
\`\`\``;

export const E2E_CUE_LOG_FENCE = `\`\`\`atomic-cue-log
# No options. Type a cue and add it. It is saved as a bullet under this note\u2019s Reminders heading.
\`\`\``;

/** Non-default Daily Notes / Templates paths so e2e proves we do not hardcode. */
export const E2E_DAILY_NOTES_FOLDER = "Journal";
export const E2E_TEMPLATES_FOLDER = "Snippets";
export const E2E_DAILY_NOTE_TEMPLATE = "Snippets/Atomic daily note.md";

export const E2E_FILES = {
  golfCues: "E2E/Golf cues.md",
  gymCues: "E2E/Gym cues.md",
  cues: "E2E/Cues.md",
  heatmapAll: "E2E/Heatmap all.md",
  heatmapReading: "E2E/Heatmap reading.md",
  heatmapGymGolf: "E2E/Heatmap gym golf.md",
  heatmapGrid: "E2E/Heatmap grid.md",
  bookshelfAll: "E2E/Bookshelf all.md",
  bookshelfReading: "E2E/Bookshelf reading.md",
  bookshelfScaled: "E2E/Bookshelf scaled.md",
  dashboard: "atomics/Dashboard.md",
  readingCurrent: "atomics/hobbies/Reading/Items/Currently Reading.md",
  readingCurrentEpub: "atomics/hobbies/Reading/Items/Currently Reading.epub",
  readingFinished: "atomics/hobbies/Reading/Items/Finished Book.md",
  golfSession: (year, today) => `atomics/exercise/Golf/${year}/${today}.md`,
  gymSession: (year, today) => `atomics/exercise/Gym/${year}/${today}.md`,
};

const GREEN = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const ORANGE = ["#ffd8a8", "#ffa94d", "#f76707", "#d9480f"];
const BLUE = ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"];

export function utcToday(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

/** Stored zip. The health-check EPUB must open without an external reader library. */
function storedZip(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.data;
    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.byteLength;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.byteLength, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + eocd.byteLength);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  return out;
}

/** Three short chapters so a spread turn moves from page 1 to page 3. */
export function e2eReadingEpubBytes() {
  const encoder = new TextEncoder();
  const chapter = encoder.encode(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>
<h1>Chapter I</h1><p>Harbor light kept the first page.</p>
<h1>Chapter II</h1><p>The channel marker follows.</p>
<h1>Chapter III</h1><p>The last buoy is the close.</p>
</body></html>`);
  const opf = encoder.encode(`<?xml version="1.0"?>
<package>
  <manifest>
    <item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/></spine>
</package>`);
  const container = encoder.encode(
    `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
  );
  return storedZip([
    { name: "mimetype", data: encoder.encode("application/epub+zip") },
    { name: "META-INF/container.xml", data: container },
    { name: "OEBPS/content.opf", data: opf },
    { name: "OEBPS/chapter.xhtml", data: chapter },
  ]);
}

function write(p, content) {
  ensureDir(dirname(p));
  writeFileSync(p, content, "utf8");
}

export function assertSafeE2eVaultPath(vaultPath) {
  if (typeof vaultPath !== "string" || !vaultPath.trim()) {
    throw new Error("E2E vault path is empty");
  }
  const resolved = resolve(vaultPath);
  const repoRoot = resolve(ROOT);
  const forbidden = [
    resolve("/"),
    repoRoot,
    resolve(homedir()),
    resolve(tmpdir()),
    resolve("/tmp"),
    resolve("/var"),
    resolve("/usr"),
    resolve("/etc"),
  ];
  if (forbidden.includes(resolved)) {
    throw new Error(`Refusing to delete ${resolved}`);
  }
  if (resolved.startsWith(repoRoot + sep)) {
    throw new Error(`Refusing to delete ${resolved} (inside the repository)`);
  }
  const tmpPrefix = resolve(tmpdir()) + sep;
  const underTmp =
    resolved.startsWith(tmpPrefix) ||
    resolved.startsWith("/tmp/") ||
    resolved.startsWith("/var/tmp/");
  const e2eNamed = /e2e/i.test(basename(resolved));
  if (!underTmp && !e2eNamed) {
    throw new Error(
      `Refusing to wipe ${resolved}. Use a temp directory or a path whose name contains "e2e".`,
    );
  }
}

/**
 * Remote cover so the health check can measure the image box.
 * The image does not need to load; the element box comes from the shelf CSS.
 */
const E2E_COVER = "https://example.invalid/e2e-cover.png";

function readingItem({ title, status, totalMin, timeLog, cover = "", source = "" }) {
  const sourceLine = source ? `source: "${source}"\n` : "";
  return `---
type: atomic-item
domain: hobby
activity: reading
status: ${status}
authors:
  - ""
description: ""
pages:
cover: "${cover}"
tags:
  - books
spine_color:
${sourceLine}total_min: ${totalMin}
timer_started_at:
related_canvas:
---

# ${title}

## Remarks

## Time log

${timeLog}

\`\`\`atomic-timer
\`\`\`
`;
}

function gymSession(date) {
  return `---
type: session
date: ${date}
activity: gym
duration_min: 45
timer_started_at:
location: Commercial
location_detail: ""
weight_unit: kg
---

# Gym — ${date}

${E2E_TIMER_FENCE}

${E2E_GYM_LOG_FENCE}

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |

## Reminders

${E2E_CUE_LOG_FENCE}

- Brace the core
`;
}

function golfSession(date) {
  return `---
type: session
date: ${date}
activity: golf
duration_min: 60
timer_started_at:
location: Course
focus: []
club: []
felt: good
---

# Golf — ${date}

${E2E_TIMER_FENCE}

## Reminders

${E2E_CUE_LOG_FENCE}

- Smooth tempo
- Left wrist flat at the top
- Finish tall with the belt buckle facing the target, weight on the lead side
- Grip pressure at four out of ten, no tighter
`;
}

export function pluginSettings() {
  return {
    language: "en",
    timezone: E2E_TIMEZONE,
    dashboardPath: "atomics/Dashboard.md",
    golfCuesPath: "atomics/exercise/Golf/Cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
    gymLogSetup: "complete",
    lastSeenUpdateNoteVersion: MANIFEST.version,
    gymExercises: [
      { exercise: "Bench", muscle: "Chest" },
      { exercise: "Squat", muscle: "Quads" },
    ],
    activityTypes: [
      {
        id: "gym",
        domain: "exercise",
        label: "Gym",
        folder: "atomics/exercise/Gym",
        enabled: true,
        baseColor: GREEN[2],
        colors: GREEN,
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: true,
      },
      {
        id: "golf",
        domain: "exercise",
        label: "Golf",
        folder: "atomics/exercise/Golf",
        enabled: true,
        baseColor: ORANGE[2],
        colors: ORANGE,
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
      {
        id: "reading",
        domain: "hobby",
        label: "Reading",
        folder: "atomics/hobbies/Reading",
        enabled: true,
        baseColor: BLUE[2],
        colors: BLUE,
        noteModel: "item",
        supportsCues: false,
        supportsTimer: true,
        supportsSetTable: false,
      },
    ],
  };
}

function seedObsidianConfig(vault) {
  const obsidianDir = join(vault, ".obsidian");
  ensureDir(obsidianDir);

  write(
    join(obsidianDir, "app.json"),
    JSON.stringify(
      {
        readableLineLength: false,
        theme: "moonstone",
        accentColor: "",
        baseFontSize: 16,
        livePreview: true,
        propertiesInDocument: "visible",
        promptDelete: false,
        alwaysUpdateLinks: false,
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "appearance.json"),
    JSON.stringify(
      { theme: "moonstone", accentColor: "", showRibbon: true },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "community-plugins.json"),
    JSON.stringify(["atomic-tracker"], null, 2),
  );

  write(
    join(obsidianDir, "daily-notes.json"),
    JSON.stringify(
      {
        format: "YYYY-MM-DD",
        folder: E2E_DAILY_NOTES_FOLDER,
        template: E2E_DAILY_NOTE_TEMPLATE.replace(/\.md$/, ""),
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "templates.json"),
    JSON.stringify({ folder: E2E_TEMPLATES_FOLDER }, null, 2),
  );

  write(
    join(obsidianDir, "core-plugins.json"),
    JSON.stringify(
      {
        "file-explorer": true,
        "global-search": true,
        switcher: true,
        graph: false,
        backlink: false,
        canvas: false,
        "outgoing-link": false,
        "tag-pane": false,
        "page-preview": true,
        "daily-notes": true,
        templates: true,
        "note-composer": true,
        "command-palette": true,
        "slash-command": false,
        "editor-status": true,
        bookmarks: false,
        "markdown-importer": false,
        "zk-prefixer": false,
        "random-note": false,
        outline: true,
        "word-count": false,
        slides: false,
        "audio-recorder": false,
        workspaces: false,
        "file-recovery": true,
        publish: false,
        sync: false,
        webviewer: false,
        footnotes: false,
        properties: true,
        bases: true,
      },
      null,
      2,
    ),
  );

  const pluginDir = join(obsidianDir, "plugins/atomic-tracker");
  ensureDir(pluginDir);
  write(join(pluginDir, "data.json"), JSON.stringify(pluginSettings(), null, 2));
}

function deployPlugin(vault, pluginRoot) {
  const pluginDir = join(vault, ".obsidian/plugins/atomic-tracker");
  ensureDir(pluginDir);
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    const src = join(pluginRoot, file);
    if (!existsSync(src)) throw new Error(`Missing plugin file ${src}`);
    copyFileSync(src, join(pluginDir, file));
  }
  const fontsSrc = join(pluginRoot, "fonts");
  if (!existsSync(fontsSrc)) return;
  const fontsDest = join(pluginDir, "fonts");
  ensureDir(fontsDest);
  for (const name of readdirSync(fontsSrc)) {
    copyFileSync(join(fontsSrc, name), join(fontsDest, name));
  }
}

export function seedE2eVault(options = {}) {
  const vault = options.vaultPath ?? process.env.ATOMIC_E2E_VAULT ?? DEFAULT_E2E_VAULT;
  const pluginRoot = options.pluginRoot ?? ROOT;
  const today = options.today ?? utcToday();
  const year = today.slice(0, 4);
  const deploy = options.deployPlugin !== false;

  assertSafeE2eVaultPath(vault);
  if (existsSync(vault)) rmSync(vault, { recursive: true, force: true });
  ensureDir(vault);
  seedObsidianConfig(vault);
  if (deploy) deployPlugin(vault, pluginRoot);

  write(
    join(vault, E2E_FILES.golfCues),
    `# Golf cues\n\n\`\`\`atomic-cues\nactivity: golf\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.gymCues),
    `# Gym cues\n\n\`\`\`atomic-cues\nactivity: gym\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.cues),
    `# Cues\n\n\`\`\`atomic-cues\nactivity: golf\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapAll),
    `# Heatmap all\n\n\`\`\`atomic-heatmap\nactivity: all\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapReading),
    `# Heatmap reading\n\n\`\`\`atomic-heatmap\nactivity: reading\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapGymGolf),
    `# Heatmap gym golf\n\n\`\`\`atomic-heatmap\nactivity: gym, golf\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapGrid),
    `# Heatmap grid\n\n\`\`\`atomic-heatmap\nactivity: all\ncolumns: 2\nrows: 2\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfAll),
    `# Bookshelf all\n\n\`\`\`atomic-bookshelf\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfReading),
    `# Bookshelf reading\n\n\`\`\`atomic-bookshelf\nstatus: reading\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfScaled),
    `# Bookshelf scaled\n\n\`\`\`atomic-bookshelf\nscale: 1.5\n\`\`\`\n`,
  );

  write(join(vault, E2E_FILES.golfSession(year, today)), golfSession(today));
  write(join(vault, E2E_FILES.gymSession(year, today)), gymSession(today));
  write(join(vault, "atomics/exercise/Golf/Cues.md"), "# Golf Cues\n");
  write(join(vault, "atomics/exercise/Gym/Cues.md"), "# Gym Cues\n");

  write(
    join(vault, E2E_FILES.readingCurrent),
    readingItem({
      title: "Currently Reading",
      status: "reading",
      totalMin: 25,
      timeLog: `- ${today} | 25 min | seeded`,
      source: E2E_FILES.readingCurrentEpub,
    }),
  );
  writeFileSync(join(vault, E2E_FILES.readingCurrentEpub), e2eReadingEpubBytes());
  write(
    join(vault, E2E_FILES.readingFinished),
    readingItem({
      title: "Finished Book",
      status: "finished",
      totalMin: 0,
      cover: E2E_COVER,
      timeLog: "",
    }),
  );

  write(
    join(vault, E2E_FILES.dashboard),
    `---\nyear: ${year}\n---\n\n# Dashboard\n\n\`\`\`atomic-dashboard\nyear: ${year}\n\`\`\`\n`,
  );

  return { vault, today, year };
}

export function registerVaultInObsidianConfig(
  vaultPath,
  vaultId = E2E_VAULT_ID,
) {
  const configPath = join(
    process.env.HOME || "/home/ubuntu",
    ".config/obsidian/obsidian.json",
  );
  ensureDir(dirname(configPath));
  let parsed = { vaults: {} };
  if (existsSync(configPath)) {
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {
      parsed = { vaults: {} };
    }
  }
  if (!parsed.vaults || typeof parsed.vaults !== "object") parsed.vaults = {};
  parsed.vaults[vaultId] = {
    path: vaultPath,
    ts: Date.now(),
    open: true,
  };
  writeFileSync(configPath, JSON.stringify(parsed), "utf8");
  return vaultId;
}
