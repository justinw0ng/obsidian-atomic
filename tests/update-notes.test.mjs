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
  parseUpdateNote,
  requiredUpdateNoteBodies,
  updateNoteBodyForLanguage,
  updateNoteToShow,
} from "../src/core/update-notes.ts";
import { updateNoteDocument } from "../scripts/set-update-note.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SAMPLE_NOTE = {
  version: "1.1.8",
  body: {
    en: "What's new note after updates.",
    "zh-Hant": "更新之後會出更新說明。",
  },
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

test("parseUpdateNote requires bilingual bodies", () => {
  assert.deepEqual(parseUpdateNote(SAMPLE_NOTE), SAMPLE_NOTE);
  assert.equal(parseUpdateNote({ version: "1.1.8", body: "English only" }), null);
  assert.equal(
    parseUpdateNote({ version: "1.1.8", body: { en: "ok", "zh-Hant": "  " } }),
    null,
  );
  assert.equal(
    parseUpdateNote({ version: "1.1.8", body: { en: "  ", "zh-Hant": "可" } }),
    null,
  );
});

test("updateNoteBodyForLanguage follows the plugin language", () => {
  assert.equal(updateNoteBodyForLanguage(SAMPLE_NOTE, "en"), SAMPLE_NOTE.body.en);
  assert.equal(
    updateNoteBodyForLanguage(SAMPLE_NOTE, "zh-Hant"),
    SAMPLE_NOTE.body["zh-Hant"],
  );
  assert.equal(
    updateNoteBodyForLanguage(SAMPLE_NOTE, "zh-Hant-en"),
    SAMPLE_NOTE.body["zh-Hant"],
  );
  assert.equal(
    updateNoteBodyForLanguage(SAMPLE_NOTE, "zh-Hant-HK"),
    SAMPLE_NOTE.body["zh-Hant"],
  );
  assert.equal(
    updateNoteBodyForLanguage(SAMPLE_NOTE, "zh-Hans"),
    SAMPLE_NOTE.body.en,
  );
  assert.equal(
    updateNoteBodyForLanguage(SAMPLE_NOTE, "fr"),
    SAMPLE_NOTE.body.en,
  );
});

test("currentUpdateNote requires both bodies for the current version", () => {
  assert.deepEqual(currentUpdateNote(SAMPLE_NOTE, "1.1.8"), SAMPLE_NOTE);
  assert.equal(
    currentUpdateNote(
      { version: "1.1.8", body: { en: "  ", "zh-Hant": "可" } },
      "1.1.8",
    ),
    null,
  );
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

test("current manifest version has required bilingual update notes", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  const disk = JSON.parse(
    readFileSync(join(root, "src/core/update-notes.json"), "utf8"),
  );
  const bodies = requiredUpdateNoteBodies(UPDATE_NOTE, manifest.version);
  assert.ok(bodies.en.length > 0);
  assert.ok(bodies["zh-Hant"].length > 0);
  assert.equal(disk.version, manifest.version);
  assert.equal(disk.body.en, bodies.en);
  assert.equal(disk.body["zh-Hant"], bodies["zh-Hant"]);
  assert.equal(UPDATE_NOTE.version, manifest.version);
  assert.equal(UPDATE_NOTE.body.en, bodies.en);
  assert.equal(UPDATE_NOTE.body["zh-Hant"], bodies["zh-Hant"]);
  assert.match(bodies.en, /Start \/ Stop/);
  assert.match(bodies["zh-Hant"], /開始／停止/);
});

test("requiredUpdateNoteBodies rejects a blank or mismatched note", () => {
  assert.throws(
    () =>
      requiredUpdateNoteBodies(
        { version: "1.1.8", body: { en: "   ", "zh-Hant": "可" } },
        "1.1.8",
      ),
    /Missing bilingual in-app update note/,
  );
  assert.throws(
    () =>
      requiredUpdateNoteBodies(
        { version: "1.1.8", body: { en: "ok", "zh-Hant": "可" } },
        "1.1.9",
      ),
    /Missing bilingual in-app update note/,
  );
});

test("set-update-note writes a bilingual JSON document", () => {
  const next = updateNoteDocument(
    "1.1.9",
    "  Timer fixes and the What's new prompt.  ",
    "  計時同更新說明。  ",
  );
  assert.deepEqual(JSON.parse(next), {
    version: "1.1.9",
    body: {
      en: "Timer fixes and the What's new prompt.",
      "zh-Hant": "計時同更新說明。",
    },
  });
});

test("set-update-note decodes literal newlines for workflow inputs", () => {
  const next = updateNoteDocument(
    "1.1.9",
    "Line one\\nLine two",
    "第一行\\n第二行",
  );
  assert.deepEqual(JSON.parse(next), {
    version: "1.1.9",
    body: {
      en: "Line one\nLine two",
      "zh-Hant": "第一行\n第二行",
    },
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
        "--en",
        "Covered several PRs since the last release.",
        "--zh-Hant",
        "呢次更新包咗幾個 pull request。",
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
      body: {
        en: "Covered several PRs since the last release.",
        "zh-Hant": "呢次更新包咗幾個 pull request。",
      },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("set-update-note.mjs refuses an empty English or zh-Hant note", () => {
  const missingZh = spawnSync(
    process.execPath,
    [join(root, "scripts/set-update-note.mjs"), "1.1.9", "English only"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        ATOMIC_UPDATE_NOTE: "",
        ATOMIC_UPDATE_NOTE_ZH_HANT: "",
      },
    },
  );
  assert.notEqual(missingZh.status, 0);
  assert.match(missingZh.stderr, /zh-Hant update note is empty/);

  const emptyEn = spawnSync(
    process.execPath,
    [join(root, "scripts/set-update-note.mjs"), "1.1.9", "   ", "中文"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        ATOMIC_UPDATE_NOTE: "",
        ATOMIC_UPDATE_NOTE_ZH_HANT: "",
      },
    },
  );
  assert.notEqual(emptyEn.status, 0);
  assert.match(emptyEn.stderr, /English update note is empty|empty/);
});
