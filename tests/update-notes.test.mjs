import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  UPDATE_NOTE,
  UNSEEN_UPDATE_NOTE_VERSION,
  comparePluginSemver,
  currentUpdateNote,
  parsePluginSemver,
  requiredUpdateNoteBody,
  updateNoteToShow,
} from "../src/core/update-notes.ts";
import { updateNoteDocument } from "../scripts/set-update-note.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SAMPLE_NOTE = {
  version: "1.1.8",
  body: "What's new note after updates.",
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

test("currentUpdateNote requires a non-empty body for the current version", () => {
  assert.deepEqual(currentUpdateNote(SAMPLE_NOTE, "1.1.8"), SAMPLE_NOTE);
  assert.equal(currentUpdateNote({ version: "1.1.8", body: "  " }, "1.1.8"), null);
  assert.equal(currentUpdateNote(SAMPLE_NOTE, "1.1.9"), null);
});

test("updateNoteToShow is silent on a fresh install", () => {
  assert.equal(
    updateNoteToShow({
      note: SAMPLE_NOTE,
      lastSeenVersion: "",
      currentVersion: "1.1.8",
    }),
    null,
  );
});

test("updateNoteToShow prompts when last-seen is older than the current note", () => {
  assert.deepEqual(
    updateNoteToShow({
      note: SAMPLE_NOTE,
      lastSeenVersion: UNSEEN_UPDATE_NOTE_VERSION,
      currentVersion: "1.1.8",
    }),
    SAMPLE_NOTE,
  );
  assert.deepEqual(
    updateNoteToShow({
      note: SAMPLE_NOTE,
      lastSeenVersion: "1.1.7",
      currentVersion: "1.1.8",
    }),
    SAMPLE_NOTE,
  );
});

test("updateNoteToShow does not nag after the current note is acknowledged", () => {
  assert.equal(
    updateNoteToShow({
      note: SAMPLE_NOTE,
      lastSeenVersion: "1.1.8",
      currentVersion: "1.1.8",
    }),
    null,
  );
});

test("current manifest version has a required non-empty update note", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const disk = JSON.parse(
    readFileSync(join(root, "src/core/update-notes.json"), "utf8"),
  );
  const body = requiredUpdateNoteBody(UPDATE_NOTE, manifest.version);
  assert.ok(body.length > 0);
  assert.equal(disk.version, manifest.version);
  assert.equal(disk.body, body);
  assert.equal(UPDATE_NOTE.version, manifest.version);
  assert.equal(UPDATE_NOTE.body, body);
});

test("requiredUpdateNoteBody rejects a blank or mismatched note", () => {
  assert.throws(
    () => requiredUpdateNoteBody({ version: "1.1.8", body: "   " }, "1.1.8"),
    /Missing in-app update note/,
  );
  assert.throws(
    () => requiredUpdateNoteBody({ version: "1.1.8", body: "ok" }, "1.1.9"),
    /Missing in-app update note/,
  );
});

test("set-update-note writes a JSON document for the version", () => {
  const next = updateNoteDocument("1.1.9", "  Timer fixes and the What's new prompt.  ");
  assert.deepEqual(JSON.parse(next), {
    version: "1.1.9",
    body: "Timer fixes and the What's new prompt.",
  });
});

test("set-update-note.mjs writes the catalog file", () => {
  const dir = mkdtempSync(join(tmpdir(), "atomic-update-note-"));
  const notesFile = join(dir, "update-notes.json");
  try {
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
    assert.deepEqual(JSON.parse(readFileSync(notesFile, "utf8")), {
      version: "1.1.9",
      body: "Covered several PRs since the last release.",
    });
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
