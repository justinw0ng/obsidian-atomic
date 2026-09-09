#!/usr/bin/env node
/**
 * Upsert the in-app update note for a plugin semver in src/core/update-notes.ts.
 *
 * Usage:
 *   node scripts/set-update-note.mjs 1.2.3 "Note body"
 *   ATOMIC_UPDATE_NOTE="Note body" node scripts/set-update-note.mjs 1.2.3
 *   node scripts/set-update-note.mjs 1.2.3 < note.txt
 *
 * The catalog object after `export const UPDATE_NOTES` must stay JSON-valid
 * (quoted keys, no trailing commas) so this script can round-trip it.
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { compareSemver, parseSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_NOTES_FILE = join(root, "src/core/update-notes.ts");
const EXPORT_MARKER = "export const UPDATE_NOTES: Record<string, string> = ";

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unterminated UPDATE_NOTES object");
}

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

export function upsertUpdateNoteSource(source, version, body) {
  parseSemver(version);
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error(`Update note for ${version} is empty.`);
  }
  const start = source.indexOf(EXPORT_MARKER);
  if (start === -1) {
    throw new Error("UPDATE_NOTES export not found");
  }
  const objStart = source.indexOf("{", start + EXPORT_MARKER.length);
  if (objStart === -1) {
    throw new Error("UPDATE_NOTES object not found");
  }
  const objEnd = findMatchingBrace(source, objStart);
  const notes = JSON.parse(source.slice(objStart, objEnd + 1));
  if (notes === null || typeof notes !== "object" || Array.isArray(notes)) {
    throw new Error("UPDATE_NOTES must be a JSON object of version → body");
  }
  notes[version] = trimmed;
  const sorted = Object.fromEntries(
    Object.entries(notes).sort(([left], [right]) => compareSemver(left, right)),
  );
  const nextObj = JSON.stringify(sorted, null, 2);
  return `${source.slice(0, objStart)}${nextObj}${source.slice(objEnd + 1)}`;
}

function main() {
  const version = process.argv[2];
  if (!version) {
    throw new Error(
      "Usage: set-update-note.mjs <x.y.z> [note]  (or stdin / ATOMIC_UPDATE_NOTE)",
    );
  }
  const notesFile = process.env.ATOMIC_UPDATE_NOTES_FILE || DEFAULT_NOTES_FILE;
  const source = readFileSync(notesFile, "utf8");
  const next = upsertUpdateNoteSource(source, version, readNoteText(process.argv));
  writeFileSync(notesFile, next);
  process.stdout.write(`${version}\n`);
}

const invokedDirectly =
  process.argv[1] != null &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  main();
}
