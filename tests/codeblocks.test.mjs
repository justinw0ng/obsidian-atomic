import test from "node:test";
import assert from "node:assert/strict";
import {
  codeblockLanguages,
  resolveCueActivity,
} from "../src/util/codeblock-languages.ts";

test("codeblockLanguages registers atomic languages only", () => {
  assert.deepEqual(codeblockLanguages(), [
    "atomic-heatmap",
    "atomic-today",
    "atomic-dashboard",
    "atomic-actions",
    "atomic-cues",
    "atomic-cue-log",
    "atomic-timer",
    "atomic-gym-log",
    "atomic-bookshelf",
  ]);
  assert.equal(codeblockLanguages().includes("atomic-golf-cues"), false);
  assert.equal(codeblockLanguages().includes("atomic-gym-cues"), false);
});

test("resolveCueActivity reads activity from atomic-cues options only", () => {
  assert.equal(resolveCueActivity("atomic-cues", { activity: "gym" }), "gym");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "golf" }), "golf");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "  gym  " }), "gym");
  assert.equal(resolveCueActivity("atomic-cues", {}), null);
  assert.equal(resolveCueActivity("atomic-golf-cues", {}), null);
  assert.equal(resolveCueActivity("atomic-gym-cues", {}), null);
});
