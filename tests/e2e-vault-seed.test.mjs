import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeE2eVaultPath,
  E2E_DAILY_NOTES_FOLDER,
  E2E_DAILY_NOTE_TEMPLATE,
  E2E_FILES,
  E2E_TEMPLATES_FOLDER,
  pluginSettings,
  seedE2eVault,
} from "../e2e/lib/vault.mjs";
import { SCALE_DAILY_NOTE, seedScaleNotes } from "../e2e/lib/scale-vault.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("assertSafeE2eVaultPath allows tmp vaults", () => {
  assertSafeE2eVaultPath("/tmp/atomic-tracker-e2e-vault");
  assertSafeE2eVaultPath(join(tmpdir(), "atomic-tracker-e2e-vault"));
  assertSafeE2eVaultPath(join(tmpdir(), "custom-seed-dir"));
});

test("assertSafeE2eVaultPath refuses empty, root, home, generic tmp, and repo paths", () => {
  assert.throws(() => assertSafeE2eVaultPath(""), /empty/);
  assert.throws(() => assertSafeE2eVaultPath("   "), /empty/);
  assert.throws(() => assertSafeE2eVaultPath("/"), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath("/tmp"), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(homedir()), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(repoRoot), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(join(repoRoot, "e2e")), /inside the repository/);
  assert.throws(
    () => assertSafeE2eVaultPath("/var/log/atomic-notes"),
    /Refusing to wipe/,
  );
});

test("seedE2eVault writes health-check fixture notes without deploying the plugin", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-e2e-seed-"));
  try {
    const { today, year } = seedE2eVault({
      vaultPath: vault,
      deployPlugin: false,
      today: "2026-08-13",
    });
    assert.equal(today, "2026-08-13");
    assert.equal(year, "2026");

    const golfCues = readFileSync(join(vault, E2E_FILES.golfCues), "utf8");
    assert.match(golfCues, /```atomic-cues/);
    assert.match(golfCues, /^activity: golf$/m);
    assert.doesNotMatch(golfCues, /atomic-golf-cues|atomic-gym-cues/);

    const gymCues = readFileSync(join(vault, E2E_FILES.gymCues), "utf8");
    assert.match(gymCues, /```atomic-cues/);
    assert.match(gymCues, /^activity: gym$/m);
    assert.doesNotMatch(gymCues, /atomic-golf-cues|atomic-gym-cues/);

    const heatmap = readFileSync(join(vault, E2E_FILES.heatmapReading), "utf8");
    assert.match(heatmap, /```atomic-heatmap/);
    assert.match(heatmap, /activity: reading/);

    const grid = readFileSync(join(vault, E2E_FILES.heatmapGrid), "utf8");
    assert.match(grid, /```atomic-heatmap/);
    assert.match(grid, /columns: 2/);

    const bookshelf = readFileSync(join(vault, E2E_FILES.bookshelfReading), "utf8");
    assert.match(bookshelf, /status: reading/);

    const scaled = readFileSync(join(vault, E2E_FILES.bookshelfScaled), "utf8");
    assert.match(scaled, /```atomic-bookshelf/);
    assert.match(scaled, /scale: 1.5/);

    const reading = readFileSync(join(vault, E2E_FILES.readingCurrent), "utf8");
    assert.match(reading, /status: reading/);
    assert.match(reading, /```atomic-timer/);

    const plugins = JSON.parse(
      readFileSync(join(vault, ".obsidian/community-plugins.json"), "utf8"),
    );
    assert.deepEqual(plugins, ["atomic-tracker"]);

    const core = JSON.parse(
      readFileSync(join(vault, ".obsidian/core-plugins.json"), "utf8"),
    );
    assert.equal(core.bases, true);
    assert.equal(core["command-palette"], true);
    assert.equal(core["daily-notes"], true);
    assert.equal(core.templates, true);

    const dailyNotes = JSON.parse(
      readFileSync(join(vault, ".obsidian/daily-notes.json"), "utf8"),
    );
    assert.equal(dailyNotes.folder, E2E_DAILY_NOTES_FOLDER);
    assert.equal(dailyNotes.template, E2E_DAILY_NOTE_TEMPLATE.replace(/\.md$/, ""));
    assert.notEqual(dailyNotes.folder, "Daily notes");

    const templates = JSON.parse(
      readFileSync(join(vault, ".obsidian/templates.json"), "utf8"),
    );
    assert.equal(templates.folder, E2E_TEMPLATES_FOLDER);
    assert.notEqual(templates.folder, "Templates");

    const gym = readFileSync(join(vault, E2E_FILES.gymSession(year, today)), "utf8");
    assert.match(gym, /```atomic-timer/);
    assert.match(gym, /```atomic-gym-log/);
    assert.match(gym, /\| Squat \| Quads \| 80 \| 5 \|/);

    const settings = JSON.parse(
      readFileSync(join(vault, ".obsidian/plugins/atomic-tracker/data.json"), "utf8"),
    );
    assert.equal(settings.language, "en");
    assert.equal(settings.gymLogSetup, "complete");
    assert.equal(
      settings.lastSeenUpdateNoteVersion,
      JSON.parse(readFileSync(join(repoRoot, "manifest.json"), "utf8")).version,
    );
    assert.deepEqual(settings.gymExercises, [
      { exercise: "Bench", muscle: "Chest" },
      { exercise: "Squat", muscle: "Quads" },
    ]);
    assert.deepEqual(
      settings.activityTypes.map((activity) => activity.id),
      pluginSettings().activityTypes.map((activity) => activity.id),
    );
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test("seedScaleNotes writes a default daily note plus gym, golf, and reading notes", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-scale-seed-"));
  try {
    const result = seedScaleNotes(
      vault,
      { gymSessions: 3, golfSessions: 2, readingItems: 4 },
      { year: 2026, today: "2026-01-03" },
    );
    assert.equal(result.year, 2026);
    assert.equal(result.dailyNotePath, SCALE_DAILY_NOTE);
    const daily = readFileSync(join(vault, SCALE_DAILY_NOTE), "utf8");
    assert.match(daily, /```atomic-bookshelf/);
    assert.match(daily, /```atomic-heatmap/);
    assert.match(daily, /activity: gym, golf, reading/);
    assert.match(daily, /```atomic-today/);
    assert.equal(
      existsSync(join(vault, "atomics/exercise/Gym/2026/2026-01-03.md")),
      true,
    );
    assert.equal(
      existsSync(join(vault, "atomics/exercise/Golf/2026/2026-01-02.md")),
      true,
    );
    assert.equal(existsSync(join(vault, "atomics/hobbies/Reading/Items/Scale Book 4.md")), true);
    assert.equal(existsSync(join(vault, "E2E/Idle.md")), true);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
