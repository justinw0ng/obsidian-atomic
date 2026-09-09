#!/usr/bin/env node
/**
 * Write the bilingual in-app update note for a plugin semver to
 * src/core/update-notes.json.
 *
 * Usage:
 *   node scripts/set-update-note.mjs 1.2.3 --en "English" --zh-Hant "繁體"
 *   node scripts/set-update-note.mjs 1.2.3 "English" "繁體"
 *   ATOMIC_UPDATE_NOTE="English" ATOMIC_UPDATE_NOTE_ZH_HANT="繁體" \
 *     node scripts/set-update-note.mjs 1.2.3
 *
 * Literal \n in either body becomes a newline (workflow_dispatch is a
 * single-line string).
 */
import { writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parseSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_NOTES_FILE = join(root, "src/core/update-notes.json");

function decodeNewlines(text) {
  return text.replace(/\\n/g, "\n");
}

function readBodies(argv) {
  const rest = argv.slice(3);
  let en;
  let zhHant;
  const positional = [];
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "--en") {
      i += 1;
      en = rest[i];
      continue;
    }
    if (token === "--zh-Hant") {
      i += 1;
      zhHant = rest[i];
      continue;
    }
    positional.push(token);
  }
  if (en == null) en = positional[0];
  if (zhHant == null) zhHant = positional[1];
  if (en == null) en = process.env.ATOMIC_UPDATE_NOTE;
  if (zhHant == null) zhHant = process.env.ATOMIC_UPDATE_NOTE_ZH_HANT;
  if (typeof en !== "string" || !en.trim()) {
    throw new Error(
      "English update note is empty. Pass --en, a positional body, or ATOMIC_UPDATE_NOTE.",
    );
  }
  if (typeof zhHant !== "string" || !zhHant.trim()) {
    throw new Error(
      "zh-Hant update note is empty. Pass --zh-Hant, a second positional body, or ATOMIC_UPDATE_NOTE_ZH_HANT.",
    );
  }
  return { en, zhHant };
}

export function updateNoteDocument(version, bodyEn, bodyZhHant) {
  parseSemver(version);
  const en = decodeNewlines(String(bodyEn)).trim();
  const zhHant = decodeNewlines(String(bodyZhHant)).trim();
  if (!en) {
    throw new Error(`English update note for ${version} is empty.`);
  }
  if (!zhHant) {
    throw new Error(`zh-Hant update note for ${version} is empty.`);
  }
  return `${JSON.stringify(
    { version, body: { en, "zh-Hant": zhHant } },
    null,
    2,
  )}\n`;
}

function main() {
  const version = process.argv[2];
  if (!version) {
    throw new Error(
      "Usage: set-update-note.mjs <x.y.z> --en <english> --zh-Hant <cantonese>",
    );
  }
  const notesFile = process.env.ATOMIC_UPDATE_NOTES_FILE || DEFAULT_NOTES_FILE;
  const bodies = readBodies(process.argv);
  writeFileSync(
    notesFile,
    updateNoteDocument(version, bodies.en, bodies.zhHant),
  );
  process.stdout.write(`${version}\n`);
}

const invokedDirectly =
  process.argv[1] != null &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main();
}
