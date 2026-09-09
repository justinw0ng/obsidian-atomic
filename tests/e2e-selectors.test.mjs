import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("plugin UI keeps stable Selenium data-testid hooks", () => {
  const heatmap = src("src/views/heatmap.ts");
  assert.match(heatmap, /data-testid": "atomic-heatmap"/);
  assert.match(heatmap, /data-testid": "atomic-heatmap-invalid"/);
  assert.match(heatmap, /"atomic-heatmap-month"/);
  assert.match(heatmap, /appendHeatmapWeeks/);
  assert.match(heatmap, /heatmapMonthSlots/);
  assert.match(heatmap, /wrap\.detach\(\)/);
  assert.doesNotMatch(heatmap, /innerHTML/);

  const heatmapModel = src("src/util/heatmap-model.ts");
  assert.match(heatmapModel, /"atomic-heatmap-today"/);
  assert.doesNotMatch(heatmapModel, /"atomic-heatmap-cell"/);
  assert.match(heatmapModel, /"data-ymd"/);
  assert.match(heatmapModel, /appendHeatmapWeeks/);
  assert.match(heatmapModel, /export function heatmapMonthSlots/);
  assert.match(heatmapModel, /createDiv\(/);
  assert.doesNotMatch(heatmapModel, /createElement\(/);
  assert.doesNotMatch(heatmapModel, /createDocumentFragment\(/);

  const timer = src("src/views/timer.ts");
  assert.match(timer, /data-testid": "atomic-timer-start"/);
  assert.match(timer, /data-testid": "atomic-timer-stop"/);
  assert.match(timer, /stopSessionTimer/);
  assert.match(timer, /isStaleBlockRender/);
  assert.match(timer, /vault\.process\(file, \(current\) =>/);
  assert.doesNotMatch(timer, /scheduleRefresh/);

  const gymLog = src("src/views/gym-log.ts");
  assert.match(gymLog, /data-testid": "atomic-gym-log"/);
  assert.match(gymLog, /promptNewGymExercise[\s\S]*scheduleRefresh/s);
  assert.match(gymLog, /"atomic-gym-log-exercise"/);
  assert.match(gymLog, /"atomic-gym-log-weight"/);
  assert.match(gymLog, /"atomic-gym-log-reps"/);
  assert.match(gymLog, /"atomic-gym-log-notes"/);
  assert.match(gymLog, /"atomic-gym-log-add"/);
  assert.doesNotMatch(gymLog, /innerHTML/);

  const createSession = src("src/commands/create-session.ts");
  assert.match(createSession, /gymBody/);
  const sessionNote = src("src/core/session-note.ts");
  assert.match(sessionNote, /atomic-gym-log/);
  assert.match(sessionNote, /atomic-timer/);

  const gymSetup = src("src/commands/gym-log-setup.ts");
  assert.match(gymSetup, /atomic-gym-log-setup-modal/);
  assert.match(gymSetup, /atomic-gym-log-setup-later/);
  assert.match(gymSetup, /atomic-gym-log-setup-confirm/);

  const updateNote = src("src/commands/update-note.ts");
  assert.match(updateNote, /atomic-update-note-modal/);
  assert.match(updateNote, /atomic-update-note-body/);
  assert.match(updateNote, /atomic-update-note-ack/);
  assert.match(updateNote, /updateNoteBodyForLanguage/);
  assert.doesNotMatch(updateNote, /innerHTML/);

  const cues = src("src/views/cues.ts");
  assert.match(cues, /data-testid": "atomic-cues"/);

  const shelf = src("src/views/book-shelf.ts");
  assert.match(shelf, /data-testid": "atomic-bookshelf"/);
  assert.match(shelf, /data-testid": "atomic-book"/);
  assert.match(shelf, /"data-scale": String\(scale\)/);
  assert.match(shelf, /resolveBookShelfScale/);

  const settings = src("src/settings.ts");
  assert.match(settings, /atomic-setting-activity/);
  assert.match(settings, /atomic-setting-add-hobby/);
  assert.match(settings, /atomic-setting-gym-import/);
  assert.match(settings, /atomic-setting-gym-exercises/);
  assert.match(settings, /atomic-color-swatch/);
  assert.match(settings, /getSettingDefinitions\(/);
  assert.match(settings, /settingsRows\(\)/);
  assert.doesNotMatch(settings, /setWarning\(/);
  assert.doesNotMatch(settings, /setDestructive\(/);
  assert.doesNotMatch(settings, /\.update\(/);
  assert.doesNotMatch(settings, /this\.display\(/);
  assert.match(settings, /const method = \(target as Record<string, unknown>\)\[name\]/);

  const properties = src("src/properties/property-select.ts");
  assert.match(properties, /"data-testid": "atomic-property-select"/);
  assert.match(properties, /mutationTouchesPropertyUi/);
  assert.match(properties, /\.metadata-property/);
  assert.match(properties, /\.bases-td/);
  assert.doesNotMatch(properties, /fitness-plugin, \.atomic-block-host/);
  assert.match(properties, /instanceOf\(Element\)/);
  assert.doesNotMatch(properties, /instanceof Element/);

  const health = src("e2e/health-check.test.mjs");
  assert.match(health, /atomic-heatmap-month/);
  assert.match(health, /heatmap-month-align/);
  assert.match(health, /gym-session-timer/);
  assert.match(health, /atomic-setting-gym-import/);
  assert.match(health, /atomic-setting-gym-exercises/);
  assert.match(health, /atomic-gym-log-setup-modal/);
  assert.match(health, /atomic-gym-log-setup-later/);
  assert.match(health, /promptGymLogSetupIfPending/);
  assert.match(health, /atomic-update-note-modal/);
  assert.match(health, /atomic-update-note-ack/);
  assert.match(health, /promptUpdateNoteIfNeeded/);
  assert.match(health, /language = "zh-Hant-en"/);
  assert.match(health, /卡片式排版/);

  const styles = src("styles.css");
  assert.doesNotMatch(styles, /:has\(/);
  assert.doesNotMatch(styles, /!important/);
  assert.doesNotMatch(styles, /scrollbar-width/);
});
