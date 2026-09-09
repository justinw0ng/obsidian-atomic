import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  UPDATE_NOTES,
  comparePluginSemver,
  latestUpdateNoteAtOrBefore,
  parsePluginSemver,
  requiredUpdateNoteBody,
  updateNoteToShow,
} from "../src/core/update-notes.ts";
import { upsertUpdateNoteSource } from "../scripts/set-update-note.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SAMPLE_NOTES = {
  "1.1.7": "Gym set log setup.",
  "1.1.8": "What's new note after updates.",
};

test("parsePluginSemver accepts x.y.z and rejects junk", () => {
  assert.deepEqual(parsePluginSemver("1.1.8"), {
    major: 1,
    minor: 1,
    patch: 8,
  });
  assert.equal(parsePluginSemver("v1.1.8"), null);
  assert.equal(parsePluginSemver(""), null);
});

test("comparePluginSemver orders versions", () => {
  assert.equal(comparePluginSemver("1.1.8", "1.1.8"), 0);
  assert.equal(comparePluginSemver("1.1.9", "1.1.8"), 1);
  assert.equal(comparePluginSemver("1.1.8", "1.1.9"), -1);
});

test("latestUpdateNoteAtOrBefore skips empty bodies and future versions", () => {
  const notes = {
    "1.1.7": "  ",
    "1.1.8": "Current note",
    "1.2.0": "Future",
  };
  assert.deepEqual(latestUpdateNoteAtOrBefore(notes, "1.1.8"), {
    version: "1.1.8",
    body: "Current note",
  });
  assert.equal(latestUpdateNoteAtOrBefore(notes, "1.1.6"), null);
});

test("updateNoteToShow is silent on a fresh install", () => {
  assert.equal(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "",
      currentVersion: "1.1.8",
      hadStoredSettings: false,
    }),
    null,
  );
});

test("updateNoteToShow prompts existing installs that have not seen a newer note", () => {
  assert.deepEqual(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "",
      currentVersion: "1.1.8",
      hadStoredSettings: true,
    }),
    { version: "1.1.8", body: "What's new note after updates." },
  );
  assert.deepEqual(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "1.1.7",
      currentVersion: "1.1.8",
      hadStoredSettings: true,
    }),
    { version: "1.1.8", body: "What's new note after updates." },
  );
});

test("updateNoteToShow does not nag after the latest note is acknowledged", () => {
  assert.equal(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "1.1.8",
      currentVersion: "1.1.8",
      hadStoredSettings: true,
    }),
    null,
  );
});

test("updateNoteToShow returns only the latest note at or before the current version", () => {
  assert.deepEqual(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "1.1.0",
      currentVersion: "1.1.8",
      hadStoredSettings: true,
    }),
    { version: "1.1.8", body: "What's new note after updates." },
  );
});

test("updateNoteToShow treats invalid last-seen as unseen for existing installs", () => {
  assert.deepEqual(
    updateNoteToShow({
      notes: SAMPLE_NOTES,
      lastSeenVersion: "not-a-version",
      currentVersion: "1.1.8",
      hadStoredSettings: true,
    }),
    { version: "1.1.8", body: "What's new note after updates." },
  );
});

test("current manifest version has a required non-empty update note", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const body = requiredUpdateNoteBody(UPDATE_NOTES, manifest.version);
  assert.ok(body.length > 0);
  assert.equal(UPDATE_NOTES[manifest.version], body);
});

test("requiredUpdateNoteBody rejects missing or blank notes", () => {
  assert.throws(
    () => requiredUpdateNoteBody({ "1.1.8": "   " }, "1.1.8"),
    /Missing in-app update note/,
  );
  assert.throws(
    () => requiredUpdateNoteBody({}, "1.1.9"),
    /Missing in-app update note/,
  );
});

test("set-update-note upserts a JSON-valid UPDATE_NOTES catalog", () => {
  const source = `${readFileSync(join(root, "src/core/update-notes.ts"), "utf8")}`;
  const next = upsertUpdateNoteSource(
    source,
    "1.1.9",
    "  Timer fixes and the What's new prompt.  ",
  );
  assert.match(next, /"1\.1\.9": "Timer fixes and the What's new prompt\."/);
  const start = next.indexOf("export const UPDATE_NOTES: Record<string, string> = ");
  const objStart = next.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let i = objStart; i < next.length; i++) {
    if (next[i] === "{") depth += 1;
    else if (next[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const parsed = JSON.parse(next.slice(objStart, end + 1));
  assert.equal(parsed["1.1.9"], "Timer fixes and the What's new prompt.");
  assert.ok(parsed["1.1.8"]);
});

test("set-update-note.mjs writes the catalog file", () => {
  const dir = mkdtempSync(join(tmpdir(), "atomic-update-note-"));
  const notesFile = join(dir, "update-notes.ts");
  try {
    writeFileSync(
      notesFile,
      readFileSync(join(root, "src/core/update-notes.ts"), "utf8"),
    );
    const result = spawnSync(
      process.execPath,
      [
        join(root, "scripts/set-update-note.mjs"),
        "1.1.9",
        "Covered several PRs since the last release.",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, ATOMIC_UPDATE_NOTES_FILE: notesFile },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "1.1.9");
    assert.match(
      readFileSync(notesFile, "utf8"),
      /Covered several PRs since the last release/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set-update-note.mjs refuses an empty note", () => {
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/set-update-note.mjs"), "1.1.9", "   "],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ATOMIC_UPDATE_NOTE: "" },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Update note is empty|empty/);
});
