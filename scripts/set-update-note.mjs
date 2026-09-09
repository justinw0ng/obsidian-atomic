#!/usr/bin/env node
/**
 * Write the in-app update note for a plugin semver to src/core/update-notes.json.
 *
 * Usage:
 *   node scripts/set-update-note.mjs 1.2.3 "Note body"
 *   ATOMIC_UPDATE_NOTE="Note body" node scripts/set-update-note.mjs 1.2.3
 *   node scripts/set-update-note.mjs 1.2.3 < note.txt
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parseSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_NOTES_FILE = join(root, "src/core/update-notes.json");

function readNoteText(argv) {
  if (argv.length >= 4) {
    const fromArg = argv[3];
    if (!fromArg.trim()) {
      throw new Error("Update note is empty. Pass a non-empty note body.");
    }
    return fromArg;
  }
  const fromEnv = process.env.ATOMIC_UPDATE_NOTE;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv;
  if (!process.stdin.isTTY) {
    const fromStdin = readFileSync(0, "utf8");
    if (fromStdin.trim()) return fromStdin;
  }
  throw new Error(
    "Update note is empty. Pass it as an argument, on stdin, or via ATOMIC_UPDATE_NOTE.",
  );
}

export function updateNoteDocument(version, body) {
  parseSemver(version);
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error(`Update note for ${version} is empty.`);
  }
  return `${JSON.stringify({ version, body: trimmed }, null, 2)}\n`;
}

function main() {
  const version = process.argv[2];
  if (!version) {
    throw new Error(
      "Usage: set-update-note.mjs <x.y.z> [note]  (or stdin / ATOMIC_UPDATE_NOTE)",
    );
  }
  const notesFile = process.env.ATOMIC_UPDATE_NOTES_FILE || DEFAULT_NOTES_FILE;
  writeFileSync(notesFile, updateNoteDocument(version, readNoteText(process.argv)));
  process.stdout.write(`${version}\n`);
}

const invokedDirectly =
  process.argv[1] != null &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main();
}
