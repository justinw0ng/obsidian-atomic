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
  assert.match(heatmap, /"atomic-heatmap-scroll"/);
  assert.match(heatmap, /atomic-scrollport/);
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
  assert.match(sessionNote, /atomic-cue-log/);
  // The cue form replaced the bare markdown bullet the template used to leave.
  assert.doesNotMatch(sessionNote, /\n- \n/);

  const gymSetup = src("src/commands/gym-log-setup.ts");
  assert.match(gymSetup, /atomic-gym-log-setup-modal/);
  assert.match(gymSetup, /atomic-gym-log-setup-later/);
  assert.match(gymSetup, /atomic-gym-log-setup-confirm/);

  const updateNote = src("src/commands/update-note.ts");
  assert.match(updateNote, /atomic-update-note-notice/);
  assert.match(updateNote, /new Notice\(/);
  assert.match(updateNote, /formatUpdateNoteNotice/);
  assert.match(updateNote, /updateNoteBodyForLanguage/);
  assert.doesNotMatch(updateNote, /innerHTML/);
  assert.doesNotMatch(updateNote, /Modal/);
  assert.doesNotMatch(updateNote, /atomic-update-note-modal/);
  assert.doesNotMatch(updateNote, /atomic-update-note-ack/);

  const cues = src("src/views/cues.ts");
  assert.match(cues, /data-testid": "atomic-cues"/);
  assert.match(cues, /appendCueCard\(/);
  assert.match(cues, /buildCueCards\(/);
  assert.match(cues, /resetCueFan/);
  assert.match(cues, /cuesPaint\.shouldSkip/);
  assert.match(cues, /host\.beginPaint\(\)/);
  assert.doesNotMatch(cues, /closeCueLightbox/);
  assert.doesNotMatch(cues, /view\.cues\.thisMonth|view\.cues\.keepers/);
  assert.doesNotMatch(cues, /innerHTML/);

  const cueCard = src("src/views/cue-card.ts");
  assert.match(cueCard, /"data-testid": "atomic-cue-card"/);
  assert.match(cueCard, /createDiv\(\{/);
  assert.match(cueCard, /tabindex: "0"/);
  assert.match(cueCard, /"aria-expanded"/);
  assert.match(cueCard, /cueCardEventShouldToggle/);
  assert.match(cueCard, /isCueCardToggleKey/);
  assert.match(cueCard, /toggleCueLightbox/);
  assert.match(cueCard, /resetCueFan/);
  assert.match(cueCard, /closeCueLightbox/);
  assert.doesNotMatch(cueCard, /syncExpanded/);
  assert.doesNotMatch(cueCard, /is-open/);
  assert.match(cueCard, /"atomic-cue-text"/);
  assert.match(cueCard, /"atomic-cue-repeats"/);
  assert.match(cueCard, /MarkdownRenderer\.render/);
  assert.match(cueCard, /cueTextNeedsMarkdown/);
  assert.match(cueCard, /host\.component/);
  assert.doesNotMatch(cueCard, /FitnessPlugin/);
  assert.doesNotMatch(cueCard, /createEl\("button"/);
  assert.doesNotMatch(cueCard, /innerHTML/);

  const cueLightbox = src("src/views/cue-lightbox.ts");
  assert.match(cueLightbox, /"data-testid": "atomic-cue-lightbox"/);
  assert.match(cueLightbox, /"atomic-cue-lightbox-card"/);
  assert.match(cueLightbox, /"atomic-cue-lightbox-backdrop"/);
  assert.match(cueLightbox, /cloneNode\(true\)/);
  assert.match(cueLightbox, /querySelector\("\.atomic-cue-sheet"\)/);
  assert.match(cueLightbox, /is-flying/);
  assert.match(cueLightbox, /cueCardFlyScale/);
  assert.match(cueLightbox, /--atomic-cue-fly-scale/);
  assert.match(cueLightbox, /isCueLightboxDismissKey/);
  assert.match(cueLightbox, /cueCardEventShouldToggle/);
  assert.match(cueLightbox, /role: "dialog"/);
  assert.doesNotMatch(cueLightbox, /aria-modal/);
  assert.doesNotMatch(cueLightbox, /innerHTML/);

  const cueCardFan = src("src/util/cue-card-fan.ts");
  assert.match(cueCardFan, /CUE_CARD_INTERACTIVE_SELECTOR/);
  assert.match(cueCardFan, /a\[href]/);
  assert.match(cueCardFan, /\[role='button']/);
  assert.match(cueCardFan, /isCueLightboxDismissKey/);
  assert.match(cueCardFan, /cueCardFlyScale/);

  const codeblocks = src("src/codeblocks.ts");
  assert.match(codeblocks, /beginPaint\(\): Component/);
  assert.match(codeblocks, /this\.addChild\(this\.paint\)/);
  assert.doesNotMatch(codeblocks, /component: block\.beginPaint\(\)/);

  const cueLog = src("src/views/cue-log.ts");
  assert.match(cueLog, /data-testid": "atomic-cue-log"/);
  assert.match(cueLog, /"atomic-cue-log-text"/);
  assert.match(cueLog, /createEl\("textarea"/);
  assert.doesNotMatch(cueLog, /addEventListener\("input"/);
  assert.match(cueLog, /"atomic-cue-log-add"/);
  assert.match(cueLog, /"atomic-cue-log-existing"/);
  assert.match(cueLog, /appendCueCard\(/);
  assert.match(cueLog, /resetCueFan/);
  assert.match(cueLog, /cueLogPaint\.shouldSkip/);
  assert.doesNotMatch(cueLog, /closeCueLightbox/);
  assert.match(cueLog, /appendCueBullet\(/);
  assert.match(cueLog, /sanitizeCueText\(/);
  assert.match(cueLog, /vault\.process\(file, \(latest\) =>/);
  assert.doesNotMatch(cueLog, /atomic-cue-log-chip/);
  assert.doesNotMatch(cueLog, /innerHTML/);

  const dashboard = src("src/views/dashboard.ts");
  assert.match(dashboard, /"data-testid": "atomic-dashboard"/);
  assert.match(dashboard, /"atomic-dashboard-year-prev"/);
  assert.match(dashboard, /"atomic-dashboard-year-next"/);
  assert.match(dashboard, /"data-testid": "atomic-dashboard-kpi"/);
  assert.match(dashboard, /"data-testid": "atomic-dashboard-activity"/);
  assert.match(dashboard, /appendMonthBars\(/);
  assert.match(dashboard, /buildDashboardModel\(/);
  const dashboardDom = src("src/views/dashboard-dom.ts");
  assert.match(dashboardDom, /"atomic-dashboard-activity-bars"/);
  assert.match(dashboardDom, /"atomic-dashboard-month-bar"/);
  assert.match(dashboardDom, /appendBars\(bars, monthBars\(/);
  assert.match(dashboardDom, /"atomic-dashboard-link"/);
  assert.doesNotMatch(dashboard, /Math\.max\(\d+, heights/);
  assert.doesNotMatch(dashboard, /innerHTML/);
  const dashboardSections = src("src/views/dashboard-sections.ts");
  assert.match(dashboardSections, /"atomic-dashboard-monthly"/);
  assert.match(dashboardSections, /"atomic-dashboard-muscles"/);
  assert.match(dashboardSections, /"atomic-dashboard-golf-focus"/);
  assert.match(dashboardSections, /"atomic-dashboard-recent"/);
  assert.match(dashboardSections, /"data-testid": "atomic-dashboard-recent-row"/);
  assert.doesNotMatch(dashboardSections, /innerHTML/);

  const shelf = src("src/views/book-shelf.ts");
  assert.match(shelf, /data-testid": "atomic-bookshelf"/);
  assert.match(shelf, /data-testid": "atomic-book"/);
  assert.match(shelf, /"atomic-bookshelf-scroll"/);
  assert.match(shelf, /atomic-scrollport/);
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
  assert.match(health, /atomic-heatmap-scroll/);
  assert.match(health, /atomic-bookshelf-scroll/);
  assert.match(health, /heatmap-scrollbars/);
  assert.match(health, /heatmap-month-align/);
  assert.match(health, /gym-session-timer/);
  assert.match(health, /atomic-setting-gym-import/);
  assert.match(health, /atomic-setting-gym-exercises/);
  assert.match(health, /atomic-gym-log-setup-modal/);
  assert.match(health, /atomic-gym-log-setup-later/);
  assert.match(health, /promptGymLogSetupIfPending/);
  assert.match(health, /atomic-update-note-notice/);
  assert.match(health, /waitForNotice/);
  assert.match(health, /promptUpdateNoteIfNeeded/);
  assert.match(health, /language = "zh-Hant-en"/);
  assert.match(health, /索引卡/);
  assert.match(health, /atomic-dashboard-kpi/);
  assert.match(health, /atomic-dashboard-activity/);
  assert.match(health, /atomic-dashboard-year-prev/);
  assert.match(health, /atomic-dashboard-recent-row/);
  assert.match(health, /atomic-cue-card/);
  assert.match(health, /atomic-cue-lightbox/);
  assert.match(health, /atomic-cue-lightbox-card/);
  assert.match(health, /atomic-cue-lightbox-backdrop/);
  assert.match(health, /isCssTransparent/);
  assert.match(health, /sourcePaddingLeft/);
  assert.match(health, /sheetBgImage/);
  assert.match(health, /fadeOpacity/);
  assert.match(health, /maskImage/);
  assert.match(health, /atomic-cue-log-add/);
  assert.match(health, /前臂放鬆/);
  assert.match(health, /aria-expanded/);
  assert.match(health, /example\.com\/atomic-e2e/);

  const styles = src("styles.css");
  assert.match(styles, /fonts\/caveat-latin-400\.woff2/);
  assert.match(styles, /Atomic Cue CJK/);
  assert.match(styles, /DFKai-SB/);
  assert.match(styles, /max-height:\s*none/);
  assert.doesNotMatch(styles, /atomic-cue-log-chip/);
  assert.doesNotMatch(styles, /:has\(/);
  assert.doesNotMatch(styles, /!important/);
  assert.doesNotMatch(styles, /scrollbar-width/);
  // css-masks is only partial on Obsidian 1.4.5; fade with a ::after wash.
  assert.doesNotMatch(styles, /-webkit-mask/);
  assert.doesNotMatch(styles, /(?:^|[^a-z-])mask(?:-|\s*:)/im);
  assert.match(styles, /\.atomic-cue-body::after/);
  assert.match(styles, /--atomic-cue-wash/);
  assert.match(styles, /--atomic-cue-stock/);
  assert.match(styles, /atomic-cue-lightbox/);
  assert.match(styles, /translate\(-50%, -50%\) scale\(var\(--atomic-cue-fly-scale\)\)/);
  assert.match(styles, /\.is-preview/);
  assert.match(styles, /\.is-flying/);
  assert.doesNotMatch(styles, /--atomic-cue-width:\s*420px/);
  assert.doesNotMatch(styles, /rgba\(\s*28,\s*24,\s*18/);
  assert.doesNotMatch(styles, /\.atomic-cue-lightbox[^{]*\.atomic-cue-text[^{]*\{[^}]*font-size:\s*1\.7rem/s);
  assert.doesNotMatch(styles, /\.atomic-cue-card\.is-open/);
  assert.doesNotMatch(styles, /\.atomic-cue-lightbox[^{]*\{[^}]*overflow:\s*auto/s);
});
