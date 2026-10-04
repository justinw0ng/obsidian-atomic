"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FitnessPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian14 = require("obsidian");

// src/dates.ts
var utcMonthShortZh = new Intl.DateTimeFormat("zh-HK", {
  month: "short",
  timeZone: "UTC"
});
var utcMonthShortEn = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC"
});
var utcFullDateZh = new Intl.DateTimeFormat("zh-HK", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcFullDateEn = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcWeekdayDateZh = new Intl.DateTimeFormat("zh-HK", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcWeekdayDateEn = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcDailyHeadingEn = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});
var utcDailyHeadingZh = new Intl.DateTimeFormat("zh-HK", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC"
});
var ymdFormatters = /* @__PURE__ */ new Map();
function utcNoon(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function ymdFormatter(timeZone) {
  const cached = ymdFormatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  ymdFormatters.set(timeZone, formatter);
  return formatter;
}
function ymdInZone(date, timeZone) {
  return ymdFormatter(timeZone).format(date);
}
function nowYear(timeZone) {
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timeZone).slice(0, 4));
}
function parseYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
function monthIndexFromDate(dateStr) {
  const m = String(dateStr || "").match(/^\d{4}-(\d{2})-/);
  if (!m) return -1;
  const index = Number(m[1]) - 1;
  return index >= 0 && index < 12 ? index : -1;
}
function weekdaySun0(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}
function addDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 12));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate()
  };
}
function formatYmd(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function monthShortZh(y, m, d) {
  return utcMonthShortZh.format(utcNoon(y, m, d));
}
function monthShortEn(y, m, d) {
  return utcMonthShortEn.format(utcNoon(y, m, d));
}
function monthShortForLanguage(y, m, d, language) {
  return language === "en" ? monthShortEn(y, m, d) : monthShortZh(y, m, d);
}
function fullDateZh(y, m, d) {
  return utcFullDateZh.format(utcNoon(y, m, d));
}
function fullDateEn(y, m, d) {
  return utcFullDateEn.format(utcNoon(y, m, d));
}
var fullDateLabels = /* @__PURE__ */ new Map();
var FULL_DATE_LABEL_LIMIT = 8192;
function fullDateForLanguage(y, m, d, language) {
  const key = `${language}|${y}-${m}-${d}`;
  const cached = fullDateLabels.get(key);
  if (cached !== void 0) return cached;
  const label = language === "en" ? fullDateEn(y, m, d) : fullDateZh(y, m, d);
  if (fullDateLabels.size >= FULL_DATE_LABEL_LIMIT) fullDateLabels.clear();
  fullDateLabels.set(key, label);
  return label;
}
function weekdayDateForLanguage(y, m, d, language) {
  const formatter = language === "en" ? utcWeekdayDateEn : utcWeekdayDateZh;
  return formatter.format(utcNoon(y, m, d));
}
function dailyNoteHeadingForLanguage(y, m, d, language) {
  switch (language) {
    case "en":
      return utcDailyHeadingEn.format(utcNoon(y, m, d));
    case "zh-Hant-en":
      return utcDailyHeadingZh.format(utcNoon(y, m, d));
    default: {
      const _exhaustive = language;
      return _exhaustive;
    }
  }
}
function extractYmdFromPath(path) {
  const m = String(path || "").match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
function resolveBlockYear(opts, fallbackYear, extra = {}) {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  if (extra.frontmatterYear !== void 0) {
    const n = Number(extra.frontmatterYear);
    if (Number.isFinite(n) && n >= 1970) return n;
  }
  if (extra.sourcePath) {
    const ymd = extractYmdFromPath(extra.sourcePath);
    if (ymd) return Number(ymd.slice(0, 4));
  }
  return fallbackYear;
}

// src/i18n/locales/en.ts
var en = {
  "settings.title": "Atomic Tracker",
  "settings.language": "Language",
  "settings.languageDesc": "Choose the plugin UI language. Existing notes and frontmatter are not rewritten.",
  "settings.languageOption.zh-Hant-en": "Traditional Chinese",
  "settings.languageOption.en": "English",
  "settings.timezone": "Timezone",
  "settings.timezoneDesc": "IANA timezone for today and session dates (e.g. Asia/Hong_Kong).",
  "settings.dashboardPath": "Dashboard path",
  "settings.dashboardPathDesc": "Vault-relative path opened by Open dashboard.",
  "settings.exerciseTypes": "Exercise types",
  "settings.exerciseTypesDesc": "Exercise sessions live in each activity folder. New exercise types default under atomics/exercise/<Name>.",
  "settings.addExerciseType": "Add exercise type",
  "settings.addExerciseTypeDesc": "Creates a daily-session exercise with cues enabled and no set table.",
  "settings.add": "Add",
  "settings.activityId": "Activity id: {id}",
  "settings.labelPlaceholder": "Label",
  "settings.enabledLabel": "Enabled",
  "settings.labelField": "Label",
  "settings.folderField": "Folder",
  "settings.cuesLabel": "Cues",
  "settings.heatmapShades": "Heatmap shades",
  "settings.exerciseFolderPlaceholder": "atomics/exercise/Name",
  "settings.enableCuesTooltip": "Enable reminder/cue rollups for this exercise",
  "settings.enabledTooltip": "Include this habit in heatmaps, dashboard, and commands",
  "settings.baseColor": "{label} color",
  "settings.baseColorDesc": "Pick one color. Heatmap shades are generated automatically (light to dark).",
  "settings.colors": "{label} colors",
  "settings.colorsDesc": "Heatmap colors from low to high intensity.",
  "settings.exerciseNamePlaceholder": "Running",
  "settings.colorPlaceholder": "#{number}",
  "settings.hobbyTypes": "General habits",
  "settings.hobbyTypesDesc": "Item notes with timers. New habits default under atomics/hobbies/<Name>. Reading is included by default and can be disabled or deleted.",
  "settings.addHobbyType": "Add general habit",
  "settings.addHobbyTypeDesc": "Creates an item hobby with timer tracking and no cues.",
  "settings.hobbyNamePlaceholder": "Chess",
  "settings.hobbyFolderPlaceholder": "atomics/hobbies/Name",
  "settings.delete": "Delete",
  "settings.deleteConfirm": "Remove \u201C{label}\u201D from Atomic Tracker settings? Vault notes are not deleted.",
  "settings.gymExercises": "Gym exercises",
  "settings.gymExercisesDesc": "Exercises you have logged, so you can pick them from the dropdown.",
  "settings.gymExercisesCount": "{count} saved pairs",
  "settings.gymImport": "Import from gym notes",
  "settings.gymImportDesc": "Find exercises in your gym notes and add the set form to notes that do not have it yet.",
  "command.newGymSession": "New gym session",
  "command.newGolfSession": "New golf session",
  "command.newExerciseSession": "New exercise session",
  "command.newReadingItem": "New reading item",
  "command.newHobbyItem": "New hobby item",
  "command.createReadingBookshelf": "Create reading Bases",
  "command.openReadingBookshelf": "Open reading Bases",
  "command.createBookShelf": "Create book shelf",
  "command.openBookShelf": "Open book shelf",
  "command.createCues": "Create cues notes",
  "command.createDailyNoteTemplate": "Create daily note template",
  "command.createTodaysDailyNote": "Create today's daily note",
  "command.openDashboard": "Open dashboard",
  "notice.created": "Created: {path}",
  "notice.reloadForCommands": "Language saved. Reload the plugin or Obsidian to refresh command palette names.",
  "notice.enterExerciseType": "Enter an exercise type name first.",
  "notice.enterHobbyType": "Enter a general habit name first.",
  "notice.activityDeleted": "Removed {label} from settings.",
  "notice.noHobbyActivities": "No enabled general habits configured",
  "notice.folderUnsafe": "Folder must be a safe vault-relative path.",
  "notice.noExerciseActivities": "No exercise activities configured",
  "notice.noGymActivity": "No gym activity configured",
  "notice.noGolfActivity": "No golf activity configured",
  "notice.noReadingHobby": "No Reading hobby configured",
  "notice.dashboardNotFound": "Dashboard not found: {path}",
  "notice.openedExistingSession": "Opened existing {activity} session: {path}",
  "notice.createdSession": "Created {activity} session: {path}",
  "notice.invalidDate": "Invalid date",
  "notice.createdReadingItem": "Created Reading item: {path}",
  "notice.openedExistingReadingItem": "Opened existing Reading item: {path}",
  "notice.readingItemFailed": "Could not create Reading item: {message}",
  "notice.createdHobbyItem": "Created {label} item: {path}",
  "notice.openedExistingHobbyItem": "Opened existing {label} item: {path}",
  "notice.hobbyItemFailed": "Could not create hobby item: {message}",
  "notice.bookShelfFailed": "Could not create book shelf: {message}",
  "notice.createdReadingBookshelf": "Created reading Bases: {path}",
  "notice.updatedReadingBookshelf": "Updated reading Bases: {path}",
  "notice.readingBookshelfExists": "Reading Bases already exists: {path}",
  "notice.readingBookshelfFailed": "Could not create reading Bases: {message}",
  "notice.enableBases": "Enable the Bases core plugin to use reading Bases.",
  "notice.createdBookShelf": "Created book shelf: {path}",
  "notice.bookShelfExists": "Book shelf already exists: {path}",
  "notice.createdCues": "Created cues: {paths}",
  "notice.cuesExist": "Cues notes already exist: {paths}",
  "notice.noCueActivities": "No cue-supporting exercise activities configured",
  "notice.cuesFailed": "Could not create cues: {message}",
  "notice.createdDailyNoteTemplate": "Created daily note template: {path}",
  "notice.dailyNoteTemplateExists": "Daily note template already exists: {path}",
  "notice.dailyNoteTemplateFailed": "Could not create daily note template: {message}",
  "notice.createdTodaysDailyNote": "Created today's daily note: {path}",
  "notice.todaysDailyNoteExists": "Opened existing daily note: {path}",
  "notice.todaysDailyNoteFailed": "Could not create today's daily note: {message}",
  "notice.timerNeedsSavedNote": "Timer can only update a saved note.",
  "notice.timerNotRunning": "Timer is not running.",
  "notice.timerAlreadyRunning": "Timer is already running.",
  "notice.timerLogged": "Logged {minutes} min.",
  "notice.emptyCustomLocation": "Location cannot be empty.",
  "notice.gymLogNeedsSavedNote": "Set log can only update a saved note.",
  "notice.gymLogMissingFields": "Choose an exercise and enter weight and reps.",
  "notice.gymLogAdded": "Logged {exercise}.",
  "notice.gymLogEmptyExercise": "Exercise name cannot be empty.",
  "notice.gymLogEmptyMuscle": "Muscle cannot be empty.",
  "notice.gymLogSetupComplete": "Ready. Saved {pairs} exercises and updated {notes} notes.",
  "notice.gymLogSetupLater": "You can import gym exercises later from Settings \u2192 Atomic Tracker.",
  "notice.gymLogSetupFailed": "Set log setup failed: {message}",
  "notice.cueNeedsSavedNote": "Cues can only be added to a saved note.",
  "notice.cueMissingText": "Type a cue first.",
  "notice.cueAdded": "Added cue: {cue}",
  "notice.gymExerciseSaved": "Saved {exercise} \xB7 {muscle}.",
  "notice.updateNoteTitle": "What's new in {version}",
  "modal.dateTitle": "Date (YYYY-MM-DD)",
  "modal.cancel": "Cancel",
  "modal.ok": "OK",
  "modal.locationPlaceholder": "Location (Esc to skip)",
  "modal.otherLocationDetail": "Other location detail",
  "modal.customLocation": "Custom location",
  "modal.weightUnitPlaceholder": "Weight unit (Esc -> kg)",
  "modal.exerciseTypePlaceholder": "Exercise type",
  "modal.hobbyTypePlaceholder": "General habit",
  "modal.readingItemTitle": "Reading item title",
  "modal.hobbyItemTitle": "{label} item title",
  "modal.timeLogNote": "Time log note",
  "modal.gymNewExerciseTitle": "New exercise",
  "modal.gymExerciseName": "Exercise",
  "modal.gymMuscle": "Muscle",
  "modal.gymCustomMuscle": "Custom muscle",
  "modal.gymSetupTitle": "Easier gym sets",
  "modal.gymSetupLead": "You don't have to fill in each gym set one by one.",
  "modal.gymSetupBody": "On a gym note, pick an exercise, enter weight and reps, then click Add set. The table still keeps every set. It writes the row for you. Set up once to remember exercises from your old notes and add this form to gym notes that don't have it yet.",
  "modal.gymSetupConfirm": "Set up now",
  "modal.gymSetupLater": "Later",
  "location.home": "Home",
  "location.commercial": "Commercial",
  "location.hotelTravel": "Hotel/Travel",
  "location.other": "Other",
  "template.gymMuscles": "Muscles",
  "template.gymTable.exercise": "Exercise",
  "template.gymTable.muscle": "Muscle",
  "template.gymTable.weight": "Weight",
  "template.gymTable.reps": "Reps",
  "template.gymTable.notes": "Notes",
  "template.reminders": "\u{1F4A1} Reminders",
  "template.golfLocationHint": "\u{1F4CD} location: Home net, Driving range, Course, Other",
  "template.golfFocusHint": "\u{1F3AF} focus (multi): Grip, Stance, Takeaway, Backswing, Transition, Downswing, Impact, Follow-through, Tempo, Alignment",
  "template.golfClubHint": "\u{1F3CC}\uFE0F club (multi): Driver, 3W, 5W, Hybrid, 4i-9i, PW, GW, SW, LW, Putter, Mixed",
  "template.golfFeltHint": "felt: good, ok, bad",
  "template.dailyNote.trackToday": "Track your activities today!",
  "template.readingRemarks": "Remarks",
  "template.readingTimeLog": "Time log",
  "template.readingBookshelfTitle": "Reading bookshelf v2",
  "template.base.title": "Title",
  "template.base.authors": "Authors",
  "template.base.description": "Description",
  "template.base.pages": "Pages",
  "template.base.status": "Status",
  "template.base.tags": "Tags",
  "template.base.totalMinutes": "Total minutes",
  "template.base.cards": "Cards",
  "template.base.table": "Table",
  "block.opt.header": "Uncomment a line to use it. Lines that start with # are ignored.",
  "block.opt.yearHeatmap": "calendar year. Omit to use a YYYY-MM-DD note path, or this year",
  "block.opt.activityHeatmap": "all, one id, or comma list (gym, golf). Default: all enabled habits",
  "block.opt.rows": "preferred rows for several heatmaps. Default: 1",
  "block.opt.columns": "max columns; 1 stacks vertically. Default: 1",
  "block.opt.minColumnWidth": "wrap below this column width in px. Default: 300",
  "block.opt.defaultSpan": "relative width of each heatmap column. Default: 1.2",
  "block.opt.dateToday": "YYYY-MM-DD. Omit to use the note path date, or today",
  "block.opt.yearDashboard": "calendar year. Omit to use the note year property, or this year",
  "block.opt.yearCues": "calendar year. Omit to use the note year property, or this year",
  "block.opt.activityCues": "required: golf, gym, or another exercise id",
  "block.opt.activityBookshelf": "habit id (enabled item habit with a timer). Default: reading",
  "block.opt.statusBookshelf": "all, or to-read, reading, to-read-again, finished. Default: all",
  "block.opt.scaleBookshelf": "book size vs default, 0.25\u20134. Default: 1. Alias: ratio",
  "block.opt.noneActions": "No options. One button for each enabled habit.",
  "block.opt.noneTimer": "No options. Start, Stop, Resume, or Discard the timer on this note.",
  "block.opt.noneGymLog": "No options. Pick an exercise, enter weight and reps, then add a set. No need to type the table row yourself.",
  "block.opt.noneCueLog": "No options. Type markdown (including Traditional Chinese) and add it. It is saved as a bullet under this note\u2019s Reminders heading.",
  "reading.status.selectLabel": "Reading status",
  "reading.status.toRead": "To read",
  "reading.status.reading": "Reading",
  "reading.status.toReadAgain": "To read again",
  "reading.status.finished": "Finished",
  "property.selectLabel": "Select {property} value",
  "property.felt.good": "Good",
  "property.felt.ok": "OK",
  "property.felt.bad": "Bad",
  "property.golfLocation.homeNet": "Home net",
  "property.golfLocation.drivingRange": "Driving range",
  "property.golfLocation.course": "Course",
  "property.golfLocation.other": "Other",
  "property.location.custom": "Custom\u2026",
  "property.weightUnit.kg": "kg",
  "property.weightUnit.lb": "lb",
  "view.atomicCuesRequiresActivity": "atomic-cues requires an activity option, for example activity: golf.",
  "view.unknownAtomicBlock": "Unknown block: {kind}",
  "view.atomicError": "Error: {message}",
  "view.dashboard.overview": "{year} overview",
  "view.dashboard.range": "{from} \u2013 {to}",
  "view.dashboard.sessionsCount": "{count} sessions",
  "view.dashboard.prevYear": "Previous year",
  "view.dashboard.nextYear": "Next year",
  "view.dashboard.cues": "{activity} cues",
  "view.dashboard.readingBookshelf": "Bases",
  "view.dashboard.bookShelf": "Book shelf",
  "view.dashboard.kpiSessions": "Exercise sessions",
  "view.dashboard.kpiExerciseTime": "Exercise time",
  "view.dashboard.kpiVolume": "Volume lifted",
  "view.dashboard.kpiHabitTime": "Habit time",
  "view.dashboard.hourUnitShort": "h",
  "view.dashboard.minuteUnitShort": "m",
  "view.dashboard.kgUnit": "kg",
  "view.dashboard.minutesShort": "{minutes} min",
  "view.dashboard.minuteWord": "min",
  "view.dashboard.avgPerSession": "{minutes} min \xB7 avg {avg} min / session",
  "view.dashboard.setTableRows": "Set-table rows",
  "view.dashboard.activities": "Activities",
  "view.dashboard.activitiesMeta": "Bars \xB7 hours per month",
  "view.dashboard.domainExercise": "exercise",
  "view.dashboard.domainHabit": "habit",
  "view.dashboard.unitSessions": "sessions",
  "view.dashboard.unitMinutes": "minutes",
  "view.dashboard.unitItems": "items",
  "view.dashboard.unitVolume": "kg volume",
  "view.dashboard.colCount": "Count",
  "view.dashboard.colTime": "Time",
  "view.dashboard.colDetail": "Detail",
  "view.dashboard.colLast": "Last",
  "view.dashboard.kgLifted": "kg lifted",
  "view.dashboard.feltGoodCount": "felt good",
  "view.dashboard.readingNow": "reading now",
  "view.dashboard.inProgress": "in progress",
  "view.dashboard.barsHours": "Hours per month",
  "view.dashboard.lastSession": "last session: {date}",
  "view.dashboard.feltTitle": "How sessions felt",
  "view.dashboard.feltGood": "good",
  "view.dashboard.feltOk": "ok",
  "view.dashboard.feltBad": "bad",
  "view.dashboard.feltSummary": "felt {felt}",
  "view.dashboard.monthly": "Monthly",
  "view.dashboard.monthlyMeta": "Sessions per month by activity",
  "view.dashboard.monthlyTableHint": "Volume and habit minutes: see table",
  "view.dashboard.showMonthlyTable": "Show monthly table",
  "view.dashboard.month": "Month",
  "view.dashboard.volumeHeader": "{activity} volume (kg)",
  "view.dashboard.minutesHeader": "{activity} (min)",
  "view.dashboard.muscles": "Muscles",
  "view.dashboard.unknownMuscle": "Unspecified muscle",
  "view.dashboard.byVolumeSets": "by volume \xB7 sets",
  "view.dashboard.noSetData": "No set data",
  "view.dashboard.golfFocus": "Golf focus",
  "view.dashboard.focusMeta": "tags across {count} sessions",
  "view.dashboard.noFocusTags": "No focus tags",
  "view.dashboard.recentSessions": "Recent sessions",
  "view.dashboard.recentMeta": "Latest {count} \xB7 click to open the note",
  "view.dashboard.noSessions": "No sessions yet",
  "view.heatmap.summary": "{days} days \xB7 {minutes} min",
  "view.heatmap.summaryHours": "{days} days \xB7 {hours} h {minutes} m",
  "view.heatmap.less": "Less",
  "view.heatmap.more": "More",
  "view.heatmap.byDuration": "by duration",
  "view.heatmap.minutes": "{minutes} min",
  "view.heatmap.tooltip": "{date}: {minutes} min",
  "view.heatmap.tooltipOpen": "{date}: {minutes} min - click to open",
  "view.heatmap.invalidActivities": "Unknown or disabled heatmap activities: {ids}",
  "view.heatmap.noActivities": "No enabled habits to show in this heatmap.",
  "view.today.title": "Today",
  "view.today.summary": "{date} \xB7 {done} of {total}",
  "view.today.noSession": "No session yet",
  "view.cues.noCueActivity": "No cue-enabled {activity} exercise activity configured.",
  "view.cues.empty": "No cues in {year} yet. Add one from a session note.",
  "view.cues.repeats": "\xD7{count}",
  "view.cueLog.cue": "Cue",
  "view.cueLog.placeholder": "Keep the lead arm soft\n**Tempo** \u2014 count one-two",
  "view.cueLog.add": "Add cue",
  "view.cueLog.needsSavedNote": "Save this note to add cues.",
  "view.bookShelf.summary": "{count} books \xB7 {reading} reading \xB7 {finished} finished",
  "view.bookShelf.clickToOpen": "Click to open",
  "view.bookShelf.clickAgain": "Click again to open the note",
  "view.bookShelf.tapAgain": "Tap again to open",
  "view.bookShelf.noActivity": "No timer-backed hobby activity configured for {activity}.",
  "view.bookShelf.empty": "No Reading items yet. Run New reading item.",
  "view.bookShelf.emptyFiltered": "No Reading items with status: {statuses}.",
  "view.bookShelf.invalidStatuses": "Unknown book shelf status values: {statuses}",
  "view.timer.needsSavedNote": "Timer can only run from a saved note.",
  "view.timer.caption": "Timer",
  "view.timer.minuteUnit": "min",
  "view.timer.total": "Total {minutes} min",
  "view.timer.duration": "Duration {minutes} min",
  "view.timer.runningSince": "Running \xB7 since {time}",
  "view.timer.stop": "Stop",
  "view.timer.resume": "Resume",
  "view.timer.discard": "Discard",
  "view.timer.start": "Start",
  "view.gymLog.needsSession": "Set log can only run from a saved gym session note.",
  "view.gymLog.exercise": "Exercise",
  "view.gymLog.weight": "Weight",
  "view.gymLog.reps": "Reps",
  "view.gymLog.notes": "Notes",
  "view.gymLog.add": "Add set",
  "view.gymLog.newExercise": "New exercise\u2026",
  "view.gymLog.emptyCatalog": "No saved exercises yet. Choose New exercise\u2026 to add one.",
  "view.gymLog.customMuscle": "Custom\u2026",
  "muscle.Chest": "Chest",
  "muscle.Back": "Back",
  "muscle.Shoulders": "Shoulders",
  "muscle.Biceps": "Biceps",
  "muscle.Triceps": "Triceps",
  "muscle.Quads": "Quads",
  "muscle.Hamstrings": "Hamstrings",
  "muscle.Glutes": "Glutes",
  "muscle.Calves": "Calves",
  "muscle.Core": "Core"
};

// src/i18n/locales/zh-Hant-en.ts
var zhHantEn = {
  "settings.title": "Atomic Tracker",
  "settings.language": "\u8A9E\u8A00",
  "settings.languageDesc": "\u9078\u64C7\u5916\u639B\u4ECB\u9762\u8A9E\u8A00\u3002\u4E0D\u6703\u6539\u5BEB\u73FE\u6709\u7B46\u8A18\u3002",
  "settings.languageOption.zh-Hant-en": "\u7E41\u9AD4\u4E2D\u6587",
  "settings.languageOption.en": "\u82F1\u6587",
  "settings.timezone": "\u6642\u5340",
  "settings.timezoneDesc": "\u7528\u65BC\u300C\u4ECA\u65E5\u300D\u548C\u8A13\u7DF4\u65E5\u671F\u7684 IANA \u6642\u5340 (e.g. Asia/Hong_Kong)\u3002",
  "settings.dashboardPath": "\u5100\u8868\u677F\u8DEF\u5F91",
  "settings.dashboardPathDesc": "Open dashboard \u6703\u958B\u555F\u7684 vault \u76F8\u5C0D\u8DEF\u5F91\u3002",
  "settings.exerciseTypes": "\u904B\u52D5\u985E\u578B",
  "settings.exerciseTypesDesc": "\u8A13\u7DF4\u7B46\u8A18\u5B58\u65BC\u5404\u6D3B\u52D5\u8CC7\u6599\u593E\uFF0C\u65B0\u904B\u52D5\u985E\u578B\u9810\u8A2D\u653E\u5728 atomics/exercise/<Name>\u3002",
  "settings.addExerciseType": "\u65B0\u589E\u904B\u52D5\u985E\u578B",
  "settings.addExerciseTypeDesc": "\u5EFA\u7ACB\u6BCF\u65E5\u8A13\u7DF4\u985E\u578B\uFF0C\u555F\u7528\u63D0\u9192\uFF0C\u4E0D\u555F\u7528\u7D44\u6578\u8868\u3002",
  "settings.add": "\u65B0\u589E",
  "settings.activityId": "\u6D3B\u52D5 ID: {id}",
  "settings.labelPlaceholder": "\u6A19\u7C64",
  "settings.enabledLabel": "\u555F\u7528",
  "settings.labelField": "\u6A19\u7C64",
  "settings.folderField": "\u8CC7\u6599\u593E",
  "settings.cuesLabel": "\u63D0\u9192",
  "settings.heatmapShades": "Heatmap \u8272\u968E",
  "settings.exerciseFolderPlaceholder": "atomics/exercise/Name",
  "settings.enableCuesTooltip": "\u555F\u7528\u6B64\u904B\u52D5\u7684\u63D0\u9192\u5F59\u6574",
  "settings.enabledTooltip": "\u5728 Heatmap\u3001\u5100\u8868\u677F\u8207\u547D\u4EE4\u4E2D\u5305\u542B\u6B64\u7FD2\u6163",
  "settings.baseColor": "{label} \u984F\u8272",
  "settings.baseColorDesc": "\u9078\u64C7\u4E00\u7A2E\u984F\u8272\uFF0CHeatmap \u6DF1\u6DFA\u8272\u968E\u6703\u81EA\u52D5\u7522\u751F\uFF08\u7531\u6DFA\u81F3\u6DF1\uFF09\u3002",
  "settings.colors": "{label} \u984F\u8272",
  "settings.colorsDesc": "Heatmap \u984F\u8272\uFF0C\u7531\u4F4E\u81F3\u9AD8\u5F37\u5EA6\u3002",
  "settings.exerciseNamePlaceholder": "\u8DD1\u6B65",
  "settings.colorPlaceholder": "#{number}",
  "settings.hobbyTypes": "\u4E00\u822C\u7FD2\u6163",
  "settings.hobbyTypesDesc": "\u542B\u8A08\u6642\u5668\u7684\u9805\u76EE\u7B46\u8A18\u3002\u65B0\u7FD2\u6163\u9810\u8A2D\u653E\u5728 atomics/hobbies/<Name>\u3002\u95B1\u8B80\u70BA\u9810\u8A2D\u9805\u76EE\uFF0C\u53EF\u505C\u7528\u6216\u522A\u9664\u3002",
  "settings.addHobbyType": "\u65B0\u589E\u4E00\u822C\u7FD2\u6163",
  "settings.addHobbyTypeDesc": "\u5EFA\u7ACB\u542B\u8A08\u6642\u5668\u3001\u4E0D\u542B\u63D0\u9192\u7684\u8208\u8DA3\u9805\u76EE\u985E\u578B\u3002",
  "settings.hobbyNamePlaceholder": "\u4E0B\u68CB",
  "settings.hobbyFolderPlaceholder": "atomics/hobbies/Name",
  "settings.delete": "\u522A\u9664",
  "settings.deleteConfirm": "\u8981\u5F9E Atomic Tracker \u8A2D\u5B9A\u79FB\u9664\u300C{label}\u300D\u55CE\uFF1F\u4E0D\u6703\u522A\u9664 vault \u7B46\u8A18\u3002",
  "settings.gymExercises": "\u5065\u8EAB\u52D5\u4F5C",
  "settings.gymExercisesDesc": "\u4F60\u8A18\u4F4E\u904E\u5605\u52D5\u4F5C\uFF0C\u4E4B\u5F8C\u53EF\u4EE5\u55BA\u4E0B\u62C9\u9078\u55AE\u5EA6\u63C0\u3002",
  "settings.gymExercisesCount": "\u5B58\u5497 {count} \u7D44",
  "settings.gymImport": "\u7531\u5065\u8EAB\u7B46\u8A18\u532F\u5165",
  "settings.gymImportDesc": "\u55BA\u5065\u8EAB\u7B46\u8A18\u6435\u8FD4\u7528\u904E\u5605\u52D5\u4F5C\uFF0C\u540C\u57CB\u55BA\u672A\u6709\u8868\u55AE\u5605\u7B46\u8A18\u52A0\u4E0A\u7D44\u6578\u8868\u55AE\u3002",
  "command.newGymSession": "\u65B0\u589E\u5065\u8EAB\u8A13\u7DF4",
  "command.newGolfSession": "\u65B0\u589E\u9AD8\u723E\u592B\u8A13\u7DF4",
  "command.newExerciseSession": "\u65B0\u589E\u904B\u52D5\u8A13\u7DF4",
  "command.newReadingItem": "\u65B0\u589E\u95B1\u8B80\u9805\u76EE",
  "command.newHobbyItem": "\u65B0\u589E\u8208\u8DA3\u9805\u76EE",
  "command.createReadingBookshelf": "\u5EFA\u7ACB\u95B1\u8B80 Bases",
  "command.openReadingBookshelf": "\u958B\u555F\u95B1\u8B80 Bases",
  "command.createBookShelf": "\u5EFA\u7ACB\u66F8\u67B6",
  "command.openBookShelf": "\u958B\u555F\u66F8\u67B6",
  "command.createCues": "\u5EFA\u7ACB\u63D0\u793A\u7B46\u8A18",
  "command.createDailyNoteTemplate": "\u5EFA\u7ACB\u6BCF\u65E5\u7B46\u8A18\u7BC4\u672C",
  "command.createTodaysDailyNote": "\u5EFA\u7ACB\u4ECA\u65E5\u7B46\u8A18",
  "command.openDashboard": "\u958B\u555F\u5100\u8868\u677F",
  "notice.created": "\u5DF2\u5EFA\u7ACB: {path}",
  "notice.reloadForCommands": "\u8A9E\u8A00\u5DF2\u5132\u5B58\u3002\u8ACB\u91CD\u65B0\u8F09\u5165\u5916\u639B\u6216 Obsidian \u4EE5\u66F4\u65B0\u547D\u4EE4\u540D\u7A31\u3002",
  "notice.enterExerciseType": "\u8ACB\u5148\u8F38\u5165\u904B\u52D5\u985E\u578B\u540D\u7A31\u3002",
  "notice.enterHobbyType": "\u8ACB\u5148\u8F38\u5165\u4E00\u822C\u7FD2\u6163\u540D\u7A31\u3002",
  "notice.activityDeleted": "\u5DF2\u5F9E\u8A2D\u5B9A\u79FB\u9664 {label}\u3002",
  "notice.noHobbyActivities": "\u5C1A\u672A\u8A2D\u5B9A\u5DF2\u555F\u7528\u7684\u4E00\u822C\u7FD2\u6163",
  "notice.folderUnsafe": "\u8CC7\u6599\u593E\u5FC5\u9808\u662F\u5B89\u5168\u7684 vault \u76F8\u5C0D\u8DEF\u5F91\u3002",
  "notice.noExerciseActivities": "\u5C1A\u672A\u8A2D\u5B9A\u904B\u52D5\u6D3B\u52D5",
  "notice.noGymActivity": "\u5C1A\u672A\u8A2D\u5B9A\u5065\u8EAB\u6D3B\u52D5",
  "notice.noGolfActivity": "\u5C1A\u672A\u8A2D\u5B9A\u9AD8\u723E\u592B\u6D3B\u52D5",
  "notice.noReadingHobby": "\u5C1A\u672A\u8A2D\u5B9A\u7747\u66F8\u8208\u8DA3",
  "notice.dashboardNotFound": "\u627E\u4E0D\u5230\u5100\u8868\u677F: {path}",
  "notice.openedExistingSession": "\u5DF2\u958B\u555F\u73FE\u6709 {activity} \u8A13\u7DF4: {path}",
  "notice.createdSession": "\u5DF2\u5EFA\u7ACB {activity} \u8A13\u7DF4: {path}",
  "notice.invalidDate": "\u65E5\u671F\u7121\u6548",
  "notice.createdReadingItem": "\u5DF2\u5EFA\u7ACB\u95B1\u8B80\u9805\u76EE: {path}",
  "notice.openedExistingReadingItem": "\u5DF2\u958B\u555F\u73FE\u6709\u95B1\u8B80\u9805\u76EE: {path}",
  "notice.readingItemFailed": "\u7121\u6CD5\u5EFA\u7ACB\u95B1\u8B80\u9805\u76EE: {message}",
  "notice.createdHobbyItem": "\u5DF2\u5EFA\u7ACB {label} \u9805\u76EE: {path}",
  "notice.openedExistingHobbyItem": "\u5DF2\u958B\u555F\u73FE\u6709 {label} \u9805\u76EE: {path}",
  "notice.hobbyItemFailed": "\u7121\u6CD5\u5EFA\u7ACB\u8208\u8DA3\u9805\u76EE: {message}",
  "notice.bookShelfFailed": "\u7121\u6CD5\u5EFA\u7ACB\u66F8\u67B6: {message}",
  "notice.createdReadingBookshelf": "\u5DF2\u5EFA\u7ACB\u95B1\u8B80 Bases: {path}",
  "notice.updatedReadingBookshelf": "\u5DF2\u66F4\u65B0\u95B1\u8B80 Bases: {path}",
  "notice.readingBookshelfExists": "\u95B1\u8B80 Bases \u5DF2\u5B58\u5728: {path}",
  "notice.readingBookshelfFailed": "\u7121\u6CD5\u5EFA\u7ACB\u95B1\u8B80 Bases: {message}",
  "notice.enableBases": "\u8ACB\u555F\u7528 Bases \u6838\u5FC3\u5916\u639B\u4EE5\u4F7F\u7528\u95B1\u8B80 Bases\u3002",
  "notice.createdBookShelf": "\u5DF2\u5EFA\u7ACB\u66F8\u67B6: {path}",
  "notice.bookShelfExists": "\u66F8\u67B6\u5DF2\u5B58\u5728: {path}",
  "notice.createdCues": "\u5DF2\u5EFA\u7ACB\u63D0\u793A: {paths}",
  "notice.cuesExist": "\u63D0\u793A\u7B46\u8A18\u5DF2\u5B58\u5728: {paths}",
  "notice.noCueActivities": "\u5C1A\u672A\u8A2D\u5B9A\u652F\u63F4\u63D0\u793A\u7684\u904B\u52D5\u6D3B\u52D5",
  "notice.cuesFailed": "\u7121\u6CD5\u5EFA\u7ACB\u63D0\u793A: {message}",
  "notice.createdDailyNoteTemplate": "\u5DF2\u5EFA\u7ACB\u6BCF\u65E5\u7B46\u8A18\u7BC4\u672C: {path}",
  "notice.dailyNoteTemplateExists": "\u6BCF\u65E5\u7B46\u8A18\u7BC4\u672C\u5DF2\u5B58\u5728: {path}",
  "notice.dailyNoteTemplateFailed": "\u7121\u6CD5\u5EFA\u7ACB\u6BCF\u65E5\u7B46\u8A18\u7BC4\u672C: {message}",
  "notice.createdTodaysDailyNote": "\u5DF2\u5EFA\u7ACB\u4ECA\u65E5\u7B46\u8A18: {path}",
  "notice.todaysDailyNoteExists": "\u5DF2\u958B\u555F\u73FE\u6709\u6BCF\u65E5\u7B46\u8A18: {path}",
  "notice.todaysDailyNoteFailed": "\u7121\u6CD5\u5EFA\u7ACB\u4ECA\u65E5\u7B46\u8A18: {message}",
  "notice.timerNeedsSavedNote": "Timer \u53EA\u53EF\u66F4\u65B0\u5DF2\u5132\u5B58\u7684\u7B46\u8A18\u3002",
  "notice.timerNotRunning": "Timer \u5C1A\u672A\u958B\u59CB\u3002",
  "notice.timerAlreadyRunning": "Timer \u5DF2\u5728\u904B\u884C\u3002",
  "notice.timerLogged": "\u5DF2\u8A18\u9304 {minutes} \u5206\u9418\u3002",
  "notice.emptyCustomLocation": "\u5730\u9EDE\u4E0D\u53EF\u70BA\u7A7A\u767D\u3002",
  "notice.gymLogNeedsSavedNote": "\u7D44\u6578\u8868\u55AE\u6DE8\u4FC2\u53EF\u4EE5\u6539\u5DF2\u5132\u5B58\u5605\u7B46\u8A18\u3002",
  "notice.gymLogMissingFields": "\u63C0\u500B\u52D5\u4F5C\uFF0C\u518D\u586B\u91CD\u91CF\u540C\u6B21\u6578\u3002",
  "notice.gymLogAdded": "\u8A18\u4F4E\u5497 {exercise}\u3002",
  "notice.gymLogEmptyExercise": "\u52D5\u4F5C\u540D\u5514\u53EF\u4EE5\u7A7A\u767D\u3002",
  "notice.gymLogEmptyMuscle": "\u808C\u7FA4\u5514\u53EF\u4EE5\u7A7A\u767D\u3002",
  "notice.gymLogSetupComplete": "\u641E\u6382\u3002\u5B58\u5497 {pairs} \u500B\u52D5\u4F5C\uFF0C\u66F4\u65B0\u5497 {notes} \u7BC7\u7B46\u8A18\u3002",
  "notice.gymLogSetupLater": "\u4E4B\u5F8C\u53EF\u4EE5\u55BA Settings \u2192 Atomic Tracker \u532F\u5165\u5065\u8EAB\u52D5\u4F5C\u3002",
  "notice.gymLogSetupFailed": "\u7D44\u6578\u8868\u55AE\u8A2D\u5B9A\u5514\u5230: {message}",
  "notice.cueNeedsSavedNote": "\u63D0\u793A\u6DE8\u4FC2\u53EF\u4EE5\u52A0\u5728\u5DF2\u5132\u5B58\u5605\u7B46\u8A18\u3002",
  "notice.cueMissingText": "\u5148\u6253\u500B\u63D0\u793A\u5427\u3002",
  "notice.cueAdded": "\u52A0\u4F4E\u63D0\u793A\uFF1A{cue}",
  "notice.gymExerciseSaved": "\u5B58\u5497 {exercise} \xB7 {muscle}\u3002",
  "notice.updateNoteTitle": "{version} \u66F4\u65B0\u8AAA\u660E",
  "modal.dateTitle": "\u65E5\u671F (YYYY",
  "modal.cancel": "\u53D6\u6D88",
  "modal.ok": "OK",
  "modal.locationPlaceholder": "\u5730\u9EDE (Esc to skip\u7565\u904E)",
  "modal.otherLocationDetail": "\u5176\u4ED6\u5730\u9EDE\u8AAA\u660E",
  "modal.customLocation": "\u81EA\u8A02\u5730\u9EDE",
  "modal.weightUnitPlaceholder": "\u91CD\u91CF\u55AE\u4F4D (Esc -> kg)",
  "modal.exerciseTypePlaceholder": "\u904B\u52D5\u985E\u578B",
  "modal.hobbyTypePlaceholder": "\u4E00\u822C\u7FD2\u6163",
  "modal.readingItemTitle": "\u95B1\u8B80\u9805\u76EE\u6A19\u984C",
  "modal.hobbyItemTitle": "{label} \u9805\u76EE\u6A19\u984C",
  "modal.timeLogNote": "\u6642\u9593\u8A18\u9304\u5099\u8A3B",
  "modal.gymNewExerciseTitle": "\u65B0\u52D5\u4F5C",
  "modal.gymExerciseName": "\u52D5\u4F5C",
  "modal.gymMuscle": "\u808C\u7FA4",
  "modal.gymCustomMuscle": "\u81EA\u8A02\u808C\u7FA4",
  "modal.gymSetupTitle": "\u5065\u8EAB\u7D44\u6578\u800C\u5BB6\u66F4\u597D\u586B",
  "modal.gymSetupLead": "\u5514\u4F7F\u518D\u4E00\u5217\u4E00\u5217\u624B\u586B\u7D44\u6578\u3002",
  "modal.gymSetupBody": "\u55BA\u5065\u8EAB\u7B46\u8A18\u63C0\u500B\u52D5\u4F5C\u3001\u586B\u91CD\u91CF\u540C\u6B21\u6578\uFF0C\u518D\u64B3\u300C\u52A0\u4E00\u7D44\u300D\u3002\u7D44\u6578\u4F9D\u7136\u55BA\u7B46\u8A18\u500B\u8868\u5EA6\u3002\u5462\u500B\u6703\u5E6B\u4F60\u5BEB\u4F4E\u55F0\u884C\u3002\u8A2D\u5B9A\u4E00\u6B21\uFF1A\u8A18\u4F4F\u820A\u7B46\u8A18\u7528\u904E\u5605\u52D5\u4F5C\uFF0C\u540C\u57CB\u55BA\u672A\u6709\u5462\u500B\u8868\u55AE\u5605\u5065\u8EAB\u7B46\u8A18\u52A0\u843D\u53BB\u3002",
  "modal.gymSetupConfirm": "\u800C\u5BB6\u8A2D\u5B9A",
  "modal.gymSetupLater": "\u9072\u5572",
  "location.home": "\u5BB6\u4E2D",
  "location.commercial": "\u5546\u696D\u5065\u8EAB\u623F",
  "location.hotelTravel": "\u9152\u5E97\uFF0F\u65C5\u9014",
  "location.other": "\u5176\u4ED6",
  "template.gymMuscles": "\u808C\u7FA4",
  "template.gymTable.exercise": "\u{1F4AA} \u52D5\u4F5C",
  "template.gymTable.muscle": "\u{1F9EC} \u808C\u7FA4",
  "template.gymTable.weight": "\u2696\uFE0F \u91CD\u91CF",
  "template.gymTable.reps": "\u{1F522} \u6B21\u6578",
  "template.gymTable.notes": "\u{1F5D2}\uFE0F \u5099\u8A3B",
  "template.reminders": "\u{1F4A1} \u63D0\u9192",
  "template.golfLocationHint": "\u{1F4CD} \u5730\u9EDE: Home net\u7DF4\u7FD2\u5834, Course\u5176\u4ED6",
  "template.golfFocusHint": "\u{1F3AF} \u91CD\u9EDE (multi): Grip\u7AD9\u59FF, Takeaway\u4E0A\u687F, Transition\u4E0B\u687F, Impact\u9001\u687F, Tempo\u7784\u6E96\u7DDA",
  "template.golfClubHint": "\u{1F3CC}\uFE0F \u7403\u687F (multi): Driver\u4E09\u865F\u6728, 5W\u6DF7\u8840\u687F, 4i-9i\u5288\u8D77\u687F, GW\u6C99\u5751\u687F, LW\u63A8\u687F, Mixed\u6DF7\u5408",
  "template.golfFeltHint": "\u611F\u89BA: good\u4E00\u822C, bad\u5DEE",
  "template.dailyNote.trackToday": "\u8A18\u9304\u4ECA\u65E5\u6D3B\u52D5\uFF01",
  "template.readingRemarks": "\u5099\u8A3B",
  "template.readingTimeLog": "\u6642\u9593\u8A18\u9304",
  "template.readingBookshelfTitle": "Reading bookshelf v2",
  "template.base.title": "\u66F8\u540D",
  "template.base.authors": "\u4F5C\u8005",
  "template.base.description": "\u63CF\u8FF0",
  "template.base.pages": "\u9801\u6578",
  "template.base.status": "\u72C0\u614B",
  "template.base.tags": "\u6A19\u7C64",
  "template.base.totalMinutes": "\u7E3D\u5206\u9418",
  "template.base.cards": "\u5361\u7247",
  "template.base.table": "\u8868\u683C",
  "block.opt.header": "\u53D6\u6D88\u8A3B\u89E3\u5373\u53EF\u4F7F\u7528\u3002\u4EE5 # \u958B\u982D\u7684\u884C\u6703\u88AB\u5FFD\u7565\u3002",
  "block.opt.yearHeatmap": "\u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u8DEF\u5F91\u4E2D\u7684\u65E5\u671F\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.activityHeatmap": "\u5168\u90E8\u3001\u55AE\u4E00 id\uFF0C\u6216\u9017\u865F\u6E05\u55AE\u3002\u9810\u8A2D\uFF1A\u5168\u90E8\u5DF2\u555F\u7528\u7FD2\u6163",
  "block.opt.rows": "\u591A\u500B heatmap \u7684\u5217\u6578\u3002\u9810\u8A2D\uFF1A1",
  "block.opt.columns": "\u6B04\u6578\u4E0A\u9650\uFF1B1 \u70BA\u76F4\u5411\u5806\u758A\u3002\u9810\u8A2D\uFF1A1",
  "block.opt.minColumnWidth": "\u4F4E\u65BC\u6B64\u6B04\u5BEC\uFF08px\uFF09\u6703\u63DB\u884C\u3002\u9810\u8A2D\uFF1A300",
  "block.opt.defaultSpan": "\u6BCF\u500B heatmap \u6B04\u7684\u76F8\u5C0D\u5BEC\u5EA6\u3002\u9810\u8A2D\uFF1A1.2",
  "block.opt.dateToday": "\u65E5\u671F\u3002\u7701\u7565\u5247\u7528\u8DEF\u5F91\u4E2D\u7684\u65E5\u671F\uFF0C\u5426\u5247\u7528\u4ECA\u5929",
  "block.opt.yearDashboard": "\u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u7B46\u8A18 year \u5C6C\u6027\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.yearCues": "\u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u7B46\u8A18 year \u5C6C\u6027\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.activityCues": "\u5FC5\u586B\uFF1Agolf\u3001gym \u6216\u5176\u4ED6\u904B\u52D5 id",
  "block.opt.activityBookshelf": "\u7FD2\u6163 id\uFF08\u9700\u5DF2\u555F\u7528\u3001\u9805\u76EE\u7B46\u8A18\u8207 timer\uFF09\u3002\u9810\u8A2D\uFF1Areading",
  "block.opt.statusBookshelf": "\u5168\u90E8\uFF0C\u6216 to-read\u3001reading\u3001to-read-again\u3001finished\u3002\u9810\u8A2D\uFF1Aall",
  "block.opt.scaleBookshelf": "\u76F8\u5C0D\u9810\u8A2D\u5C3A\u5BF8\uFF0C0.25\u20134\u3002\u9810\u8A2D\uFF1A1\u3002\u5225\u540D\uFF1Aratio",
  "block.opt.noneActions": "\u7121\u9078\u9805\u3002\u6BCF\u500B\u5DF2\u555F\u7528\u7FD2\u6163\u4E00\u500B\u6309\u9215\u3002",
  "block.opt.noneTimer": "\u7121\u9078\u9805\u3002\u5728\u6B64\u7B46\u8A18\u958B\u59CB\u3001\u505C\u6B62\u3001\u7E7C\u7E8C\u6216\u653E\u68C4\u8A08\u6642\u3002",
  "block.opt.noneGymLog": "\u7121\u9078\u9805\u3002\u63C0\u500B\u52D5\u4F5C\u3001\u586B\u91CD\u91CF\u540C\u6B21\u6578\uFF0C\u518D\u52A0\u4E00\u7D44\u3002\u5514\u4F7F\u81EA\u5DF1\u6253\u8868\u683C\u55F0\u884C\u3002",
  "block.opt.noneCueLog": "\u7121\u9078\u9805\u3002\u7528 Markdown\uFF08\u5305\u62EC\u7E41\u9AD4\u4E2D\u6587\uFF09\u6253\u500B\u63D0\u793A\u518D\u52A0\uFF0C\u4F62\u6703\u5B58\u5728\u9019\u7BC7\u7B46\u8A18\u5605 Reminders \u6A19\u984C\u4E0B\u9762\u3002",
  "reading.status.selectLabel": "\u95B1\u8B80\u72C0\u614B",
  "reading.status.toRead": "\u5F85\u8B80",
  "reading.status.reading": "\u95B1\u8B80\u4E2D",
  "reading.status.toReadAgain": "\u91CD\u8B80",
  "reading.status.finished": "\u8B80\u5B8C",
  "property.selectLabel": "\u9078\u64C7 {property} \u503C",
  "property.felt.good": "\u597D",
  "property.felt.ok": "\u4E00\u822C",
  "property.felt.bad": "\u5DEE",
  "property.golfLocation.homeNet": "\u5BB6\u7528\u7DB2",
  "property.golfLocation.drivingRange": "\u7DF4\u7FD2\u5834",
  "property.golfLocation.course": "\u7403\u5834",
  "property.golfLocation.other": "\u5176\u4ED6",
  "property.location.custom": "\u81EA\u8A02\u2026",
  "property.weightUnit.kg": "kg",
  "property.weightUnit.lb": "lb",
  "view.atomicCuesRequiresActivity": "atomic-cues \u9700\u8981 activity \u9078\u9805\uFF0C\u4F8B\u5982 activity: golf\u3002",
  "view.unknownAtomicBlock": "\u672A\u77E5\u5340\u584A: {kind}",
  "view.atomicError": "\u932F\u8AA4: {message}",
  "view.dashboard.overview": "{year} \u7E3D\u89BD",
  "view.dashboard.range": "{from} \u2013 {to}",
  "view.dashboard.sessionsCount": "{count} \u6B21",
  "view.dashboard.prevYear": "\u4E0A\u4E00\u5E74",
  "view.dashboard.nextYear": "\u4E0B\u4E00\u5E74",
  "view.dashboard.cues": "{activity} \u63D0\u9192\u5F59\u6574",
  "view.dashboard.readingBookshelf": "Bases",
  "view.dashboard.bookShelf": "\u66F8\u67B6",
  "view.dashboard.kpiSessions": "\u904B\u52D5\u6B21\u6578",
  "view.dashboard.kpiExerciseTime": "\u904B\u52D5\u6642\u9577",
  "view.dashboard.kpiVolume": "\u7E3D\u8A13\u7DF4\u91CF",
  "view.dashboard.kpiHabitTime": "\u7FD2\u6163\u6642\u9577",
  "view.dashboard.hourUnitShort": "h",
  "view.dashboard.minuteUnitShort": "m",
  "view.dashboard.kgUnit": "kg",
  "view.dashboard.minutesShort": "{minutes} \u5206\u9418",
  "view.dashboard.minuteWord": "\u5206\u9418",
  "view.dashboard.avgPerSession": "{minutes} \u5206\u9418 \xB7 \u5E73\u5747 {avg} \u5206\u9418",
  "view.dashboard.setTableRows": "\u7D44\u6578\u8868",
  "view.dashboard.activities": "\u6D3B\u52D5",
  "view.dashboard.activitiesMeta": "\u6BCF\u6708\u6642\u6578",
  "view.dashboard.domainExercise": "\u904B\u52D5",
  "view.dashboard.domainHabit": "\u7FD2\u6163",
  "view.dashboard.unitSessions": "\u6B21",
  "view.dashboard.unitMinutes": "\u5206\u9418",
  "view.dashboard.unitItems": "\u9805\u76EE",
  "view.dashboard.unitVolume": "\u8A13\u7DF4\u91CF",
  "view.dashboard.colCount": "\u6578\u91CF",
  "view.dashboard.colTime": "\u6642\u9577",
  "view.dashboard.colDetail": "\u8A73\u60C5",
  "view.dashboard.colLast": "\u6700\u8FD1",
  "view.dashboard.kgLifted": "\u8A13\u7DF4\u91CF",
  "view.dashboard.feltGoodCount": "\u611F\u89BA\u597D",
  "view.dashboard.readingNow": "\u5728\u8B80",
  "view.dashboard.inProgress": "\u9032\u884C\u4E2D",
  "view.dashboard.barsHours": "\u6BCF\u6708\u6642\u6578",
  "view.dashboard.lastSession": "\u6700\u8FD1\u8A13\u7DF4: {date}",
  "view.dashboard.feltTitle": "\u611F\u89BA",
  "view.dashboard.feltGood": "\u597D",
  "view.dashboard.feltOk": "\u4E00\u822C",
  "view.dashboard.feltBad": "\u5DEE",
  "view.dashboard.feltSummary": "\u611F\u89BA {felt}",
  "view.dashboard.monthly": "\u6BCF\u6708",
  "view.dashboard.monthlyMeta": "\u6BCF\u6708\u5404\u6D3B\u52D5\u6B21\u6578",
  "view.dashboard.monthlyTableHint": "\u8A13\u7DF4\u91CF\u540C\u7FD2\u6163\u5206\u9418\uFF1A\u898B\u8868\u683C",
  "view.dashboard.showMonthlyTable": "\u986F\u793A\u6BCF\u6708\u8868\u683C",
  "view.dashboard.month": "\u6708",
  "view.dashboard.volumeHeader": "{activity} \u8A13\u7DF4\u91CF (kg)",
  "view.dashboard.minutesHeader": "{activity}\uFF08\u5206\u9418\uFF09",
  "view.dashboard.muscles": "\u808C\u7FA4",
  "view.dashboard.unknownMuscle": "\u672A\u6307\u5B9A\u808C\u7FA4",
  "view.dashboard.byVolumeSets": "\u6309\u8A13\u7DF4\u91CF \xB7 \u7D44\u6578",
  "view.dashboard.noSetData": "\u5C1A\u7121\u7D44\u6578\u8CC7\u6599",
  "view.dashboard.golfFocus": "\u9AD8\u723E\u592B\u91CD\u9EDE",
  "view.dashboard.focusMeta": "\u8DE8 {count} \u6B21\u8A13\u7DF4\u7684\u6A19\u7C64",
  "view.dashboard.noFocusTags": "\u5C1A\u7121\u91CD\u9EDE\u6A19\u7C64",
  "view.dashboard.recentSessions": "\u6700\u8FD1\u8A13\u7DF4",
  "view.dashboard.recentMeta": "\u6700\u8FD1 {count} \xB7 \u9EDE\u64CA\u958B\u555F\u7B46\u8A18",
  "view.dashboard.noSessions": "\u5C1A\u672A\u8A18\u9304",
  "view.heatmap.summary": "{days} \u65E5 \xB7 {minutes} \u5206\u9418",
  "view.heatmap.summaryHours": "{days} \u65E5 \xB7 {hours} \u5C0F\u6642 {minutes} \u5206\u9418",
  "view.heatmap.less": "\u5C11",
  "view.heatmap.more": "\u591A",
  "view.heatmap.byDuration": "\u6309\u6642\u9577",
  "view.heatmap.minutes": "{minutes} \u5206\u9418",
  "view.heatmap.tooltip": "{date}\uFF1A{minutes} \u5206\u9418",
  "view.heatmap.tooltipOpen": "{date}\uFF1A{minutes} \u5206\u9418 \xB7 \u9EDE\u64CA\u958B\u555F",
  "view.heatmap.invalidActivities": "\u672A\u77E5\u6216\u5DF2\u505C\u7528\u7684 Heatmap \u6D3B\u52D5: {ids}",
  "view.heatmap.noActivities": "\u6C92\u6709\u53EF\u986F\u793A\u7684\u5DF2\u555F\u7528\u7FD2\u6163\u3002",
  "view.today.title": "\u4ECA\u65E5",
  "view.today.summary": "{date} \xB7 {done} / {total}",
  "view.today.noSession": "\u5C1A\u672A\u8A18\u9304",
  "view.cues.noCueActivity": "\u5C1A\u672A\u8A2D\u5B9A\u652F\u63F4\u63D0\u9192\u7684 {activity} \u904B\u52D5\u6D3B\u52D5\u3002",
  "view.cues.empty": "{year} \u4EF2\u672A\u6709\u63D0\u793A\u3002\u55BA\u8A13\u7DF4\u7B46\u8A18\u52A0\u4E00\u689D\u5566\u3002",
  "view.cues.repeats": "\xD7{count}",
  "view.cueLog.cue": "\u63D0\u793A",
  "view.cueLog.placeholder": "\u524D\u81C2\u653E\u9B06\n**Tempo\u7BC0\u594F** \u2014 count one-two",
  "view.cueLog.add": "\u52A0\u63D0\u793A",
  "view.cueLog.needsSavedNote": "\u5148\u5132\u5B58\u7B46\u8A18\u624D\u52A0\u5F97\u63D0\u793A\u3002",
  "view.bookShelf.summary": "{count} \u672C \xB7 {reading} \u672C\u95B1\u8B80\u4E2D \xB7 {finished} \u672C\u8B80\u5B8C",
  "view.bookShelf.clickToOpen": "\u64B3\u4E00\u4E0B\u958B\u555F",
  "view.bookShelf.tapAgain": "\u518D\u64B3\u4E00\u6B21\u958B\u555F",
  "view.bookShelf.noActivity": "\u5C1A\u672A\u8A2D\u5B9A\u652F\u63F4 timer \u7684\u8208\u8DA3\u6D3B\u52D5: {activity}\u3002",
  "view.bookShelf.empty": "\u5C1A\u672A\u6709\u95B1\u8B80\u9805\u76EE\u3002\u8ACB\u57F7\u884C New reading item\u3002",
  "view.bookShelf.emptyFiltered": "\u6C92\u6709\u72C0\u614B\u70BA {statuses} \u7684\u95B1\u8B80\u9805\u76EE\u3002",
  "view.bookShelf.invalidStatuses": "\u672A\u77E5\u7684\u66F8\u67B6\u72C0\u614B\u503C: {statuses}",
  "view.timer.needsSavedNote": "Timer \u53EA\u53EF\u5728\u5DF2\u5132\u5B58\u7684\u7B46\u8A18\u57F7\u884C\u3002",
  "view.timer.caption": "\u8A08\u6642",
  "view.timer.minuteUnit": "\u5206\u9418",
  "view.timer.total": "\u7E3D\u8A08 {minutes} \u5206\u9418",
  "view.timer.duration": "\u6642\u9577 {minutes} \u5206\u9418",
  "view.timer.runningSince": "\u8A08\u6642\u4E2D \xB7 {time} \u958B\u59CB",
  "view.timer.stop": "\u505C\u6B62",
  "view.timer.resume": "\u7E7C\u7E8C",
  "view.timer.discard": "\u653E\u68C4",
  "view.timer.start": "\u958B\u59CB",
  "view.gymLog.needsSession": "\u8981\u55BA\u5DF2\u5132\u5B58\u5605\u5065\u8EAB\u7B46\u8A18\u5148\u52A0\u5230\u7D44\u6578\u3002",
  "view.gymLog.exercise": "\u52D5\u4F5C",
  "view.gymLog.weight": "\u91CD\u91CF",
  "view.gymLog.reps": "\u6B21\u6578",
  "view.gymLog.notes": "\u5099\u8A3B",
  "view.gymLog.add": "\u52A0\u4E00\u7D44",
  "view.gymLog.newExercise": "\u65B0\u52D5\u4F5C\u2026",
  "view.gymLog.emptyCatalog": "\u672A\u6709\u5B58\u904E\u52D5\u4F5C\u3002\u63C0\u300C\u65B0\u52D5\u4F5C\u2026\u300D\u52A0\u4E00\u500B\u3002",
  "view.gymLog.customMuscle": "\u81EA\u8A02\u2026",
  "muscle.Chest": "\u80F8",
  "muscle.Back": "\u80CC",
  "muscle.Shoulders": "\u80A9",
  "muscle.Biceps": "\u4E8C\u982D",
  "muscle.Triceps": "\u4E09\u982D",
  "muscle.Quads": "\u80A1\u56DB\u982D",
  "muscle.Hamstrings": "\u817F\u5F8C\u8171",
  "muscle.Glutes": "\u81C0",
  "muscle.Calves": "\u5C0F\u817F",
  "muscle.Core": "\u6838\u5FC3",
  "view.bookShelf.clickAgain": "\u518D\u64B3\u4E00\u6B21\u958B\u555F\u7B46\u8A18"
};

// src/i18n/index.ts
var DEFAULT_LANGUAGE = "en";
var TABLES = {
  en,
  "zh-Hant-en": zhHantEn
};
function isLanguage(value) {
  return value === "en" || value === "zh-Hant-en";
}
function t(key, language, vars) {
  const table = TABLES[language] ?? TABLES[DEFAULT_LANGUAGE];
  let out = table[key] ?? TABLES.en[key] ?? key;
  if (!vars) return out;
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}

// src/types.ts
var GREEN = [
  "#9be9a8",
  "#40c463",
  "#30a14e",
  "#216e39"
];
var ORANGE = [
  "#ffd8a8",
  "#ffa94d",
  "#f76707",
  "#d9480f"
];
var BLUE = [
  "#bfdbfe",
  "#60a5fa",
  "#2563eb",
  "#1e3a8a"
];
var DEFAULT_ACTIVITY_TYPES = [
  {
    id: "gym",
    domain: "exercise",
    label: "\u{1F3CB}\uFE0F Gym / \u5065\u8EAB",
    folder: "atomics/exercise/Gym",
    enabled: true,
    baseColor: GREEN[2],
    colors: GREEN,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: true
  },
  {
    id: "golf",
    domain: "exercise",
    label: "\u26F3 Golf / \u9AD8\u723E\u592B",
    folder: "atomics/exercise/Golf",
    enabled: true,
    baseColor: ORANGE[2],
    colors: ORANGE,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false
  },
  {
    id: "reading",
    domain: "hobby",
    label: "Reading / \u7747\u66F8",
    folder: "atomics/hobbies/Reading",
    enabled: true,
    baseColor: BLUE[2],
    colors: BLUE,
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false
  }
];
var DEFAULT_SETTINGS = {
  language: "en",
  timezone: "Asia/Hong_Kong",
  dashboardPath: "atomics/Dashboard.md",
  golfCuesPath: "atomics/exercise/Golf/Cues.md",
  gymCuesPath: "atomics/exercise/Gym/Cues.md",
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  gymExercises: [],
  gymLogSetup: "complete",
  lastSeenUpdateNoteVersion: ""
};

// src/util/colors.ts
var BUILTIN_SHADES = {
  [GREEN[2].toLowerCase()]: GREEN,
  [ORANGE[2].toLowerCase()]: ORANGE,
  [BLUE[2].toLowerCase()]: BLUE
};
function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}
function expandHex(hex) {
  const cleaned = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return GREEN[2];
}
function parseRgb(hex) {
  const full = expandHex(hex);
  return {
    r: Number.parseInt(full.slice(1, 3), 16),
    g: Number.parseInt(full.slice(3, 5), 16),
    b: Number.parseInt(full.slice(5, 7), 16)
  };
}
function toHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function mix(from, to, amount) {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount
  };
}
function shadesFromBaseColor(baseColor) {
  const normalized = expandHex(baseColor);
  const builtin = BUILTIN_SHADES[normalized];
  if (builtin) return [builtin[0], builtin[1], builtin[2], builtin[3]];
  const base = parseRgb(normalized);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  return [
    toHex(mix(base, white, 0.55)),
    toHex(mix(base, white, 0.25)),
    normalized,
    toHex(mix(base, black, 0.35))
  ];
}
function defaultBaseColorForDomain(domain) {
  return domain === "hobby" ? BLUE[2] : GREEN[2];
}

// src/util/vault-path.ts
function normalizeSlashes(path) {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function isSafeRelativeSegments(path) {
  if (!path || path === "/") return false;
  if (path.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(path)) return false;
  const segments = path.split("/");
  if (segments.length === 0) return false;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return false;
  }
  return true;
}
function isSafeVaultFolder(folder) {
  if (typeof folder !== "string") return false;
  const trimmed = folder.trim();
  if (!trimmed) return false;
  const normalized = normalizeSlashes(trimmed).replace(/\/$/, "");
  return isSafeRelativeSegments(normalized);
}
function isSafeVaultNotePath(path) {
  if (typeof path !== "string") return false;
  const normalized = normalizeSlashes(path.trim());
  if (!normalized.endsWith(".md")) return false;
  if (normalized.endsWith("/.md")) return false;
  return isSafeRelativeSegments(normalized);
}
function joinVaultNotePath(folder, notePath) {
  const leaf = normalizeSlashes(notePath.trim()).replace(/^\/+/, "");
  const base = normalizeSlashes(folder.trim()).replace(/\/+$/, "");
  if (base && !isSafeVaultFolder(base)) return null;
  const path = base ? `${base}/${leaf}` : leaf;
  return isSafeVaultNotePath(path) ? path : null;
}
function sessionScanPrefix(folder, year) {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/${year}/`;
}
function readingItemsFolder(folder) {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/Items`;
}
function hobbyItemsScanPrefix(folder) {
  const itemsFolder = readingItemsFolder(folder);
  return itemsFolder ? `${itemsFolder}/` : null;
}
function normalizeVaultPath(path) {
  return normalizeSlashes(path.trim()).replace(/\/$/, "");
}
function pathTouchesScope(path, scope) {
  if (!path || !scope) return false;
  const p = normalizeVaultPath(path);
  const s = normalizeVaultPath(scope);
  if (!p || !s) return false;
  return p === s || p.startsWith(`${s}/`) || s.startsWith(`${p}/`);
}

// src/util/record.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/util/activity-types.ts
var FALLBACK_EXERCISE_NAME = "Exercise";
var FALLBACK_HOBBY_NAME = "Hobby";
function cleanFolderSegment(label) {
  const cleaned = label.replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ").replace(/\.+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_EXERCISE_NAME;
}
function activityIdFromLabel(label) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return id || "activity";
}
function defaultExerciseFolder(label) {
  const folder = `atomics/exercise/${cleanFolderSegment(label)}`;
  return isSafeVaultFolder(folder) ? folder : `atomics/exercise/${FALLBACK_EXERCISE_NAME}`;
}
function defaultHobbyFolder(label) {
  const cleaned = cleanFolderSegment(label);
  const folder = `atomics/hobbies/${cleaned === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleaned}`;
  return isSafeVaultFolder(folder) ? folder : `atomics/hobbies/${FALLBACK_HOBBY_NAME}`;
}
function colorTuple(value, fallback) {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  const items = value;
  const [first, second, third, fourth] = items;
  if (typeof first === "string" && first.trim() !== "" && typeof second === "string" && second.trim() !== "" && typeof third === "string" && third.trim() !== "" && typeof fourth === "string" && fourth.trim() !== "") {
    return [first, second, third, fourth];
  }
  return fallback;
}
function resolveBaseColor(value, domain, fallbackColors) {
  if (typeof value.baseColor === "string" && isHexColor(value.baseColor)) {
    return value.baseColor.trim().toLowerCase().length === 4 ? shadesFromBaseColor(value.baseColor)[2] : expandHex(value.baseColor.trim());
  }
  const fromColors = colorTuple(value.colors, fallbackColors)[2];
  if (typeof fromColors === "string" && isHexColor(fromColors)) {
    return expandHex(fromColors.trim());
  }
  return defaultBaseColorForDomain(domain);
}
function withDerivedColors(activity) {
  const baseColor = expandHex(activity.baseColor);
  return {
    ...activity,
    baseColor,
    colors: shadesFromBaseColor(baseColor)
  };
}
function createExerciseActivityType(label) {
  const cleanedLabel = cleanFolderSegment(label);
  return withDerivedColors({
    id: activityIdFromLabel(cleanedLabel),
    domain: "exercise",
    label: cleanedLabel,
    folder: defaultExerciseFolder(cleanedLabel),
    enabled: true,
    baseColor: GREEN[2],
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false
  });
}
function createHobbyActivityType(label) {
  const cleanedLabel = cleanFolderSegment(label);
  const labelForHobby = cleanedLabel === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleanedLabel;
  return withDerivedColors({
    id: activityIdFromLabel(labelForHobby),
    domain: "hobby",
    label: labelForHobby,
    folder: defaultHobbyFolder(labelForHobby),
    enabled: true,
    baseColor: defaultBaseColorForDomain("hobby"),
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false
  });
}
function domainFrom(value) {
  return value === "exercise" || value === "hobby" ? value : null;
}
function noteModelFrom(value) {
  return value === "dailySession" || value === "item" ? value : null;
}
function normalizeActivityType(value, fallbackColors) {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  const domain = domainFrom(value.domain);
  const noteModel = noteModelFrom(value.noteModel);
  if (!label || !folder || !domain || !noteModel || !isSafeVaultFolder(folder)) {
    return null;
  }
  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const id = activityIdFromLabel(idRaw || label);
  const baseColor = resolveBaseColor(value, domain, fallbackColors);
  return withDerivedColors({
    id,
    domain,
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel,
    supportsCues: domain === "exercise" && value.supportsCues === true,
    supportsTimer: domain === "hobby" && value.supportsTimer === true,
    supportsSetTable: domain === "exercise" && noteModel === "dailySession" && value.supportsSetTable === true
  });
}
function activityTypeFromSeries(value, fallbackColors) {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  if (!label || !folder || !isSafeVaultFolder(folder)) return null;
  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const kind = value.kind === "gym" || value.kind === "golf" ? value.kind : "generic";
  const id = activityIdFromLabel(idRaw || kind || label);
  const colors = colorTuple(
    value.colors,
    kind === "golf" ? ORANGE : fallbackColors
  );
  const baseColor = resolveBaseColor(
    { ...value, colors },
    "exercise",
    colors
  );
  return withDerivedColors({
    id,
    domain: "exercise",
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: kind === "gym"
  });
}
function exerciseActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.enabled !== false && activity.domain === "exercise" && activity.noteModel === "dailySession"
  );
}
function hobbyActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.enabled !== false && activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer
  );
}
function allHobbyActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer
  );
}
function allExerciseActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.domain === "exercise" && activity.noteModel === "dailySession"
  );
}
function activityPaintKey(activity) {
  return [
    activity.id,
    activity.domain,
    activity.label,
    activity.folder,
    String(activity.enabled),
    activity.baseColor,
    activity.noteModel,
    String(activity.supportsCues),
    String(activity.supportsTimer),
    String(activity.supportsSetTable),
    activity.colors.join(",")
  ].join("\0");
}
function resolveCueActivityType(activityTypes, activityId) {
  const normalizedId = activityId.trim().toLowerCase();
  return exerciseActivities(activityTypes).find(
    (activity) => activity.supportsCues && activity.id.toLowerCase() === normalizedId
  );
}
function cuePathForActivity(activity) {
  return `${activity.folder.replace(/\/$/, "")}/Cues.md`;
}

// src/util/action-activities.ts
function actionActivities(activityTypes) {
  return [
    ...exerciseActivities(activityTypes),
    ...hobbyActivities(activityTypes)
  ];
}

// src/util/codeblock-languages.ts
var ATOMIC_CODEBLOCK_LANGUAGES = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-cues",
  "atomic-cue-log",
  "atomic-timer",
  "atomic-gym-log",
  "atomic-bookshelf"
];
function codeblockLanguages() {
  return [...ATOMIC_CODEBLOCK_LANGUAGES];
}
function resolveCueActivity(kind, options) {
  if (kind !== "atomic-cues") return null;
  const activity = options.activity?.trim();
  return activity || null;
}

// src/util/codeblock-defaults.ts
var BLOCK_SPECS = {
  "atomic-heatmap": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearHeatmap"
      },
      {
        key: "activity",
        example: "all",
        commentKey: "block.opt.activityHeatmap"
      },
      {
        key: "rows",
        example: "1",
        commentKey: "block.opt.rows"
      },
      {
        key: "columns",
        example: "1",
        commentKey: "block.opt.columns"
      },
      {
        key: "min-column-width",
        example: "300",
        commentKey: "block.opt.minColumnWidth"
      },
      {
        key: "default-span",
        example: "1.2",
        commentKey: "block.opt.defaultSpan"
      }
    ]
  },
  "atomic-today": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "date",
        example: "2026-08-08",
        commentKey: "block.opt.dateToday"
      }
    ]
  },
  "atomic-dashboard": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearDashboard"
      }
    ]
  },
  "atomic-actions": {
    emptyKey: "block.opt.noneActions",
    options: []
  },
  "atomic-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "golf",
        commentKey: "block.opt.activityCues",
        defaultActive: true
      },
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues"
      }
    ]
  },
  "atomic-cue-log": {
    emptyKey: "block.opt.noneCueLog",
    options: []
  },
  "atomic-timer": {
    emptyKey: "block.opt.noneTimer",
    options: []
  },
  "atomic-gym-log": {
    emptyKey: "block.opt.noneGymLog",
    options: []
  },
  "atomic-bookshelf": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "reading",
        commentKey: "block.opt.activityBookshelf",
        defaultActive: true
      },
      {
        key: "status",
        example: "all",
        commentKey: "block.opt.statusBookshelf"
      },
      {
        key: "scale",
        example: "1",
        commentKey: "block.opt.scaleBookshelf"
      }
    ]
  }
};
function optionLine(spec, language, values) {
  const comment = t(spec.commentKey, language);
  const hasOverride = Object.prototype.hasOwnProperty.call(values, spec.key);
  const active = hasOverride ? values[spec.key] : spec.defaultActive ? spec.example : void 0;
  const pair = `${spec.key}: ${active ?? spec.example}`;
  const line = `${pair}  # ${comment}`;
  return active !== void 0 ? line : `# ${line}`;
}
function defaultAtomicBlockBody(kind, language = "en", values = {}) {
  const spec = BLOCK_SPECS[kind];
  const lines = [];
  if (spec.headerKey) lines.push(`# ${t(spec.headerKey, language)}`);
  if (spec.emptyKey) lines.push(`# ${t(spec.emptyKey, language)}`);
  for (const option of spec.options) {
    lines.push(optionLine(option, language, values));
  }
  return `${lines.join("\n")}
`;
}
function defaultAtomicBlockFence(kind, language = "en", values = {}) {
  return `\`\`\`${kind}
${defaultAtomicBlockBody(kind, language, values)}\`\`\`
`;
}

// src/core/daily-note.ts
var OBSIDIAN_DAILY_NOTE_DATE_TOKEN = "{{date:dddd, MMMM D, YYYY}}";
var DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";
var DEFAULT_DAILY_NOTE_TEMPLATE_BASENAME = "Atomic daily note.md";
function dailyNoteHeatmapActivityOption(activityTypes) {
  const ids = actionActivities([...activityTypes]).map((activity) => activity.id);
  return ids.length ? ids.join(", ") : "all";
}
function dailyNoteBookshelfActivityId(activityTypes) {
  return hobbyActivities([...activityTypes])[0]?.id ?? null;
}
function dailyNoteMarkdown(language, activityTypes, heading) {
  const sections = [`# ${heading}
`];
  const bookshelfActivity = dailyNoteBookshelfActivityId(activityTypes);
  if (bookshelfActivity) {
    sections.push(
      defaultAtomicBlockFence("atomic-bookshelf", language, {
        activity: bookshelfActivity
      })
    );
  }
  sections.push(`## ${t("template.dailyNote.trackToday", language)}
`);
  sections.push(defaultAtomicBlockFence("atomic-actions", language));
  sections.push(
    defaultAtomicBlockFence("atomic-heatmap", language, {
      activity: dailyNoteHeatmapActivityOption(activityTypes),
      rows: "2",
      columns: "2"
    })
  );
  sections.push(defaultAtomicBlockFence("atomic-today", language));
  return sections.join("\n");
}
function dailyNoteTemplateMarkdown(language, activityTypes) {
  return dailyNoteMarkdown(language, activityTypes, OBSIDIAN_DAILY_NOTE_DATE_TOKEN);
}
function todaysDailyNoteMarkdown(language, activityTypes, date) {
  const parsed = parseYmd(date);
  if (!parsed) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  return dailyNoteMarkdown(
    language,
    activityTypes,
    dailyNoteHeadingForLanguage(parsed.y, parsed.m, parsed.d, language)
  );
}
function withMarkdownExtension(path) {
  const normalized = normalizeSlashes(path.trim());
  return normalized.endsWith(".md") ? normalized : `${normalized}.md`;
}
function resolveDailyNoteTemplatePath(settings) {
  const configured = normalizeSlashes(settings.dailyNotesTemplate.trim());
  if (configured) {
    const path = withMarkdownExtension(configured);
    return joinVaultNotePath("", path);
  }
  return joinVaultNotePath(settings.templatesFolder, DEFAULT_DAILY_NOTE_TEMPLATE_BASENAME);
}
function resolveTodaysDailyNotePath(folder, stem) {
  const trimmed = normalizeSlashes(stem.trim()).replace(/\.md$/i, "");
  if (!trimmed) return null;
  return joinVaultNotePath(folder, `${trimmed}.md`);
}

// src/util/core-plugin-options.ts
function callPluginIdLookup(method, self, id) {
  if (typeof method !== "function") return void 0;
  return method.call(self, id);
}
function unwrapPluginInstance(plugin) {
  if (!isRecord(plugin)) return void 0;
  if (isRecord(plugin.instance)) return plugin.instance;
  if ("options" in plugin || typeof plugin.getFormat === "function") return plugin;
  return void 0;
}
function readInternalPluginInstance(app, id) {
  if (!isRecord(app)) return void 0;
  const internalPlugins = app.internalPlugins;
  if (!isRecord(internalPlugins)) return void 0;
  try {
    const enabled = callPluginIdLookup(
      internalPlugins.getEnabledPluginById,
      internalPlugins,
      id
    );
    const fromEnabled = unwrapPluginInstance(enabled);
    if (fromEnabled != null) return fromEnabled;
  } catch {
  }
  try {
    const plugin = callPluginIdLookup(
      internalPlugins.getPluginById,
      internalPlugins,
      id
    );
    const fromId = unwrapPluginInstance(plugin);
    if (fromId != null) return fromId;
  } catch {
  }
  if (isRecord(internalPlugins.plugins)) {
    return unwrapPluginInstance(internalPlugins.plugins[id]);
  }
  return void 0;
}
function readStringOption(options, key) {
  if (!isRecord(options)) return "";
  const value = options[key];
  return typeof value === "string" ? value.trim() : "";
}
function readDailyNotesFormat(instance, options) {
  const fromOptions = readStringOption(options, "format");
  if (fromOptions) return fromOptions;
  if (!isRecord(instance)) return DEFAULT_DAILY_NOTE_FORMAT;
  const getFormat = instance.getFormat;
  if (typeof getFormat !== "function") return DEFAULT_DAILY_NOTE_FORMAT;
  try {
    const format = getFormat.call(instance);
    return typeof format === "string" && format.trim() ? format.trim() : DEFAULT_DAILY_NOTE_FORMAT;
  } catch {
    return DEFAULT_DAILY_NOTE_FORMAT;
  }
}
function readDailyNotesCoreSettings(app) {
  const instance = readInternalPluginInstance(app, "daily-notes");
  const options = isRecord(instance) ? instance.options : void 0;
  return {
    folder: readStringOption(options, "folder"),
    format: readDailyNotesFormat(instance, options),
    template: readStringOption(options, "template")
  };
}
function readTemplatesCoreSettings(app) {
  const instance = readInternalPluginInstance(app, "templates");
  const options = isRecord(instance) ? instance.options : void 0;
  return {
    folder: readStringOption(options, "folder")
  };
}

// src/util/notice.ts
function showNotice(message) {
  const obsidian = require("obsidian");
  new obsidian.Notice(message);
}

// src/commands/create-daily-note.ts
function noticeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function requireSafeVaultNotePath(path) {
  const normalized = normalizeSlashes(path.trim());
  if (!isSafeVaultNotePath(normalized)) {
    throw new Error("Daily note path must be a safe vault-relative markdown note");
  }
  return normalized;
}
function readActiveWindowMoment() {
  const host = typeof activeWindow === "undefined" ? void 0 : activeWindow;
  const moment = host?.moment;
  return typeof moment === "function" ? moment : null;
}
function dailyNoteFilenameStem(ymd, format) {
  if (!parseYmd(ymd)) {
    throw new Error("Daily note date must be YYYY-MM-DD");
  }
  const fmt = format.trim() || DEFAULT_DAILY_NOTE_FORMAT;
  if (fmt === DEFAULT_DAILY_NOTE_FORMAT) return ymd;
  const moment = readActiveWindowMoment();
  if (!moment) {
    throw new Error("Daily note format requires moment");
  }
  const stem = String(moment(ymd, DEFAULT_DAILY_NOTE_FORMAT).format(fmt) ?? "").trim();
  if (!stem) {
    throw new Error("Daily note format produced an empty filename");
  }
  return stem.replace(/\.md$/i, "");
}
function dailyNoteTemplatePathFromApp(app) {
  const daily = readDailyNotesCoreSettings(app);
  const templates = readTemplatesCoreSettings(app);
  const path = resolveDailyNoteTemplatePath({
    dailyNotesTemplate: daily.template,
    templatesFolder: templates.folder
  });
  if (!path) {
    throw new Error("Daily note template path must be a safe vault-relative markdown note");
  }
  return path;
}
function todaysDailyNoteTargetFromApp(app, timezone, now = /* @__PURE__ */ new Date()) {
  const daily = readDailyNotesCoreSettings(app);
  const date = ymdInZone(now, timezone);
  const path = resolveTodaysDailyNotePath(daily.folder, dailyNoteFilenameStem(date, daily.format));
  if (!path) {
    throw new Error("Daily note path must be a safe vault-relative markdown note");
  }
  return { path, date };
}
async function createNoteIfMissing(data, path, content) {
  if (data.exists(path)) {
    return { path, created: false };
  }
  await data.createNote(path, content);
  return { path, created: true };
}
async function createDailyNoteTemplateFile(data, activityTypes, path, language = "en") {
  return createNoteIfMissing(
    data,
    requireSafeVaultNotePath(path),
    dailyNoteTemplateMarkdown(language, activityTypes)
  );
}
async function createTodaysDailyNoteFile(data, activityTypes, path, date, language = "en") {
  return createNoteIfMissing(
    data,
    requireSafeVaultNotePath(path),
    todaysDailyNoteMarkdown(language, activityTypes, date)
  );
}
async function createDailyNoteTemplateCommand(app, data, activityTypes, language) {
  try {
    const result = await createDailyNoteTemplateFile(
      data,
      activityTypes,
      dailyNoteTemplatePathFromApp(app),
      language
    );
    showNotice(
      result.created ? t("notice.createdDailyNoteTemplate", language, { path: result.path }) : t("notice.dailyNoteTemplateExists", language, { path: result.path })
    );
  } catch (error) {
    showNotice(
      t("notice.dailyNoteTemplateFailed", language, {
        message: noticeErrorMessage(error)
      })
    );
  }
}
async function createTodaysDailyNoteCommand(app, data, activityTypes, timezone, language) {
  try {
    const { path, date } = todaysDailyNoteTargetFromApp(app, timezone);
    const result = await createTodaysDailyNoteFile(
      data,
      activityTypes,
      path,
      date,
      language
    );
    await data.openPath(result.path);
    showNotice(
      result.created ? t("notice.createdTodaysDailyNote", language, { path: result.path }) : t("notice.todaysDailyNoteExists", language, { path: result.path })
    );
  } catch (error) {
    showNotice(
      t("notice.todaysDailyNoteFailed", language, {
        message: noticeErrorMessage(error)
      })
    );
  }
}

// src/commands/create-session.ts
var import_obsidian3 = require("obsidian");

// src/core/set-table.ts
var EMPTY_SET_ROWS = [];
var SET_TABLE_ALIGN_RE = /^:?-{1,}:?$/;
function parsePipeCells(line) {
  if (!line.trim().startsWith("|")) return [];
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}
function isSetTableHeader(cells) {
  const joined = cells.join(" ").toLowerCase();
  return joined.includes("exercise") && joined.includes("muscle");
}
function isAlignmentRow(cells) {
  return cells.length > 0 && cells.every((cell) => SET_TABLE_ALIGN_RE.test(cell));
}
function isEmptySetTableRow(cells) {
  return cells.length > 0 && cells.every((cell) => cell === "");
}
function findSetTableRange(lines) {
  let header = -1;
  let columnCount = 5;
  for (let i = 0; i < lines.length; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!isSetTableHeader(cells)) continue;
    header = i;
    columnCount = cells.length;
    break;
  }
  if (header < 0) return null;
  let firstData = header + 1;
  while (firstData < lines.length && isAlignmentRow(parsePipeCells(lines[firstData] ?? ""))) {
    firstData += 1;
  }
  let end = firstData - 1;
  for (let i = firstData; i < lines.length; i += 1) {
    if (!String(lines[i] ?? "").trim().startsWith("|")) break;
    end = i;
  }
  return { header, firstData, end, columnCount };
}
function parseSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return [];
  const rows = [];
  for (let i = table.firstData; i <= table.end; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!cells.length || isAlignmentRow(cells)) continue;
    rows.push({
      exercise: cells[0] || "",
      muscle: cells[1] || "",
      weight: cells[2] || "",
      reps: cells[3] || "",
      notes: cells[4] || ""
    });
  }
  return rows;
}

// src/core.ts
var LB_TO_KG = 0.45359237;
var MUSCLES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core"
];
var GYM_LOCATIONS = ["Home", "Commercial", "Hotel/Travel", "Other"];
var GOLF_LOCATIONS = ["Home net", "Driving range", "Course", "Other"];
var FELT = ["good", "ok", "bad"];
function isLoadedWeight(weight) {
  if (weight === null || weight === void 0) return false;
  const s = String(weight).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === "bw" || s === "\u2014" || s === "-" || lower === "n/a") return false;
  return !Number.isNaN(Number(s));
}
function toKg(weight, unit) {
  const n = Number(weight);
  if (Number.isNaN(n)) return 0;
  return unit === "lb" ? n * LB_TO_KG : n;
}
function rowVolumeKg(row, unit = "kg") {
  if (!isLoadedWeight(row.weight)) return 0;
  const reps = Number(row.reps);
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  return toKg(row.weight, unit) * reps;
}
function durationToLevel(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 30) return 1;
  if (n < 60) return 2;
  if (n < 90) return 3;
  return 4;
}

// src/core/reading-status.ts
var READING_STATUSES = [
  "to-read",
  "reading",
  "to-read-again",
  "finished"
];
var DEFAULT_READING_STATUS = "to-read";
var STATUS_ORDER = /* @__PURE__ */ new Map([
  ["reading", 0],
  ["to-read", 1],
  ["to-read-again", 2],
  ["finished", 3]
]);
function isInProgressStatus(status) {
  return String(status ?? "").trim().toLowerCase() === "reading";
}
function statusRank(status) {
  return STATUS_ORDER.get(status) ?? 99;
}
function isReadingItemFrontmatter(frontmatter) {
  if (!frontmatter) return false;
  const type = String(frontmatter.type ?? "").trim();
  const activity = String(frontmatter.activity ?? "").trim();
  return type === "atomic-item" && activity === "reading";
}
function readingStatusLabelKey(status) {
  switch (status) {
    case "to-read":
      return "reading.status.toRead";
    case "reading":
      return "reading.status.reading";
    case "to-read-again":
      return "reading.status.toReadAgain";
    case "finished":
      return "reading.status.finished";
    default:
      return status;
  }
}
var KNOWN_STATUSES = new Map(
  READING_STATUSES.map((status) => [status.toLowerCase(), status])
);
function parseStatusTokens(statusOption) {
  if (statusOption == null) return ["all"];
  return statusOption.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
}
function resolveBookShelfStatuses(statusOption) {
  const tokens = parseStatusTokens(statusOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { statuses: null, invalidStatuses: [] };
  }
  const statuses = [];
  const invalidStatuses = [];
  const seen = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const canonical = KNOWN_STATUSES.get(key);
    if (!canonical) {
      invalidStatuses.push(token);
      continue;
    }
    statuses.push(canonical);
  }
  return {
    statuses: statuses.length > 0 ? statuses : null,
    invalidStatuses
  };
}
function matchesBookShelfStatus(itemStatus, statuses) {
  if (!statuses) return true;
  return statuses.includes(itemStatus);
}

// src/core/property-options.ts
var CUSTOM_LOCATION_SENTINEL = "__atomic_custom_location__";
function resolveGymCreateLocation(selected, customPromptRaw) {
  if (selected !== CUSTOM_LOCATION_SENTINEL) {
    return { location: selected, wasCustom: false, emptyCustomNotice: false };
  }
  if (customPromptRaw === null || customPromptRaw === void 0) {
    return { location: "", wasCustom: false, emptyCustomNotice: false };
  }
  const trimmed = customPromptRaw.trim();
  if (!trimmed) {
    return { location: "", wasCustom: false, emptyCustomNotice: true };
  }
  return { location: trimmed, wasCustom: true, emptyCustomNotice: false };
}
function gymCreateLocationNeedsDetail(location, wasCustom) {
  return location === "Other" && !wasCustom;
}
var WEIGHT_UNITS = ["kg", "lb"];
function sessionActivity(frontmatter) {
  return String(frontmatter?.activity ?? "").trim().toLowerCase();
}
function isSession(frontmatter) {
  return String(frontmatter?.type ?? "").trim() === "session";
}
function isGolfSession(context) {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "golf";
}
function isGymSession(context) {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "gym";
}
function gymLocationLabelKey(value) {
  switch (value) {
    case "Home":
      return "location.home";
    case "Commercial":
      return "location.commercial";
    case "Hotel/Travel":
      return "location.hotelTravel";
    case "Other":
      return "location.other";
    default:
      return value;
  }
}
function golfLocationLabelKey(value) {
  switch (value) {
    case "Home net":
      return "property.golfLocation.homeNet";
    case "Driving range":
      return "property.golfLocation.drivingRange";
    case "Course":
      return "property.golfLocation.course";
    case "Other":
      return "property.golfLocation.other";
    default:
      return value;
  }
}
function feltLabelKey(value) {
  switch (value) {
    case "good":
      return "property.felt.good";
    case "ok":
      return "property.felt.ok";
    case "bad":
      return "property.felt.bad";
    default:
      return value;
  }
}
function weightUnitLabelKey(value) {
  switch (value) {
    case "kg":
      return "property.weightUnit.kg";
    case "lb":
      return "property.weightUnit.lb";
    default:
      return value;
  }
}
var PROPERTY_OPTION_SPECS = [
  {
    property: "status",
    values: READING_STATUSES,
    matches: (context) => isReadingItemFrontmatter(context.frontmatter),
    labelKey: readingStatusLabelKey
  },
  {
    property: "felt",
    values: FELT,
    matches: isGolfSession,
    labelKey: feltLabelKey
  },
  {
    property: "location",
    values: GOLF_LOCATIONS,
    matches: isGolfSession,
    labelKey: golfLocationLabelKey,
    allowCustom: true
  },
  {
    property: "location",
    values: GYM_LOCATIONS,
    matches: isGymSession,
    labelKey: gymLocationLabelKey,
    allowCustom: true
  },
  {
    property: "weight_unit",
    values: WEIGHT_UNITS,
    matches: isGymSession,
    labelKey: weightUnitLabelKey
  }
];
var DROPDOWN_PROPERTY_NAMES = [
  ...new Set(PROPERTY_OPTION_SPECS.map((spec) => spec.property))
];
function resolvePropertyOptions(property, context) {
  return PROPERTY_OPTION_SPECS.find(
    (spec) => spec.property === property && spec.matches(context)
  ) ?? null;
}

// src/util/bilingual-label.ts
var LEADING_EMOJI = /^(\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)\s+/u;
function splitCatalogLabel(text) {
  const match = /^([^/]+?) \/ ([^/]+)$/u.exec(text);
  if (!match) return { primary: text, secondary: null };
  const secondary = match[2];
  if (!secondary || !/\p{Script=Han}/u.test(secondary)) {
    return { primary: text, secondary: null };
  }
  return { primary: match[1] ?? text, secondary };
}
function ledgerActivityName(text) {
  const { primary, secondary } = splitCatalogLabel(text);
  const stripped = primary.replace(LEADING_EMOJI, "").trim();
  const zh = secondary?.trim() ?? "";
  return { name: stripped || primary.trim(), zh: zh || null };
}
function labelForLanguage(text, language) {
  const { primary, secondary } = splitCatalogLabel(text);
  if (!secondary) return text;
  if (!language.startsWith("zh")) return primary.trim();
  const emoji = LEADING_EMOJI.exec(primary)?.[1] ?? "";
  const chinese = secondary.trim();
  return emoji ? `${emoji} ${chinese}` : chinese;
}
function applyLabelEdit(stored, edited, language) {
  const next = edited.trim();
  if (!next) return stored;
  const { primary, secondary } = splitCatalogLabel(stored);
  if (!secondary) return next;
  const emoji = LEADING_EMOJI.exec(primary)?.[1] ?? "";
  const english = primary.replace(LEADING_EMOJI, "").trim();
  const prefix = emoji ? `${emoji} ` : "";
  if (language.startsWith("zh")) {
    if (!/\p{Script=Han}/u.test(next)) return next;
    const chinese = next.replace(LEADING_EMOJI, "").trim();
    return `${prefix}${english} / ${chinese}`;
  }
  const englishNext = next.replace(LEADING_EMOJI, "").trim();
  if (!englishNext) return stored;
  return `${prefix}${englishNext} / ${secondary.trim()}`;
}

// src/util/yaml.ts
function yamlScalar(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

// src/core/session-note.ts
function sessionHeading(activity, date, language) {
  return `# ${labelForLanguage(activity.label, language)} \u2014 ${date}`;
}
function gymBody(activity, date, location, locationDetail, weightUnit, language) {
  const muscleHints = MUSCLES.map((muscle) => t(`muscle.${muscle}`, language));
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

${sessionHeading(activity, date, language)}

<!-- \u{1F4AA} ${t("template.gymMuscles", language)}: ${muscleHints.join(", ")} -->

${defaultAtomicBlockFence("atomic-timer", language)}
${defaultAtomicBlockFence("atomic-gym-log", language)}
| ${t("template.gymTable.exercise", language)} | ${t("template.gymTable.muscle", language)} | ${t("template.gymTable.weight", language)} | ${t("template.gymTable.reps", language)} | ${t("template.gymTable.notes", language)} |
| --- | --- | --- | --- | --- |
${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}
function golfBody(activity, date, language) {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location:
focus: []
club: []
felt:
---

${sessionHeading(activity, date, language)}

<!-- ${t("template.golfLocationHint", language)} -->
<!-- ${t("template.golfFocusHint", language)} -->
<!-- ${t("template.golfClubHint", language)} -->
<!-- ${t("template.golfFeltHint", language)} -->

${defaultAtomicBlockFence("atomic-timer", language)}${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}
function genericExerciseBody(activity, date, language) {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location:
---

${sessionHeading(activity, date, language)}

${defaultAtomicBlockFence("atomic-timer", language)}${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}

// src/util/prompt-text.ts
var import_obsidian = require("obsidian");
function promptText(app, title, defaultValue, language) {
  return new Promise((resolve) => {
    const modal = new class extends import_obsidian.Modal {
      constructor() {
        super(...arguments);
        this.value = defaultValue;
        this.resolved = false;
      }
      onOpen() {
        this.modalEl.setAttr("data-testid", "atomic-prompt-modal");
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: title });
        new import_obsidian.Setting(contentEl).addText((text) => {
          text.setValue(defaultValue);
          text.inputEl.setCssStyles({ width: "100%" });
          text.onChange((v) => {
            this.value = v;
          });
          text.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.finish(this.value);
            }
          });
          window.setTimeout(() => text.inputEl.focus(), 20);
        });
        new import_obsidian.Setting(contentEl).addButton(
          (btn) => btn.setButtonText(t("modal.cancel", language)).onClick(() => this.finish(null))
        ).addButton(
          (btn) => btn.setButtonText(t("modal.ok", language)).setCta().onClick(() => this.finish(this.value))
        );
      }
      finish(v) {
        if (this.resolved) return;
        this.resolved = true;
        this.close();
        resolve(v);
      }
      onClose() {
        if (!this.resolved) {
          this.resolved = true;
          resolve(null);
        }
      }
    }(app);
    modal.open();
  });
}

// src/util/suggest-item.ts
var import_obsidian2 = require("obsidian");
function suggestItem(app, placeholder, items, getItemText) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new class extends import_obsidian2.FuzzySuggestModal {
      getItems() {
        return items;
      }
      getItemText(item) {
        return getItemText(item);
      }
      onChooseItem(item) {
        if (settled) return;
        settled = true;
        resolve(item);
      }
      onClose() {
        if (settled) return;
        settled = true;
        resolve(null);
      }
    }(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}

// src/commands/create-session.ts
function suggestOne(app, placeholder, items, labels) {
  return suggestItem(app, placeholder, items, (item) => {
    const index = items.indexOf(item);
    return labels && labels[index] ? labels[index] : item;
  });
}
async function promptSessionDate(app, timezone, language) {
  const today = ymdInZone(/* @__PURE__ */ new Date(), timezone);
  const dateRaw = await promptText(app, t("modal.dateTitle", language), today, language);
  if (dateRaw === null) return null;
  const date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new import_obsidian3.Notice(t("notice.invalidDate", language));
    return null;
  }
  return date;
}
async function gymSessionBody(app, activity, date, language) {
  const locationItems = [...GYM_LOCATIONS, CUSTOM_LOCATION_SENTINEL];
  const locationLabels = [
    t("location.home", language),
    t("location.commercial", language),
    t("location.hotelTravel", language),
    t("location.other", language),
    t("property.location.custom", language)
  ];
  const selected = await suggestOne(
    app,
    t("modal.locationPlaceholder", language),
    locationItems,
    locationLabels
  ) || "";
  let customPromptRaw;
  if (selected === CUSTOM_LOCATION_SENTINEL) {
    customPromptRaw = await promptText(
      app,
      t("modal.customLocation", language),
      "",
      language
    );
  }
  const { location, wasCustom, emptyCustomNotice } = resolveGymCreateLocation(
    selected,
    customPromptRaw
  );
  if (emptyCustomNotice) {
    new import_obsidian3.Notice(t("notice.emptyCustomLocation", language));
  }
  let locationDetail = "";
  if (gymCreateLocationNeedsDetail(location, wasCustom)) {
    locationDetail = await promptText(
      app,
      t("modal.otherLocationDetail", language),
      "",
      language
    ) || "";
  }
  let weightUnit = await suggestOne(app, t("modal.weightUnitPlaceholder", language), [
    "kg",
    "lb"
  ]) || "kg";
  if (weightUnit !== "lb") weightUnit = "kg";
  return gymBody(activity, date, location, locationDetail, weightUnit, language);
}
async function createActivitySession(app, data, activity, timezone, language) {
  const date = await promptSessionDate(app, timezone, language);
  if (!date) return;
  const year = date.slice(0, 4);
  const folder = `${activity.folder}/${year}`;
  const target = `${folder}/${date}.md`;
  if (data.exists(target)) {
    await data.openPath(target);
    new import_obsidian3.Notice(
      t("notice.openedExistingSession", language, {
        activity: labelForLanguage(activity.label, language),
        path: target
      })
    );
    return;
  }
  const body = activity.supportsSetTable ? await gymSessionBody(app, activity, date, language) : activity.id === "golf" ? golfBody(activity, date, language) : genericExerciseBody(activity, date, language);
  await data.createNote(target, body);
  await data.openPath(target);
  new import_obsidian3.Notice(
    t("notice.createdSession", language, {
      activity: labelForLanguage(activity.label, language),
      path: target
    })
  );
}

// src/commands/hobby-item.ts
var FALLBACK_BOOK_TITLE = "Untitled Book";
function cleanBookTitle(title) {
  const cleaned = String(title || "").replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ").replace(/\.+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_BOOK_TITLE;
}
function buildHobbyItemPath(activityFolder, title) {
  if (!isSafeVaultFolder(activityFolder)) {
    throw new Error("Hobby folder must be a safe vault-relative folder");
  }
  const base = normalizeSlashes(activityFolder.trim()).replace(/\/$/, "");
  return `${base}/Items/${cleanBookTitle(title)}.md`;
}
function readingItemMarkdown(title, language = "en", activityId = "reading") {
  const cleanedTitle = cleanBookTitle(title);
  const activity = activityId.trim() || "reading";
  return `---
type: atomic-item
domain: hobby
activity: ${activity}
status: ${DEFAULT_READING_STATUS}
authors:
  - ""
description: ""
pages:
cover: ""
tags:
  - books
spine_color:
total_min: 0
timer_started_at:
related_canvas:
---

# ${cleanedTitle}

## ${t("template.readingRemarks", language)}

## ${t("template.readingTimeLog", language)}

${defaultAtomicBlockFence("atomic-timer", language)}`;
}

// src/commands/create-reading-item.ts
var HOBBY_COPY = {
  titleKey: "modal.hobbyItemTitle",
  openedKey: "notice.openedExistingHobbyItem",
  createdKey: "notice.createdHobbyItem",
  failedKey: "notice.hobbyItemFailed"
};
var READING_COPY = {
  titleKey: "modal.readingItemTitle",
  openedKey: "notice.openedExistingReadingItem",
  createdKey: "notice.createdReadingItem",
  failedKey: "notice.readingItemFailed"
};
async function createItemNote(app, data, activity, language, copy) {
  const title = await promptText(
    app,
    t(copy.titleKey, language, { label: labelForLanguage(activity.label, language) }),
    "",
    language
  );
  if (title === null) return;
  const path = buildHobbyItemPath(activity.folder, title);
  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
        t(copy.openedKey, language, {
          label: labelForLanguage(activity.label, language),
          path
        })
      );
      return;
    }
    await data.createNote(
      path,
      readingItemMarkdown(title, language, activity.id)
    );
    await data.openPath(path);
    showNotice(
      t(copy.createdKey, language, {
        label: labelForLanguage(activity.label, language),
        path
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t(copy.failedKey, language, { message }));
  }
}
async function createHobbyItem(app, data, hobbyActivity, language) {
  await createItemNote(app, data, hobbyActivity, language, HOBBY_COPY);
}
async function createReadingItem(app, data, readingActivity, language) {
  await createItemNote(app, data, readingActivity, language, READING_COPY);
}

// src/codeblocks.ts
var import_obsidian9 = require("obsidian");

// src/util/parse-block.ts
function parseBlockOptions(source) {
  const out = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/\s+#.*$/, "").trim();
    out[m[1]] = value.replace(/^["']|["']$/g, "");
  }
  return out;
}

// src/util/block-render.ts
var ATOMIC_BLOCK_HOST_CLASS = "atomic-block-host";
var ATOMIC_BLOCK_PENDING_CLASS = "fitness-plugin atomic-block-pending";
var ATOMIC_BLOCK_PENDING_BAR_CLASS = "atomic-block-pending-bar";
var generations = /* @__PURE__ */ new WeakMap();
var chains = /* @__PURE__ */ new WeakMap();
function markAtomicBlockHost(el) {
  if (typeof el.addClass === "function") {
    el.addClass(ATOMIC_BLOCK_HOST_CLASS);
    return;
  }
  el.classList?.add(ATOMIC_BLOCK_HOST_CLASS);
}
function mountAtomicBlockShell(el) {
  el.empty();
  markAtomicBlockHost(el);
  const root = el.createDiv({ cls: ATOMIC_BLOCK_PENDING_CLASS });
  root.createDiv({ cls: ATOMIC_BLOCK_PENDING_BAR_CLASS });
  return root;
}
function beginBlockRender(el) {
  const next = (generations.get(el) ?? 0) + 1;
  generations.set(el, next);
  return next;
}
function isStaleBlockRender(el, generation) {
  return generations.get(el) !== generation;
}
function shouldCommitBlockPaint(el, generation) {
  return generation === void 0 || !isStaleBlockRender(el, generation);
}
function currentBlockGeneration(el) {
  return generations.get(el) ?? 0;
}
function invalidateBlockRenderIfCurrent(el, generation) {
  if (!isStaleBlockRender(el, generation)) {
    beginBlockRender(el);
  }
}
function enqueueBlockRender(el, work) {
  const generation = beginBlockRender(el);
  const previous = chains.get(el) ?? Promise.resolve();
  const next = previous.then(
    () => work(generation),
    () => work(generation)
  );
  chains.set(el, next);
  return next;
}

// src/util/session-embed.ts
var EMBED_SLOT = ".cm-embed-block, .cm-preview-code-block, .internal-embed, .el-pre, .codeblock, [class*='code-block']";
var NOTE_COLUMN = ".cm-sizer, .markdown-preview-sizer";
function slotClass(kind) {
  return kind === "timer" ? "atomic-embed-slot-timer" : "atomic-embed-slot-gym";
}
function rowSlot(chosen) {
  const parent = chosen.parentElement;
  if (parent?.classList.contains("cm-line")) return parent;
  return chosen;
}
function sessionEmbedSlot(start) {
  const wrapper = start.closest(EMBED_SLOT);
  return wrapper ? rowSlot(wrapper) : null;
}
function isEmptyGap(node) {
  if ((node.textContent ?? "").trim() !== "") return false;
  return !node.classList.contains("atomic-embed-slot") && !node.classList.contains("cm-embed-block");
}
function pairSessionSlots(slot) {
  const parent = slot.parentElement;
  if (!parent) return;
  const kids = Array.from(parent.children);
  const timer = kids.find((el) => el.classList.contains("atomic-embed-slot-timer"));
  const gym = kids.find((el) => el.classList.contains("atomic-embed-slot-gym"));
  if (!timer || !gym) return;
  const start = Math.min(kids.indexOf(timer), kids.indexOf(gym));
  const end = Math.max(kids.indexOf(timer), kids.indexOf(gym));
  for (let index = start + 1; index < end; index += 1) {
    const between = kids[index];
    if (between && !isEmptyGap(between)) return;
  }
  parent.classList.add("atomic-note-paired");
  for (let index = start + 1; index < end; index += 1) {
    const between = kids[index];
    if (between && (between.textContent ?? "").trim() === "") {
      between.classList.add("atomic-embed-gap");
    }
  }
}
function markSessionEmbed(start, kind) {
  start.classList.add("atomic-embed-stretch");
  if (kind === "timer") start.classList.add("atomic-timer-host");
  if (kind === "gym-log") start.classList.add("atomic-gym-log-host");
  const slot = sessionEmbedSlot(start);
  if (!slot) return;
  slot.classList.add("atomic-embed-slot", slotClass(kind));
  slot.closest(NOTE_COLUMN)?.classList.add("atomic-note-column");
  pairSessionSlots(slot);
}

// src/views/actions.ts
function renderActions(el, plugin) {
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-actions fitness-actions",
    attr: { "data-testid": "atomic-actions" }
  });
  for (const activity of actionActivities(plugin.settings.activityTypes)) {
    const button = root.createEl("button", { cls: "atomic-btn", attr: { type: "button" } });
    const dot = button.createSpan({ cls: "atomic-dot" });
    dot.setCssProps({ "--atomic-c": activity.colors[2] });
    button.createSpan({ text: labelForLanguage(activity.label, plugin.settings.language) });
    button.addEventListener("click", () => {
      if (activity.domain === "hobby" && activity.noteModel === "item") {
        void plugin.createHobbyItem(activity);
        return;
      }
      void plugin.createExerciseSession(activity);
    });
  }
}

// src/views/cue-log.ts
var import_obsidian5 = require("obsidian");

// src/util/markdown.ts
function ensureTrailingNewline(markdown) {
  const source = String(markdown || "");
  return source.endsWith("\n") ? source : `${source}
`;
}

// src/core/cues.ts
var REMINDERS_HEADING = /^(#{1,6})\s+(?:\S+\s+)?(?:Reminders(?:\s*\/\s*.+)?|提醒)\s*$/i;
var HEADING = /^(#{1,6})\s+/;
var BULLET = /^\s*[-*+]\s+(.+)$/;
var EMPTY_BULLET = /^\s*[-*+]\s*$/;
var FENCE = /^\s*(`{3,}|~{3,})/;
var TOP_BULLET = /^ {0,1}[-*+](?:\s+(.*))?$/;
var CONTINUATION_INDENT = /^(?: {2}|\t)/;
var FENCE_PREFIX = /^[`~]{3,}\s*/;
var LEADING_BLOCK = /^(?:[-*+](?:\s+|$)|>\s*|#{1,6}(?:\s+|$))/;
var NEW_SECTION_LEVEL = "##";
function fencedLines(lines) {
  const fenced = [];
  let openedWith = null;
  for (const line of lines) {
    const delimiter = line.match(FENCE)?.[1];
    if (openedWith === null) {
      fenced.push(delimiter !== void 0);
      if (delimiter !== void 0) openedWith = delimiter;
      continue;
    }
    fenced.push(true);
    const closes = delimiter !== void 0 && delimiter[0] === openedWith[0] && delimiter.length >= openedWith.length;
    if (closes) openedWith = null;
  }
  return fenced;
}
function remindersSection(lines, fenced) {
  let headingIndex = -1;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index] || CONTINUATION_INDENT.test(lines[index])) continue;
    const match = lines[index].trim().match(REMINDERS_HEADING);
    if (!match) continue;
    headingIndex = index;
    level = match[1].length;
    break;
  }
  if (headingIndex === -1) return null;
  let end = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (fenced[index] || CONTINUATION_INDENT.test(lines[index])) continue;
    const heading = lines[index].trim().match(HEADING);
    if (heading && heading[1].length <= level) {
      end = index;
      break;
    }
  }
  return { headingIndex, bodyStart: headingIndex + 1, end };
}
function normalizeCue(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
function sameCueCard(left, right) {
  return left.key === right.key && left.text === right.text && left.focus === right.focus && left.count === right.count && left.lastSeen === right.lastSeen;
}
function cueTextNeedsMarkdown(text) {
  return /[*_`#[\]!<>~|]|(?:^|\n)\s*(?:\d+\.|[-+])\s|https?:\/\//.test(text);
}
function parseReminders(markdown) {
  const lines = markdown.split(/\r?\n/);
  const fenced = fencedLines(lines);
  const section = remindersSection(lines, fenced);
  if (!section) return [];
  const cues = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    while (current.length && !current[current.length - 1].trim()) current.pop();
    while (current.length && !current[0].trim()) current.shift();
    if (current.length) cues.push(current.join("\n"));
    current = null;
  };
  for (let index = section.bodyStart; index < section.end; index += 1) {
    if (fenced[index]) {
      flush();
      continue;
    }
    const line = lines[index];
    const top = line.match(TOP_BULLET);
    if (top && !CONTINUATION_INDENT.test(line)) {
      flush();
      const body = (top[1] ?? "").trimEnd();
      current = body.trim() ? [body] : null;
      continue;
    }
    if (!current) continue;
    current.push(line.replace(CONTINUATION_INDENT, ""));
  }
  flush();
  return cues;
}
function stripFencePrefix(line) {
  return line.replace(FENCE_PREFIX, "");
}
function stripLeadingBlocks(line) {
  let stripped = stripFencePrefix(line).trim();
  let previous = "";
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripFencePrefix(stripped.replace(LEADING_BLOCK, "")).trim();
  }
  return stripped;
}
function sanitizeCueText(text) {
  const lines = trimBlankEdges(
    text.replace(/\r\n/g, "\n").replace(/[\u2028\u2029]/g, "\n").split("\n")
  );
  while (lines.length) {
    const first = stripLeadingBlocks(lines[0]);
    if (first) {
      lines[0] = first;
      break;
    }
    lines.shift();
  }
  if (!lines.length) return "";
  const cleaned = [
    lines[0],
    ...lines.slice(1).map(
      (line) => stripFencePrefix(line.trimEnd()).replace(/^\s+/, "")
    )
  ];
  const collapsed = [];
  for (const line of trimBlankEdges(cleaned)) {
    if (!line && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(line);
  }
  return collapsed.join("\n");
}
function formatCueBullet(text) {
  const lines = text.split("\n");
  const first = lines[0] ?? "";
  if (lines.length <= 1) return `- ${first}`;
  return [
    `- ${first}`,
    ...lines.slice(1).map((line) => line.length ? `  ${line}` : "  ")
  ].join("\n");
}
function appendCueBullet(markdown, cue, headingLabel) {
  const text = sanitizeCueText(cue);
  if (!text) return ensureTrailingNewline(markdown);
  const bullet = formatCueBullet(text);
  const lines = markdown.split(/\r?\n/);
  const section = remindersSection(lines, fencedLines(lines));
  if (!section) {
    const base = trimBlankEdges(lines).join("\n");
    const heading = `${NEW_SECTION_LEVEL} ${headingLabel}`;
    return `${base}${base ? "\n\n" : ""}${heading}

${bullet}
`;
  }
  const body = trimBlankEdges(lines.slice(section.bodyStart, section.end));
  const kept = body.length === 1 && EMPTY_BULLET.test(body[0]) ? [] : body;
  const last = kept[kept.length - 1];
  const separator = last !== void 0 && !BULLET.test(last) ? [""] : [];
  return ensureTrailingNewline(
    [
      ...lines.slice(0, section.bodyStart),
      "",
      ...kept,
      ...separator,
      bullet,
      "",
      ...lines.slice(section.end)
    ].join("\n")
  );
}
function buildCueCards(cues, year) {
  const prefix = `${year}-`;
  const byKey = /* @__PURE__ */ new Map();
  const lastIndex = /* @__PURE__ */ new Map();
  const ordered = cues.filter((cue) => cue.date.startsWith(prefix)).slice().sort((a, b) => a.date.localeCompare(b.date));
  ordered.forEach((cue, index) => {
    const key = normalizeCue(cue.text);
    if (!key) return;
    const card = byKey.get(key) ?? { key, text: "", focus: "", count: 0, lastSeen: "" };
    card.count += 1;
    card.text = cue.text.trim();
    card.focus = cue.focus || card.focus;
    card.lastSeen = cue.date;
    byKey.set(key, card);
    lastIndex.set(key, index);
  });
  return [...byKey.values()].sort(
    (a, b) => b.lastSeen.localeCompare(a.lastSeen) || (lastIndex.get(a.key) ?? 0) - (lastIndex.get(b.key) ?? 0)
  );
}
function trimBlankEdges(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  return lines.slice(start, end);
}

// src/util/paint-memo.ts
var PaintMemo = class {
  // Explicit fields on purpose: Node's --experimental-strip-types (the unit
  // test runner) rejects TypeScript parameter properties.
  constructor(paintedSelector, same) {
    this.states = /* @__PURE__ */ new WeakMap();
    this.paintedSelector = paintedSelector;
    this.same = same;
  }
  isPainted(el) {
    return !!el.querySelector(this.paintedSelector);
  }
  /**
   * True when `el` still shows a paint built from a state equivalent to
   * `next`. Otherwise records `next` as the state about to be painted.
   */
  shouldSkip(el, next) {
    if (this.isPainted(el) && this.same(this.states.get(el), next)) return true;
    this.states.set(el, next);
    return false;
  }
};
function sameList(left, right, same = (a, b) => a === b) {
  if (left === right) return true;
  if (left == null || right == null) return false;
  return left.length === right.length && left.every((item, i) => same(item, right[i]));
}

// src/views/cue-card.ts
var import_obsidian4 = require("obsidian");

// src/util/cue-card-fan.ts
var CUE_CARD_INTERACTIVE_SELECTOR = [
  "a[href]",
  "a.internal-link",
  "a.external-link",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "label",
  "[contenteditable='true']",
  "[role='link']",
  "[role='button']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='textbox']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");
function isCueCardToggleKey(key) {
  return key === "Enter" || key === " ";
}
function isCueLightboxDismissKey(key) {
  return key === "Escape";
}
var CUE_CARD_FLY_INSET_PX = 48;
var CUE_CARD_FAN_WIDTH_PX = 228;
var CUE_CARD_FLY_MAX_SCALE = 1.65;
function cueCardFlyScale(card, view) {
  const maxWidth = Math.max(1, view.innerWidth - CUE_CARD_FLY_INSET_PX);
  const width = Math.max(1, card.width);
  return Math.min(CUE_CARD_FLY_MAX_SCALE, maxWidth / width);
}
function cueLightboxLayoutWidth(contentWidth, view, scale, minWidth = CUE_CARD_FAN_WIDTH_PX) {
  const visualMax = Math.max(1, view.innerWidth - CUE_CARD_FLY_INSET_PX);
  const safeScale = Math.max(0.01, scale);
  const maxLayout = visualMax / safeScale;
  const floor = Math.min(Math.max(1, minWidth), maxLayout);
  const wanted = Number.isFinite(contentWidth) && contentWidth > 0 ? contentWidth : floor;
  return Math.min(maxLayout, Math.max(floor, wanted));
}
function isCueCardEventTarget(node) {
  return !!node && typeof node === "object";
}
function eventElement(target) {
  let node = target;
  while (isCueCardEventTarget(node)) {
    if (typeof node.closest === "function") return node;
    node = node.parentElement ?? null;
  }
  return null;
}
function cueCardEventFromInteractive(target, card) {
  const el = eventElement(target);
  if (!el?.closest) return false;
  const interactive = el.closest(CUE_CARD_INTERACTIVE_SELECTOR);
  return interactive != null && interactive !== card;
}
function cueCardEventShouldToggle(target, card) {
  return !cueCardEventFromInteractive(target, card);
}

// src/views/cue-lightbox.ts
var LIGHTBOX_LABEL_ID = "atomic-cue-lightbox-label";
var session = null;
function cueLightboxIsOpen(source) {
  if (!session) return false;
  return source ? session.source === source : true;
}
function closeCueLightbox(restoreFocus = false) {
  const current = session;
  if (!current) return;
  session = null;
  current.view.removeEventListener("keydown", current.onKey, true);
  current.source.removeClass("is-flying");
  current.source.setAttr("aria-expanded", "false");
  current.overlay.detach();
  if (restoreFocus && current.source.isConnected) current.source.focus();
}
function toggleCueLightbox(source) {
  if (cueLightboxIsOpen(source)) {
    closeCueLightbox(true);
    return;
  }
  openCueLightbox(source);
}
function openCueLightbox(source) {
  closeCueLightbox();
  const doc = source.ownerDocument;
  const view = doc.defaultView;
  if (!view) return;
  const originEl = source.querySelector(".atomic-cue-sheet") ?? source;
  const origin = originEl.getBoundingClientRect();
  source.addClass("is-flying");
  const overlay = source.createDiv({
    cls: "fitness-plugin atomic-cues atomic-cue-lightbox",
    attr: {
      "data-testid": "atomic-cue-lightbox"
    }
  });
  overlay.createDiv({
    cls: "atomic-cue-lightbox-backdrop",
    attr: { "data-testid": "atomic-cue-lightbox-backdrop" }
  });
  const card = overlay.createDiv({
    cls: "atomic-cue-card atomic-cue-lightbox-card",
    attr: {
      "data-testid": "atomic-cue-lightbox-card",
      role: "dialog",
      tabindex: "0",
      "aria-labelledby": LIGHTBOX_LABEL_ID
    }
  });
  copyCuePaperVars(source, overlay, card);
  paintLightboxSheet(source, card);
  card.style.setProperty("--atomic-cue-origin-left", `${origin.left}px`);
  card.style.setProperty("--atomic-cue-origin-top", `${origin.top}px`);
  overlay.style.setProperty("--atomic-cue-fly-inset", `${CUE_CARD_FLY_INSET_PX}px`);
  overlay.detach();
  doc.body.appendChild(overlay);
  sizeLightboxCard(card, origin, view);
  const onKey = (event) => {
    if (!isCueLightboxDismissKey(event.key)) return;
    event.preventDefault();
    closeCueLightbox(true);
  };
  view.addEventListener("keydown", onKey, true);
  overlay.addEventListener("click", (event) => {
    if (!cueCardEventShouldToggle(event.target, card)) return;
    closeCueLightbox(true);
  });
  card.addEventListener("keydown", (event) => {
    if (!isCueCardToggleKey(event.key)) return;
    if (!cueCardEventShouldToggle(event.target, card)) return;
    event.preventDefault();
    closeCueLightbox(true);
  });
  source.setAttr("aria-expanded", "true");
  session = { source, overlay, card, view, onKey };
  appendCueLightboxReadout(source, overlay);
  const place = () => {
    overlay.addClass("is-placed");
    overlay.addClass("is-settled");
    card.focus();
  };
  if (prefersReducedMotion(view)) {
    place();
    return;
  }
  view.requestAnimationFrame(() => {
    view.requestAnimationFrame(place);
  });
}
function appendCueLightboxReadout(source, overlay) {
  const root = source.closest(".atomic-cues");
  const activity = root?.getAttribute("data-activity-label") || root?.getAttribute("data-activity") || "";
  const meta = source.querySelector(".atomic-cue-meta")?.textContent?.trim() || "";
  const repeats = source.querySelector(".atomic-cue-repeats")?.textContent?.trim() || "";
  const parts = [activity, meta, repeats].filter((part) => part.length > 0);
  const readout = overlay.createDiv({ cls: "atomic-glass atomic-cue-lightbox-readout" });
  readout.createSpan({ cls: "atomic-readout", text: parts.join(" \xB7 ") });
  const hint = readout.createSpan({ cls: "atomic-readout is-hint" });
  hint.createEl("kbd", { text: "esc" });
}
function prefersReducedMotion(view) {
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function copyCuePaperVars(source, overlay, card) {
  const view = source.ownerDocument.defaultView;
  if (!view) return;
  const sourceStyle = view.getComputedStyle(source);
  const tint = sourceStyle.getPropertyValue("--atomic-cue-tint").trim();
  if (tint) card.style.setProperty("--atomic-cue-tint", tint);
  const color = sourceStyle.getPropertyValue("--atomic-c").trim();
  if (color) card.style.setProperty("--atomic-c", color);
  const root = source.closest(".atomic-cues");
  if (!root) return;
  const accent = view.getComputedStyle(root).getPropertyValue("--atomic-cue-accent").trim();
  if (accent) overlay.style.setProperty("--atomic-cue-accent", accent);
}
function paintLightboxSheet(source, card) {
  const sourceSheet = source.querySelector(".atomic-cue-sheet");
  if (!sourceSheet) return;
  card.appendChild(sourceSheet.cloneNode(true));
  const dest = cueLightboxHtmlElement(card.querySelector(".atomic-cue-text"));
  if (dest) dest.id = LIGHTBOX_LABEL_ID;
  const body = cueLightboxHtmlElement(card.querySelector(".atomic-cue-body"));
  if (body) body.addClass("atomic-scrollport");
}
function sizeLightboxCard(card, origin, view) {
  const scale = cueCardFlyScale({ width: origin.width }, view);
  card.style.setProperty("--atomic-cue-fly-scale", String(scale));
  const layoutWidth = cueLightboxLayoutWidth(
    measureCueLightboxContentWidth(card),
    view,
    scale,
    origin.width
  );
  card.style.setProperty("--atomic-cue-lightbox-width", `${layoutWidth}px`);
}
function measureCueLightboxContentWidth(card) {
  const sheet = cueLightboxHtmlElement(card.querySelector(".atomic-cue-sheet"));
  if (!sheet) return CUE_CARD_FAN_WIDTH_PX;
  const probe = sheet.cloneNode(true);
  if (!probe.instanceOf(HTMLElement)) return CUE_CARD_FAN_WIDTH_PX;
  probe.addClass("atomic-cue-lightbox-measure");
  probe.setAttr("aria-hidden", "true");
  card.appendChild(probe);
  const width = probe.scrollWidth;
  probe.detach();
  return Math.max(1, Math.ceil(width));
}
function cueLightboxHtmlElement(node) {
  if (!node?.instanceOf(HTMLElement)) return null;
  return node;
}

// src/views/cue-card.ts
function resetCueFan() {
  closeCueLightbox();
}
function bindCueCardFan(cards) {
  resetCueFan();
  for (const card of cards) {
    card.addEventListener("click", (event) => {
      if (!cueCardEventShouldToggle(event.target, card)) return;
      toggleCueLightbox(card);
    });
    card.addEventListener("keydown", (event) => {
      if (!isCueCardToggleKey(event.key)) return;
      if (!cueCardEventShouldToggle(event.target, card)) return;
      event.preventDefault();
      toggleCueLightbox(card);
    });
  }
}
async function appendCueCard(fan, card, host, language) {
  const el = fan.createDiv({
    cls: "atomic-cue-card",
    attr: {
      tabindex: "0",
      role: "button",
      "aria-expanded": "false",
      "data-testid": "atomic-cue-card"
    }
  });
  const sheet = el.createDiv({ cls: "atomic-cue-sheet" });
  const meta = sheet.createDiv({ cls: "atomic-cue-meta" });
  if (card.lastSeen) {
    meta.setText(card.focus ? `${card.lastSeen} \xB7 ${card.focus}` : card.lastSeen);
  }
  const body = sheet.createDiv({ cls: "atomic-cue-body atomic-scrollport" });
  const text = body.createDiv({ cls: "atomic-cue-text" });
  if (cueTextNeedsMarkdown(card.text)) {
    await import_obsidian4.MarkdownRenderer.render(
      host.app,
      card.text,
      text,
      host.sourcePath,
      host.component
    );
  } else {
    for (const paragraph of card.text.split("\n")) {
      if (paragraph) text.createEl("p", { text: paragraph });
    }
  }
  const count = card.count ?? 0;
  if (count > 1) {
    el.createSpan({
      cls: "atomic-cue-tab atomic-cue-repeats",
      text: t("view.cues.repeats", language, { count })
    });
  }
  return el;
}

// src/views/cue-log.ts
var cueLogPaint = new PaintMemo(
  '[data-testid="atomic-cue-log"]',
  (previous, next) => !!previous && previous.sourcePath === next.sourcePath && previous.language === next.language && sameList(previous.cues, next.cues)
);
async function renderAtomicCueLog(plugin, el, host, generation) {
  const markdown = host.sourcePath ? await plugin.data.readCachedBody(host.sourcePath) : "";
  if (!shouldCommitBlockPaint(el, generation)) {
    return;
  }
  const language = plugin.settings.language;
  const existing = host.sourcePath ? parseReminders(markdown) : [];
  const paintState = {
    sourcePath: host.sourcePath,
    language,
    cues: existing
  };
  if (cueLogPaint.shouldSkip(el, paintState)) return;
  resetCueFan();
  const component = host.beginPaint();
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cues atomic-cue-log",
    attr: { "data-testid": "atomic-cue-log" }
  });
  if (!host.sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.cueLog.needsSavedNote", language)
    });
    return;
  }
  const compose = root.createDiv({ cls: "atomic-well atomic-cue-log-compose" });
  const fields = compose.createDiv({ cls: "atomic-cue-log-fields" });
  const field = fields.createDiv({ cls: "atomic-field atomic-cue-log-field" });
  const input = field.createEl("textarea", {
    cls: "atomic-field-value atomic-cue-log-text",
    attr: {
      rows: "3",
      "data-testid": "atomic-cue-log-text",
      placeholder: t("view.cueLog.placeholder", language),
      "aria-label": t("view.cueLog.cue", language)
    }
  });
  const addButton = fields.createEl("button", {
    cls: "atomic-btn is-primary",
    text: t("view.cueLog.add", language),
    attr: { type: "button", "data-testid": "atomic-cue-log-add" }
  });
  if (existing.length) {
    const fan = root.createDiv({
      cls: "atomic-cue-fan atomic-cue-log-existing",
      attr: { "data-testid": "atomic-cue-log-existing" }
    });
    const painted = await Promise.all(
      existing.map(
        (text) => appendCueCard(
          fan,
          { text },
          { app: host.app, component, sourcePath: host.sourcePath },
          language
        )
      )
    );
    bindCueCardFan(painted);
  }
  const addCue = async () => {
    if (addButton.disabled) return;
    const cue = sanitizeCueText(input.value);
    if (!cue) {
      new import_obsidian5.Notice(t("notice.cueMissingText", language));
      return;
    }
    const file = plugin.data.getFileByPath(host.sourcePath);
    if (!file) {
      new import_obsidian5.Notice(t("notice.cueNeedsSavedNote", language));
      return;
    }
    addButton.disabled = true;
    try {
      await plugin.app.vault.process(
        file,
        (latest) => appendCueBullet(latest, cue, t("template.reminders", language))
      );
      input.value = "";
      const preview = cue.split("\n")[0] ?? cue;
      new import_obsidian5.Notice(t("notice.cueAdded", language, { cue: preview }));
    } finally {
      addButton.disabled = false;
    }
    void renderAtomicCueLog(plugin, el, host, generation);
  };
  addButton.addEventListener("click", () => {
    void addCue();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    void addCue();
  });
}

// src/views/cues.ts
var cuesPaint = new PaintMemo(
  '[data-testid="atomic-cues"]',
  (previous, next) => !!previous && previous.kind === next.kind && previous.year === next.year && previous.activity === next.activity && previous.language === next.language && sameList(previous.cards, next.cards, sameCueCard)
);
function resolveCuesYear(opts, frontmatterYear2, timezone) {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear: frontmatterYear2 });
}
async function renderCues(el, data, activityTypes, year, activity, language, host) {
  const activityType = resolveCueActivityType(activityTypes, activity);
  if (!activityType) {
    const paintState2 = {
      kind: "missing",
      year,
      activity,
      language,
      cards: []
    };
    if (cuesPaint.shouldSkip(el, paintState2)) return;
    resetCueFan();
    host.beginPaint();
    el.empty();
    const root2 = el.createDiv({
      cls: "fitness-plugin atomic-cues",
      attr: { "data-testid": "atomic-cues", "data-activity": activity }
    });
    root2.createEl("p", {
      text: t("view.cues.noCueActivity", language, { activity }),
      cls: "fitness-muted"
    });
    return;
  }
  const cards = buildCueCards(await collectCues(data, activityType, year), year);
  const paintState = {
    kind: "cards",
    year,
    activity,
    language,
    cards
  };
  if (cuesPaint.shouldSkip(el, paintState)) return;
  resetCueFan();
  const component = host.beginPaint();
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cues",
    attr: { "data-testid": "atomic-cues", "data-activity": activity }
  });
  root.style.setProperty("--atomic-cue-accent", activityType.colors[2]);
  root.style.setProperty("--atomic-c", activityType.colors[2]);
  root.setAttr("data-activity-label", labelForLanguage(activityType.label, language));
  if (!cards.length) {
    root.createEl("p", {
      text: t("view.cues.empty", language, { year }),
      cls: "fitness-muted atomic-cues-empty"
    });
    return;
  }
  const fan = root.createDiv({ cls: "atomic-cue-fan" });
  const painted = await Promise.all(
    cards.map(
      (card) => appendCueCard(fan, card, { ...host, component }, language)
    )
  );
  for (const card of painted) {
    card.style.setProperty("--atomic-c", activityType.colors[2]);
  }
  bindCueCardFan(painted);
}
async function collectCues(data, activityType, year) {
  const sessions = await Promise.all(
    data.listSessions(activityType.folder, year).filter((session2) => !!session2.date).map(async (session2) => ({
      session: session2,
      reminders: await data.getSessionReminders(session2.path)
    }))
  );
  const cues = [];
  for (const { session: session2, reminders } of sessions) {
    const focus = session2.focus.join(", ");
    for (const text of reminders) {
      if (!text) continue;
      cues.push({ text, date: session2.date, focus });
    }
  }
  return cues;
}

// src/core/hobby.ts
var TIME_LOG_HEADING = /^#{1,6}\s+Time log\s*$/i;
var HEADING2 = /^(#{1,6})\s+/;
var TIMER_METADATA = /<!--\s*atomic-timer\s+start="([^"]+)"\s+end="([^"]+)"\s*-->/;
var TIME_LOG_ENTRY = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})\s*(?:-|\u2013|\u2014)\s*(\d{2}:\d{2}))?\s*(?:\||\u00b7)?\s*(\d+)\s*min(?:\s*(?:\||\u2014|-)\s*(.*?))?\s*$/;
function parseTimeLog(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const entries = [];
  let timeLogLevel = null;
  for (const line of lines) {
    const heading = line.match(HEADING2);
    if (heading && timeLogLevel !== null && heading[1].length <= timeLogLevel) {
      break;
    }
    if (TIME_LOG_HEADING.test(line.trim())) {
      timeLogLevel = line.match(HEADING2)?.[1].length ?? 0;
      continue;
    }
    if (timeLogLevel === null) continue;
    const entry = parseTimeLogLine(line);
    if (entry) entries.push(entry);
  }
  return entries;
}
function appendTimeLog(markdown, entry) {
  const normalizedEntry = normalizeEntry(entry);
  if (hasMatchingIsoEntry(parseTimeLog(markdown), normalizedEntry)) {
    return ensureTrailingNewline(markdown);
  }
  const entryLine = formatTimeLogEntry(normalizedEntry);
  const lines = String(markdown || "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => TIME_LOG_HEADING.test(line.trim()));
  if (headingIndex === -1) {
    const base = trimTrailingBlankLines(lines).join("\n");
    return `${base}${base ? "\n\n" : ""}## Time log

${entryLine}
`;
  }
  const headingLevel = lines[headingIndex].match(HEADING2)?.[1].length ?? 0;
  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(HEADING2);
    if (heading && heading[1].length <= headingLevel) {
      sectionEnd = index;
      break;
    }
  }
  let insertAt = sectionEnd;
  while (insertAt > headingIndex + 1 && lines[insertAt - 1].trim() === "") {
    insertAt -= 1;
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(sectionEnd);
  if (before[before.length - 1]?.trim() === lines[headingIndex].trim()) {
    before.push("");
  }
  before.push(entryLine);
  if (after.length > 0 && after[0].trim() !== "") {
    before.push("");
  }
  return ensureTrailingNewline([...before, ...after].join("\n"));
}
function elapsedTimerMinutes(startedAtIso, stoppedAtIso) {
  const startedAtMs = Date.parse(startedAtIso);
  const stoppedAtMs = Date.parse(stoppedAtIso);
  if (!Number.isFinite(startedAtMs)) {
    throw new Error("Invalid timer start time");
  }
  if (!Number.isFinite(stoppedAtMs)) {
    throw new Error("Invalid timer stop time");
  }
  if (stoppedAtMs < startedAtMs) {
    throw new Error("Timer stop time cannot be before start time");
  }
  return Math.round((stoppedAtMs - startedAtMs) / 6e4);
}
function displayedTimerMinutes(frontmatter) {
  switch (frontmatter.persistMode) {
    case "session":
      return frontmatter.durationMin;
    case "item":
      return frontmatter.totalMin;
    default: {
      const unseen = frontmatter.persistMode;
      throw new Error(`Unknown timer persist mode: ${unseen}`);
    }
  }
}
function stopTimer(input) {
  const minutes = elapsedTimerMinutes(input.startedAtIso, input.stoppedAtIso);
  const entry = {
    date: dateFromIso(input.startedAtIso),
    minutes,
    note: input.note?.trim() ?? "",
    startIso: input.startedAtIso,
    endIso: input.stoppedAtIso
  };
  const existingEntries = parseTimeLog(input.markdown);
  const alreadyLogged = hasMatchingIsoEntry(existingEntries, entry);
  const markdownWithLog = alreadyLogged ? input.markdown : appendTimeLog(input.markdown, entry);
  const frontmatter = readTimerFrontmatter(input.markdown);
  const previousLogTotal = sumMinutes(existingEntries);
  const totalMin = alreadyLogged ? Math.max(frontmatter.totalMin, previousLogTotal) : Math.max(frontmatter.totalMin, previousLogTotal) + minutes;
  const markdown = updateTimerFrontmatter(markdownWithLog, {
    totalMin,
    timerStartedAtIso: null
  });
  return { markdown, minutes, totalMin };
}
function stopSessionTimer(input) {
  const minutes = elapsedTimerMinutes(input.startedAtIso, input.stoppedAtIso);
  const frontmatter = readTimerFrontmatter(input.markdown);
  const durationMin = frontmatter.durationMin + minutes;
  const markdown = updateTimerFrontmatter(input.markdown, {
    durationMin,
    timerStartedAtIso: null
  });
  return { markdown, minutes, durationMin };
}
function minutesByDate(entries) {
  const totals = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.minutes);
  }
  return totals;
}
function minutesByDateForYear(entries, year) {
  const prefix = `${year}-`;
  return minutesByDate(entries.filter((entry) => entry.date.startsWith(prefix)));
}
function minutesByMonthForYear(entries, year) {
  const months = Array(12).fill(0);
  const prefix = `${year}-`;
  for (const entry of entries) {
    if (!entry.date.startsWith(prefix)) continue;
    const month = monthIndexFromDate(entry.date);
    if (month >= 0) months[month] += entry.minutes;
  }
  return months;
}
function readTimerFrontmatter(markdown) {
  const parts = splitFrontmatter(markdown);
  if (!parts) {
    return {
      persistMode: "item",
      totalMin: 0,
      durationMin: 0,
      timerStartedAt: null
    };
  }
  let noteType = null;
  let totalMin = 0;
  let durationMin = 0;
  let hasTotalMinKey = false;
  let hasDurationKey = false;
  let timerStartedAt = null;
  for (let index = 1; index < parts.endIndex; index += 1) {
    const line = parts.lines[index];
    const typeMatch = line.match(/^type\s*:\s*(.*)$/);
    if (typeMatch) {
      noteType = emptyToNull(unquoteYamlScalar(typeMatch[1]));
      continue;
    }
    const totalMatch = line.match(/^total_min\s*:\s*(.*)$/);
    if (totalMatch) {
      hasTotalMinKey = true;
      const total = Number(unquoteYamlScalar(totalMatch[1]));
      totalMin = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
      continue;
    }
    const durationMatch = line.match(/^duration_min\s*:\s*(.*)$/);
    if (durationMatch) {
      hasDurationKey = true;
      const duration = Number(unquoteYamlScalar(durationMatch[1]));
      durationMin = Number.isFinite(duration) && duration > 0 ? Math.trunc(duration) : 0;
      continue;
    }
    const startedMatch = line.match(/^timer_started_at\s*:\s*(.*)$/);
    if (startedMatch) {
      timerStartedAt = emptyToNull(unquoteYamlScalar(startedMatch[1]));
    }
  }
  return {
    persistMode: resolveTimerPersistMode(noteType, hasDurationKey, hasTotalMinKey),
    totalMin,
    durationMin,
    timerStartedAt
  };
}
function updateTimerFrontmatter(markdown, fields) {
  const text = String(markdown || "");
  const parts = splitFrontmatter(text);
  if (!parts) {
    const frontmatter = [
      "---",
      ...fields.totalMin === void 0 ? [] : [`total_min: ${normalizeMinutes(fields.totalMin)}`],
      ...fields.durationMin === void 0 ? [] : [`duration_min: ${normalizeMinutes(fields.durationMin)}`],
      ...fields.timerStartedAtIso === void 0 ? [] : [formatTimerStartedAt(fields.timerStartedAtIso)],
      "---",
      ""
    ];
    return `${frontmatter.join("\n")}${text}`;
  }
  let lines = parts.lines.slice();
  if (fields.totalMin !== void 0) {
    lines = setFrontmatterField(
      lines,
      "total_min",
      `total_min: ${normalizeMinutes(fields.totalMin)}`
    );
  }
  if (fields.durationMin !== void 0) {
    lines = setFrontmatterField(
      lines,
      "duration_min",
      `duration_min: ${normalizeMinutes(fields.durationMin)}`
    );
  }
  if (fields.timerStartedAtIso !== void 0) {
    lines = setFrontmatterField(
      lines,
      "timer_started_at",
      formatTimerStartedAt(fields.timerStartedAtIso)
    );
  }
  return ensureTrailingNewline(lines.join("\n"));
}
function resolveTimerPersistMode(noteType, hasDurationKey, hasTotalMinKey) {
  if (noteType === "session") return "session";
  if (noteType === "atomic-item") return "item";
  if (hasDurationKey && !hasTotalMinKey) return "session";
  return "item";
}
function parseTimeLogLine(line) {
  const metadata = line.match(TIMER_METADATA);
  const visibleLine = line.replace(TIMER_METADATA, "").trimEnd();
  const match = visibleLine.match(TIME_LOG_ENTRY);
  if (!match) return null;
  return {
    date: match[1],
    minutes: Number(match[4]),
    note: (match[5] ?? "").trim(),
    ...metadata ? {
      startIso: unescapeHtmlAttribute(metadata[1]),
      endIso: unescapeHtmlAttribute(metadata[2])
    } : {}
  };
}
function normalizeEntry(entry) {
  return {
    date: entry.date,
    minutes: normalizeMinutes(entry.minutes),
    note: sanitizeLogNote(entry.note),
    ...entry.startIso ? { startIso: entry.startIso } : {},
    ...entry.endIso ? { endIso: entry.endIso } : {}
  };
}
function formatTimeLogEntry(entry) {
  const timeRange = entry.startIso && entry.endIso ? ` ${timeFromIso(entry.startIso)}-${timeFromIso(entry.endIso)}` : "";
  const note = entry.note ? ` | ${entry.note}` : "";
  const metadata = entry.startIso && entry.endIso ? ` <!-- atomic-timer start="${escapeHtmlAttribute(
    entry.startIso
  )}" end="${escapeHtmlAttribute(entry.endIso)}" -->` : "";
  return `- ${entry.date}${timeRange} | ${entry.minutes} min${note}${metadata}`;
}
function hasMatchingIsoEntry(entries, entry) {
  if (!entry.startIso || !entry.endIso) return false;
  return entries.some(
    (existing) => existing.startIso === entry.startIso && existing.endIso === entry.endIso
  );
}
function splitFrontmatter(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return { lines, endIndex: index };
    }
  }
  return null;
}
function setFrontmatterField(lines, key, line) {
  const next = lines.slice();
  const endIndex = splitFrontmatter(next.join("\n"))?.endIndex;
  if (endIndex === void 0) return next;
  for (let index = 1; index < endIndex; index += 1) {
    if (new RegExp(`^${key}\\s*:`).test(next[index])) {
      next[index] = line;
      return next;
    }
  }
  next.splice(endIndex, 0, line);
  return next;
}
function formatTimerStartedAt(value) {
  if (!value) return "timer_started_at:";
  return `timer_started_at: "${escapeYamlDoubleQuoted(value)}"`;
}
function dateFromIso(iso) {
  const directDate = iso.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (directDate) return directDate[1];
  return new Date(iso).toISOString().slice(0, 10);
}
function timeFromIso(iso) {
  const directTime = iso.match(/T(\d{2}:\d{2})/);
  if (directTime) return directTime[1];
  return new Date(iso).toISOString().slice(11, 16);
}
function sumMinutes(entries) {
  return entries.reduce((total, entry) => total + entry.minutes, 0);
}
function normalizeMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}
function sanitizeLogNote(note) {
  return String(note || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}
function trimTrailingBlankLines(lines) {
  const next = lines.slice();
  while (next.length > 0 && next[next.length - 1].trim() === "") {
    next.pop();
  }
  return next;
}
function emptyToNull(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "~" || trimmed.toLowerCase() === "null") {
    return null;
  }
  return trimmed;
}
function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function escapeHtmlAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function unescapeHtmlAttribute(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// src/core/dashboard.ts
function dashboardPaintState(input, language) {
  return {
    year: input.year,
    language,
    exercise: input.exercise.map(({ activity, sessions }) => ({
      activityKey: activityPaintKey(activity),
      sessions
    })),
    hobbies: input.hobbies.map(({ activity, items }) => ({
      activityKey: activityPaintKey(activity),
      items
    }))
  };
}
function sameSessionInput(a, b) {
  return a.meta === b.meta && a.setRows === b.setRows;
}
function sameHobbyItemInput(a, b) {
  return a.path === b.path && a.frontmatter === b.frontmatter && a.entries === b.entries;
}
function sameDashboardPaintState(previous, next) {
  if (!previous) return false;
  return previous.year === next.year && previous.language === next.language && sameList(
    previous.exercise,
    next.exercise,
    (a, b) => a.activityKey === b.activityKey && sameList(a.sessions, b.sessions, sameSessionInput)
  ) && sameList(
    previous.hobbies,
    next.hobbies,
    (a, b) => a.activityKey === b.activityKey && sameList(a.items, b.items, sameHobbyItemInput)
  );
}
var FELT_ORDER = ["good", "ok", "bad"];
var RECENT_LIMIT = 10;
var GOLF_ID = "golf";
function emptyMonths() {
  return Array(12).fill(0);
}
function addMonths(target, source) {
  for (let i = 0; i < 12; i++) target[i] += source[i];
}
function bump(map, key, by) {
  map.set(key, (map.get(key) || 0) + by);
}
function rememberLatest(current, date, path) {
  if (!current || date > current.date) return { date, path };
  return current;
}
function formatKg(n) {
  return (Math.round(n * 10) / 10).toLocaleString("en-US");
}
function formatCompactKg(n) {
  if (n < 1e3) return formatKg(n);
  const k = n / 1e3;
  return `${(Math.round(k * 10) / 10).toLocaleString("en-US")}k`;
}
function splitHoursMinutes(totalMinutes) {
  const safe = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}
function averagePerSession(totalMinutes, sessions) {
  return sessions > 0 ? Math.round(totalMinutes / sessions) : 0;
}
function hoursFromMinutes(minutes) {
  return Math.round(minutes / 60 * 10) / 10;
}
function formatHours(minutes) {
  return `${hoursFromMinutes(minutes).toLocaleString("en-US")}h`;
}
function barHeights(values, minPercent = 4) {
  const max = Math.max(0, ...values);
  if (max <= 0) return values.map(() => 0);
  return values.map(
    (v) => v <= 0 ? 0 : Math.max(minPercent, Math.round(v / max * 100))
  );
}
function normalizeFelt(felt) {
  const value = String(felt || "").toLowerCase();
  return value === "good" || value === "ok" || value === "bad" ? value : null;
}
function summarizeExercise({ activity, sessions }) {
  const monthly = emptyMonths();
  const monthlyMinutes = emptyMonths();
  const monthlyVolume = emptyMonths();
  const felt = { good: 0, ok: 0, bad: 0 };
  const muscleSets = /* @__PURE__ */ new Map();
  const muscleVolume = /* @__PURE__ */ new Map();
  const focusCounts = /* @__PURE__ */ new Map();
  const recent = [];
  const isGolf = activity.id === GOLF_ID;
  let minutes = 0;
  let volumeKg = 0;
  let latest = null;
  for (const { meta, setRows } of sessions) {
    const mi = monthIndexFromDate(meta.date);
    minutes += meta.duration_min;
    if (mi >= 0) {
      monthly[mi] += 1;
      monthlyMinutes[mi] += meta.duration_min;
    }
    let sessionVolume = 0;
    if (activity.supportsSetTable) {
      for (const row of setRows) {
        const vol = rowVolumeKg(row, meta.weight_unit);
        sessionVolume += vol;
        if (row.muscle) bump(muscleSets, row.muscle, 1);
        if (vol > 0) bump(muscleVolume, row.muscle, vol);
      }
      volumeKg += sessionVolume;
      if (mi >= 0) monthlyVolume[mi] += sessionVolume;
    }
    const sessionFelt = isGolf ? normalizeFelt(meta.felt) : null;
    if (isGolf) {
      if (sessionFelt) felt[sessionFelt] += 1;
      for (const focus of meta.focus) bump(focusCounts, focus, 1);
    }
    if (meta.date) {
      latest = rememberLatest(latest, meta.date, meta.path);
      recent.push({
        date: meta.date,
        activity,
        path: meta.path,
        minutes: meta.duration_min,
        volumeKg: activity.supportsSetTable ? sessionVolume : null,
        felt: sessionFelt
      });
    }
  }
  const columns = [{ activity, kind: "sessions", values: monthly }];
  if (activity.supportsSetTable) {
    columns.push({ activity, kind: "volume", values: monthlyVolume });
  }
  return {
    card: {
      domain: "exercise",
      activity,
      count: sessions.length,
      minutes,
      monthly,
      monthlyMinutes,
      volumeKg: activity.supportsSetTable ? volumeKg : null,
      lastDate: latest?.date ?? null,
      lastPath: latest?.path ?? null,
      felt: isGolf ? felt : null
    },
    columns,
    monthlyVolume: activity.supportsSetTable ? monthlyVolume : null,
    recent,
    muscleSets,
    muscleVolume,
    focusCounts
  };
}
function summarizeHobby({ activity, items }, year) {
  const monthlyMinutes = emptyMonths();
  let inProgress = 0;
  let latest = null;
  const yearPrefix = `${year}-`;
  for (const item of items) {
    addMonths(monthlyMinutes, minutesByMonthForYear(item.entries, year));
    if (isInProgressStatus(item.frontmatter.status)) inProgress += 1;
    for (const entry of item.entries) {
      if (!entry.date.startsWith(yearPrefix)) continue;
      latest = rememberLatest(latest, entry.date, item.path);
    }
  }
  return {
    card: {
      domain: "hobby",
      activity,
      count: items.length,
      minutes: monthlyMinutes.reduce((sum, v) => sum + v, 0),
      monthlyMinutes,
      inProgress,
      lastDate: latest?.date ?? null,
      lastPath: latest?.path ?? null
    },
    column: { activity, kind: "minutes", values: monthlyMinutes }
  };
}
function rankMuscles(sets, volume) {
  const names = /* @__PURE__ */ new Set([...sets.keys(), ...volume.keys()]);
  return [...names].map((muscle) => ({
    muscle,
    sets: sets.get(muscle) || 0,
    volumeKg: volume.get(muscle) || 0
  })).sort(
    (a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets || a.muscle.localeCompare(b.muscle)
  );
}
function rankFocus(counts) {
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
function buildDashboardModel(input) {
  const sessionsByMonth = emptyMonths();
  const volumeByMonth = emptyMonths();
  const muscleSets = /* @__PURE__ */ new Map();
  const muscleVolume = /* @__PURE__ */ new Map();
  const focusCounts = /* @__PURE__ */ new Map();
  const recent = [];
  const activities = [];
  const monthlyColumns = [];
  let totalSessions = 0;
  let totalExerciseMinutes = 0;
  let totalVolumeKg = 0;
  let setTableActivity = null;
  let golf = null;
  for (const exercise of input.exercise) {
    const summary = summarizeExercise(exercise);
    const { card } = summary;
    totalSessions += card.count;
    totalExerciseMinutes += card.minutes;
    addMonths(sessionsByMonth, card.monthly);
    if (card.volumeKg != null && summary.monthlyVolume) {
      if (!setTableActivity) setTableActivity = card.activity;
      totalVolumeKg += card.volumeKg;
      addMonths(volumeByMonth, summary.monthlyVolume);
    }
    if (card.activity.id === GOLF_ID) golf = card;
    for (const [k, v] of summary.muscleSets) bump(muscleSets, k, v);
    for (const [k, v] of summary.muscleVolume) bump(muscleVolume, k, v);
    for (const [k, v] of summary.focusCounts) bump(focusCounts, k, v);
    recent.push(...summary.recent);
    activities.push(card);
    monthlyColumns.push(...summary.columns);
  }
  let totalHabitMinutes = 0;
  for (const hobby of input.hobbies) {
    const { card, column } = summarizeHobby(hobby, input.year);
    totalHabitMinutes += card.minutes;
    activities.push(card);
    monthlyColumns.push(column);
  }
  recent.sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path));
  const dates = recent.map((row) => row.date);
  return {
    year: input.year,
    totalSessions,
    totalExerciseMinutes,
    totalVolumeKg: setTableActivity ? totalVolumeKg : null,
    totalHabitMinutes: input.hobbies.length ? totalHabitMinutes : null,
    sessionsByMonth,
    volumeByMonth,
    firstDate: dates.length ? dates[dates.length - 1] : null,
    lastDate: dates.length ? dates[0] : null,
    activities,
    monthlyColumns,
    muscles: setTableActivity ? { activity: setTableActivity, rows: rankMuscles(muscleSets, muscleVolume) } : null,
    golfFocus: golf ? { activity: golf.activity, sessions: golf.count, tags: rankFocus(focusCounts) } : null,
    recent: recent.slice(0, RECENT_LIMIT)
  };
}

// src/views/catalog-label.ts
function appendCatalogLabel(parent, text) {
  parent.appendText(text);
}
function appendInlineCatalog(parent, text) {
  parent.appendText(text);
}

// src/util/month-chart.ts
function calendarMonth(timeZone, now = /* @__PURE__ */ new Date()) {
  const today = parseYmd(ymdInZone(now, timeZone));
  if (!today) return { year: nowYear(timeZone), month: 0 };
  return { year: today.y, month: today.m - 1 };
}
function isFutureMonth(viewYear, monthIndex, timeZone, now = /* @__PURE__ */ new Date()) {
  const today = calendarMonth(timeZone, now);
  if (viewYear > today.year) return true;
  if (viewYear < today.year) return false;
  return monthIndex > today.month;
}
function stackedMonthPeak(series) {
  const months = Math.max(0, ...series.map((values) => values.length));
  let peak = 0;
  for (let month = 0; month < months; month++) {
    let sum = 0;
    for (const values of series) sum += values[month] ?? 0;
    if (sum > peak) peak = sum;
  }
  return peak > 0 ? peak : 1;
}

// src/exercise/cues-host.ts
function isCueHostActivity(activity) {
  return activity.domain === "exercise" && activity.supportsCues;
}
function cueActivities(activityTypes) {
  return exerciseActivities(activityTypes).filter(isCueHostActivity);
}
function cuesHostMarkdown(activity, language = "en") {
  return `# ${labelForLanguage(activity.label, language)}

${defaultAtomicBlockFence("atomic-cues", language, {
    activity: activity.id
  })}`;
}
async function ensureCuesHostFile(data, activity, language = "en") {
  if (!isCueHostActivity(activity)) {
    throw new Error("Cues host is only for cue-supporting exercise activities");
  }
  const path = cuePathForActivity(activity);
  if (data.exists(path)) {
    return { path, created: false };
  }
  const folder = activity.folder.replace(/\/$/, "");
  if (!isSafeVaultFolder(folder)) {
    throw new Error("Cues folder must be a safe vault-relative path");
  }
  await data.createNote(path, cuesHostMarkdown(activity, language));
  return { path, created: true };
}
async function ensureCuesHostFiles(data, activityTypes, language = "en") {
  const results = [];
  for (const activity of cueActivities(activityTypes)) {
    results.push(await ensureCuesHostFile(data, activity, language));
  }
  return results;
}
function noticeErrorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}
function joinPaths(results) {
  return results.map((result) => result.path).join(", ");
}
async function createCuesHostCommand(data, activityTypes, language) {
  try {
    const results = await ensureCuesHostFiles(data, activityTypes, language);
    if (!results.length) {
      showNotice(t("notice.noCueActivities", language));
      return;
    }
    const created = results.filter((result) => result.created);
    const existing = results.filter((result) => !result.created);
    if (created.length) {
      showNotice(t("notice.createdCues", language, { paths: joinPaths(created) }));
    }
    if (existing.length) {
      showNotice(t("notice.cuesExist", language, { paths: joinPaths(existing) }));
    }
  } catch (error) {
    showNotice(t("notice.cuesFailed", language, { message: noticeErrorMessage2(error) }));
  }
}
async function openCuesHostFile(data, activity, language) {
  try {
    const result = await ensureCuesHostFile(data, activity, language);
    await data.openPath(result.path);
  } catch (error) {
    showNotice(t("notice.cuesFailed", language, { message: noticeErrorMessage2(error) }));
  }
}

// src/hobbies/book-shelf-host.ts
var BOOK_SHELF_HOST_REL = "atomics/hobbies/Reading/Book Shelf.md";
function bookShelfHostMarkdown(language = "en") {
  return defaultAtomicBlockFence("atomic-bookshelf", language);
}
async function createBookShelfHostFile(data, language = "en") {
  if (data.exists(BOOK_SHELF_HOST_REL)) {
    return { path: BOOK_SHELF_HOST_REL, created: false };
  }
  await data.createNote(BOOK_SHELF_HOST_REL, bookShelfHostMarkdown(language));
  return { path: BOOK_SHELF_HOST_REL, created: true };
}
async function createBookShelfHostCommand(data, language) {
  try {
    const result = await createBookShelfHostFile(data, language);
    showNotice(
      result.created ? t("notice.createdBookShelf", language, { path: result.path }) : t("notice.bookShelfExists", language, { path: result.path })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}
async function openBookShelfHostCommand(data, language) {
  try {
    const result = await createBookShelfHostFile(data, language);
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}

// src/hobbies/reading-bookshelf.ts
var READING_BOOKSHELF_REL = "atomics/hobbies/Reading/Bookshelf.base";
var READING_ITEMS_FOLDER = "atomics/hobbies/Reading/Items";
function callPluginIdLookup2(method, self, id) {
  if (typeof method !== "function") return void 0;
  return method.call(self, id);
}
function readingBookshelfBaseYaml(itemsFolder = READING_ITEMS_FOLDER, language = "en") {
  if (!isSafeVaultFolder(itemsFolder)) {
    throw new Error("Reading items folder must be a safe vault-relative folder");
  }
  return `# ${t("template.readingBookshelfTitle", language)}
filters:
  and:
    - 'file.inFolder("${itemsFolder}")'
    - 'type == "atomic-item"'
    - 'activity == "reading"'
properties:
  file.name:
    displayName: ${t("template.base.title", language)}
  authors:
    displayName: ${t("template.base.authors", language)}
  description:
    displayName: ${t("template.base.description", language)}
  pages:
    displayName: ${t("template.base.pages", language)}
  status:
    displayName: ${t("template.base.status", language)}
  tags:
    displayName: ${t("template.base.tags", language)}
  total_min:
    displayName: ${t("template.base.totalMinutes", language)}
views:
  - type: cards
    name: ${t("template.base.cards", language)}
    image: cover
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
  - type: table
    name: ${t("template.base.table", language)}
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
`;
}
function needsReadingBookshelfUpgrade(content) {
  const legacyCards = /^\s+-\s+type:\s*cards[\s\S]*?\n\s+fields:\s*$/m.test(content);
  const legacyTable = /^\s+-\s+type:\s*table[\s\S]*?\n\s+columns:\s*$/m.test(content);
  return legacyCards || legacyTable;
}
function isBasesCorePluginEnabled(app) {
  const appRecord = app;
  if (!isRecord(appRecord)) return false;
  const internalPlugins = appRecord.internalPlugins;
  if (!isRecord(internalPlugins)) return false;
  try {
    if (callPluginIdLookup2(internalPlugins.getEnabledPluginById, internalPlugins, "bases") != null) {
      return true;
    }
  } catch {
  }
  const plugins = internalPlugins.plugins;
  if (isRecord(plugins)) {
    const bases = plugins.bases;
    if (isRecord(bases) && bases.enabled === true) return true;
  }
  const config = internalPlugins.config;
  if (isRecord(config) && config.bases === true) return true;
  try {
    const plugin = callPluginIdLookup2(
      internalPlugins.getPluginById,
      internalPlugins,
      "bases"
    );
    if (isRecord(plugin) && plugin.enabled === true) return true;
  } catch {
    return false;
  }
  return false;
}
async function createReadingBookshelfFile(data, itemsFolder = READING_ITEMS_FOLDER, language = "en") {
  const yaml = readingBookshelfBaseYaml(itemsFolder, language);
  if (!data.exists(READING_BOOKSHELF_REL)) {
    await data.createNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: true, updated: false };
  }
  const existing = await data.readBody(READING_BOOKSHELF_REL);
  if (needsReadingBookshelfUpgrade(existing)) {
    await data.writeNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: false, updated: true };
  }
  return { path: READING_BOOKSHELF_REL, created: false, updated: false };
}
async function createReadingBookshelfCommand(app, data, language) {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }
  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language
    );
    if (result.created) {
      showNotice(t("notice.createdReadingBookshelf", language, { path: result.path }));
      return;
    }
    if (result.updated) {
      showNotice(t("notice.updatedReadingBookshelf", language, { path: result.path }));
      return;
    }
    showNotice(t("notice.readingBookshelfExists", language, { path: result.path }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}
async function openReadingBookshelfCommand(app, data, language) {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }
  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language
    );
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}

// src/views/dashboard-dom.ts
var FELT_LABEL_KEY = {
  good: "view.dashboard.feltGood",
  ok: "view.dashboard.feltOk",
  bad: "view.dashboard.feltBad"
};
function formatCount(n) {
  return n.toLocaleString("en-US");
}
function monthLabel(index, ctx, year = 2e3) {
  return monthShortForLanguage(year, index + 1, 1, ctx.language);
}
function compactMonthLabel(index, ctx) {
  return ctx.language === "en" ? monthShortEn(2e3, index + 1, 1).slice(0, 1) : String(index + 1);
}
function shortDate(ymd, ctx) {
  const parsed = parseYmd(ymd);
  if (!parsed) return ymd;
  if (ctx.language === "en") {
    return `${monthShortEn(parsed.y, parsed.m, parsed.d)} ${parsed.d}`;
  }
  return `${parsed.m}\u6708${parsed.d}\u65E5`;
}
function activityLinks(card, ctx) {
  const { activity } = card;
  const color = activity.colors[2];
  const links = [];
  if (card.domain === "exercise" && activity.supportsCues) {
    const path = cuePathForActivity(activity);
    links.push({
      text: t("view.dashboard.cues", ctx.language, {
        activity: labelForLanguage(activity.label, ctx.language)
      }),
      path,
      color,
      open: () => openCuesHostFile(ctx.data, activity, ctx.language)
    });
  }
  if (card.domain === "hobby" && activity.id === "reading") {
    links.push(
      {
        text: t("view.dashboard.readingBookshelf", ctx.language),
        path: READING_BOOKSHELF_REL,
        color,
        open: () => ctx.data.openPath(READING_BOOKSHELF_REL)
      },
      {
        text: t("view.dashboard.bookShelf", ctx.language),
        path: BOOK_SHELF_HOST_REL,
        color,
        open: () => ctx.data.openPath(BOOK_SHELF_HOST_REL)
      }
    );
  }
  return links;
}
function appendActivityLink(parent, link, cls = "atomic-dash-link", text = link.text) {
  const el = parent.createEl("a", {
    cls,
    attr: { href: "#", "data-testid": "atomic-dashboard-link", "data-path": link.path }
  });
  el.appendText(text);
  el.createSpan({ cls: "atomic-link-arrow", text: "\u2197" });
  el.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void link.open();
  });
  return el;
}
function appendPathLink(parent, text, path, ctx, cls = "atomic-dash-link") {
  const link = parent.createEl("a", {
    cls,
    text,
    attr: { href: "#", "data-testid": "atomic-dashboard-link", "data-path": path }
  });
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void ctx.data.openPath(path);
  });
  return link;
}
function appendSectionTitle(parent, title, meta) {
  const section = parent.createDiv({ cls: "atomic-section" });
  const head = section.createDiv({ cls: "atomic-section-head" });
  const titleWrap = head.createDiv();
  const caption = titleWrap.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, title);
  const readout = head.createDiv({ cls: "atomic-readout" });
  appendCatalogLabel(readout, meta);
  return { section, titleWrap };
}
function appendBars(parent, bars, variant) {
  for (const bar of bars) {
    const future = variant === "month" && bar.future === true;
    const active = bar.value > 0 && !future;
    const stub = future ? " is-future" : active ? "" : " is-zero";
    const attr = { ...bar.attrs };
    if (bar.title) attr.title = bar.title;
    const el = parent.createSpan({
      cls: `atomic-dash-bar is-${variant}${stub}${variant === "month" ? " atomic-bar" : ""}`,
      attr: Object.keys(attr).length ? attr : void 0
    });
    if (variant === "month") {
      if (!future) el.style.setProperty("--v", active ? (bar.height / 100).toFixed(3) : "0");
    } else {
      el.style.height = active ? `${bar.height}%` : "0";
      if (active && bar.color) el.style.background = bar.color;
    }
  }
}
function monthBars(values, color, ctx) {
  const heights = barHeights(values);
  return values.map((value, index) => ({
    value,
    height: heights[index],
    color,
    title: `${monthLabel(index, ctx)}: ${formatHours(value)}`,
    future: isFutureMonth(ctx.year, index, ctx.timezone),
    attrs: {
      "data-testid": "atomic-dashboard-month-bar",
      "data-month": String(index + 1),
      "data-minutes": String(value)
    }
  }));
}
function appendMonthBars(parent, values, color, title, ctx) {
  const bars = parent.createDiv({
    cls: "atomic-dash-bars atomic-months",
    attr: { title, "data-testid": "atomic-dashboard-activity-bars" }
  });
  bars.style.setProperty("--atomic-c", color);
  appendBars(bars, monthBars(values, color, ctx), "month");
  appendMonthInitials(parent, ctx);
}
function appendMonthInitials(parent, ctx) {
  const today = calendarMonth(ctx.timezone);
  const labels = parent.createDiv({ cls: "atomic-month-initials atomic-caption" });
  for (let i = 0; i < 12; i++) {
    const text = compactMonthLabel(i, ctx);
    if (ctx.year === today.year && i === today.month) {
      labels.createSpan({ cls: "is-now", text });
    } else {
      labels.createSpan({ text });
    }
  }
}

// src/views/dashboard-sections.ts
function appendEmpty(parent, text) {
  parent.createDiv({ cls: "atomic-dash-empty", text });
}
function kg(value, ctx) {
  return `${formatKg(value)} ${t("view.dashboard.kgUnit", ctx.language)}`;
}
function shownActivity(column, ctx) {
  return labelForLanguage(column.activity.label, ctx.language);
}
function columnHeader(column, ctx) {
  switch (column.kind) {
    case "sessions":
      return shownActivity(column, ctx);
    case "volume":
      return t("view.dashboard.volumeHeader", ctx.language, { activity: shownActivity(column, ctx) });
    case "minutes":
      return t("view.dashboard.minutesHeader", ctx.language, { activity: shownActivity(column, ctx) });
    default: {
      const exhaustive = column.kind;
      return exhaustive;
    }
  }
}
function columnCell(column, index) {
  return column.kind === "volume" ? formatKg(column.values[index]) : formatCount(column.values[index]);
}
function chartMax(columns, year, timeZone) {
  return stackedMonthPeak(
    columns.map(
      (column) => column.values.map((value, month) => isFutureMonth(year, month, timeZone) ? 0 : value)
    )
  );
}
function chartTick(max, mark) {
  const value = Math.round(max * mark * 10) / 10;
  return formatCount(value);
}
function sectionReadout(section) {
  const readout = section.querySelector(".atomic-readout");
  if (readout == null || !readout.instanceOf(HTMLElement)) return null;
  return readout;
}
function appendChartLegend(parent, columns, ctx) {
  const legend = parent.createDiv({ cls: "atomic-legend" });
  for (const column of columns) {
    const item = legend.createSpan();
    const dot = item.createSpan({ cls: "atomic-dot" });
    dot.setCssProps({ "--atomic-c": column.activity.colors[2] });
    item.appendText(shownActivity(column, ctx));
  }
}
function appendMonthlyChart(card, columns, ctx, readout, year) {
  const max = chartMax(columns, year, ctx.timezone);
  const axis = card.createDiv({ cls: "atomic-chart-y atomic-caption" });
  for (const mark of [0, 0.5, 1]) {
    axis.createSpan({
      text: chartTick(max, mark),
      attr: { style: `--y:${mark}` }
    });
  }
  const plot = card.createDiv({ cls: "atomic-chart-plot" });
  for (const mark of [0, 0.5, 1]) {
    plot.createSpan({
      cls: mark === 0 ? "atomic-chart-grid is-base" : "atomic-chart-grid",
      attr: { style: `--y:${mark}` }
    });
  }
  const cols = plot.createDiv({ cls: "atomic-chart-cols", attr: { "aria-hidden": "true" } });
  const labels = card.createDiv({ cls: "atomic-chart-x atomic-caption" });
  for (let month = 0; month < 12; month++) {
    const future = isFutureMonth(year, month, ctx.timezone);
    const name = monthLabel(month, ctx, year);
    const col = cols.createDiv({
      cls: future ? "atomic-chart-col is-future" : "atomic-chart-col",
      attr: {
        "data-testid": "atomic-dashboard-month-col",
        "data-month": String(month + 1)
      }
    });
    const parts = [name];
    if (!future) {
      for (const column of columns) {
        const value = column.values[month] ?? 0;
        const seg = col.createSpan({ cls: "atomic-chart-seg" });
        seg.style.setProperty("--atomic-c", column.activity.colors[2]);
        seg.style.setProperty("--v", (value / max).toFixed(3));
        const activityName = shownActivity(column, ctx);
        seg.setAttr("title", `${activityName} \xB7 ${name}: ${formatCount(value)}`);
        parts.push(`${activityName} ${formatCount(value)}`);
      }
    }
    const label = labels.createSpan();
    label.createSpan({ cls: "is-long", text: name });
    label.createSpan({ cls: "is-short", text: name.slice(0, 1) });
    if (future) continue;
    const summary = parts.join(" \xB7 ");
    col.addEventListener("pointerenter", () => {
      card.addClass("is-reading");
      col.addClass("is-hot");
      label.addClass("is-hot");
      readout.setText(summary);
    });
    col.addEventListener("pointerleave", () => {
      card.removeClass("is-reading");
      col.removeClass("is-hot");
      label.removeClass("is-hot");
      readout.setText(t("view.dashboard.monthlyMeta", ctx.language));
    });
  }
}
function appendMonthlyTable(parent, model, ctx) {
  const table = parent.createEl("table", { cls: "atomic-dash-table" });
  const headRow = table.createEl("thead").createEl("tr");
  headRow.createEl("th", { text: t("view.dashboard.month", ctx.language) });
  for (const column of model.monthlyColumns) {
    headRow.createEl("th", { text: columnHeader(column, ctx) });
  }
  const body = table.createEl("tbody");
  for (let month = 0; month < 12; month++) {
    const row = body.createEl("tr");
    row.createEl("td", { text: monthLabel(month, ctx, model.year) });
    for (const column of model.monthlyColumns) {
      row.createEl("td", { text: columnCell(column, month) });
    }
  }
}
function renderDashboardMonthly(root, model, ctx) {
  if (!model.monthlyColumns.length) return;
  const { section, titleWrap } = appendSectionTitle(
    root,
    t("view.dashboard.monthly", ctx.language),
    t("view.dashboard.monthlyMeta", ctx.language)
  );
  const sessionColumns = model.monthlyColumns.filter((column) => column.kind === "sessions");
  const readout = sectionReadout(section);
  const card = section.createDiv({
    attr: { "data-testid": "atomic-dashboard-monthly" }
  });
  if (sessionColumns.length > 0 && readout) {
    appendChartLegend(titleWrap, sessionColumns, ctx);
    card.addClass("atomic-chart");
    appendMonthlyChart(card, sessionColumns, ctx, readout, model.year);
    const details = section.createEl("details", { cls: "atomic-quiet-toggle" });
    details.createEl("summary", { text: t("view.dashboard.showMonthlyTable", ctx.language) });
    appendMonthlyTable(details, model, ctx);
    return;
  }
  appendMonthlyTable(card, model, ctx);
}
function renderMuscles(parent, model, ctx) {
  if (!model.muscles) return;
  const { activity, rows } = model.muscles;
  const { section } = appendSectionTitle(
    parent,
    t("view.dashboard.muscles", ctx.language),
    t("view.dashboard.byVolumeSets", ctx.language)
  );
  const card = section.createDiv({
    cls: "atomic-stack",
    attr: { "data-testid": "atomic-dashboard-muscles" }
  });
  card.style.setProperty("--atomic-c", activity.colors[2]);
  if (!rows.length) {
    appendEmpty(card, t("view.dashboard.noSetData", ctx.language));
    return;
  }
  const peak = Math.max(1, ...rows.map((row) => row.volumeKg));
  for (const row of rows) {
    const name = row.muscle || t("view.dashboard.unknownMuscle", ctx.language);
    const line = card.createDiv({ cls: "atomic-fill-row" });
    line.style.setProperty("--v", (row.volumeKg / peak).toFixed(3));
    const label = line.createSpan({ attr: { title: name } });
    appendCatalogLabel(label, name);
    line.createSpan({
      cls: "atomic-fill-row-value",
      text: `${kg(row.volumeKg, ctx)} \xB7 ${formatCount(row.sets)}`
    });
  }
}
function feltClass(key) {
  switch (key) {
    case "good":
      return "";
    case "ok":
      return "is-ok";
    case "bad":
      return "is-bad";
    default: {
      const exhaustive = key;
      return exhaustive;
    }
  }
}
function appendFelt(parent, felt, ctx) {
  const total = FELT_ORDER.reduce((sum, key) => sum + felt[key], 0);
  const wrap = parent.createDiv({ cls: "atomic-felt" });
  const bar = wrap.createDiv({
    cls: "atomic-felt-bar",
    attr: { title: t("view.dashboard.feltTitle", ctx.language) }
  });
  const legend = wrap.createDiv({ cls: "atomic-legend atomic-hint" });
  for (const key of FELT_ORDER) {
    const seg = bar.createSpan({ cls: feltClass(key) });
    seg.style.setProperty("--v", total > 0 ? (felt[key] / total).toFixed(3) : "0");
    const item = legend.createSpan();
    item.createSpan({ cls: `atomic-dot ${feltClass(key)}`.trim() });
    appendCatalogLabel(item, t(FELT_LABEL_KEY[key], ctx.language));
    item.appendText(` ${felt[key]}`);
  }
}
function renderGolfFocus(parent, model, ctx) {
  if (!model.golfFocus) return;
  const { activity, sessions, tags } = model.golfFocus;
  const { section } = appendSectionTitle(
    parent,
    t("view.dashboard.golfFocus", ctx.language),
    t("view.dashboard.focusMeta", ctx.language, { count: formatCount(sessions) })
  );
  const card = section.createDiv({
    cls: "atomic-stack",
    attr: { "data-testid": "atomic-dashboard-golf-focus" }
  });
  card.style.setProperty("--atomic-c", activity.colors[2]);
  if (!tags.length) {
    appendEmpty(card, t("view.dashboard.noFocusTags", ctx.language));
  } else {
    for (const { tag, count } of tags) {
      const line = card.createDiv({ cls: "atomic-leader-row" });
      line.createSpan({ text: tag });
      line.createSpan({ cls: "atomic-leader" });
      line.createSpan({ cls: "atomic-leader-value", text: formatCount(count) });
    }
  }
  const golf = model.activities.find(
    (entry) => entry.domain === "exercise" && entry.activity.id === activity.id && entry.felt != null
  );
  if (golf?.felt) appendFelt(card, golf.felt, ctx);
}
function renderDashboardDetails(root, model, ctx) {
  if (!model.muscles && !model.golfFocus) return;
  const columns = root.createDiv({ cls: "atomic-split" });
  renderMuscles(columns, model, ctx);
  renderGolfFocus(columns, model, ctx);
}
function recentParts(row, ctx) {
  const extras = [];
  if (row.volumeKg != null && row.volumeKg > 0) extras.push(kg(row.volumeKg, ctx));
  if (row.felt) {
    extras.push(
      t("view.dashboard.feltSummary", ctx.language, {
        felt: t(FELT_LABEL_KEY[row.felt], ctx.language)
      })
    );
  }
  return {
    minutes: formatCount(row.minutes),
    extra: extras.join(" \xB7 ")
  };
}
function renderDashboardRecent(root, model, ctx) {
  if (!model.activities.some((card2) => card2.domain === "exercise")) return;
  const { section } = appendSectionTitle(
    root,
    t("view.dashboard.recentSessions", ctx.language),
    t("view.dashboard.recentMeta", ctx.language, { count: model.recent.length })
  );
  const card = section.createDiv({
    cls: "atomic-recent",
    attr: { "data-testid": "atomic-dashboard-recent" }
  });
  if (!model.recent.length) {
    appendEmpty(card, t("view.dashboard.noSessions", ctx.language));
    return;
  }
  for (const row of model.recent) {
    const line = card.createDiv({
      cls: "atomic-recent-row atomic-dash-recent-row",
      attr: {
        "data-testid": "atomic-dashboard-recent-row",
        "data-path": row.path,
        role: "link",
        tabindex: "0"
      }
    });
    line.setCssProps({ "--atomic-c": row.activity.colors[2] });
    const openNote = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void ctx.data.openPath(row.path);
    };
    line.addEventListener("click", openNote);
    line.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      openNote(event);
    });
    const parsed = parseYmd(row.date);
    line.createSpan({
      cls: "atomic-recent-date",
      text: parsed ? weekdayDateForLanguage(parsed.y, parsed.m, parsed.d, ctx.language) : row.date
    });
    const what = line.createSpan({ cls: "atomic-name" });
    what.createSpan({ cls: "atomic-dot" });
    appendPathLink(what, labelForLanguage(row.activity.label, ctx.language), row.path, ctx, "atomic-link");
    const parts = recentParts(row, ctx);
    const sum = line.createSpan({ cls: "atomic-recent-sum" });
    sum.createEl("strong", { text: parts.minutes });
    sum.appendText(" ");
    appendInlineCatalog(sum, t("view.dashboard.minuteWord", ctx.language));
    if (parts.extra) {
      sum.createSpan({ cls: "is-extra", text: ` \xB7 ${parts.extra}` });
    }
    line.createSpan({ cls: "atomic-recent-sub", text: parts.extra });
    line.createSpan({ cls: "atomic-recent-arrow", text: "\u2192" });
  }
}

// src/views/dashboard.ts
var renderGeneration = /* @__PURE__ */ new WeakMap();
var dashboardPaint = new PaintMemo(
  '[data-testid="atomic-dashboard"]',
  sameDashboardPaintState
);
function resolveDashboardYear(opts, frontmatterYear2, timezone) {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear: frontmatterYear2 });
}
async function collectDashboardInput(data, activityTypes, year) {
  const exercise = await Promise.all(
    exerciseActivities(activityTypes).map(async (activity) => {
      const sessions = await Promise.all(
        data.listSessions(activity.folder, year).map(async (meta) => ({
          meta,
          setRows: activity.supportsSetTable ? await data.getSessionSetRows(meta.path) : EMPTY_SET_ROWS
        }))
      );
      return { activity, sessions };
    })
  );
  const hobbies = await Promise.all(
    hobbyActivities(activityTypes).map(async (activity) => {
      const items = await Promise.all(
        data.listHobbyItems(activity).map(async (item) => ({
          path: item.path,
          frontmatter: item.frontmatter,
          entries: await data.getHobbyTimeLogEntries(item.path)
        }))
      );
      return { activity, items };
    })
  );
  return { year, exercise, hobbies };
}
function renderHeader(root, model, ctx, onYear) {
  const top = root.createDiv({ cls: "atomic-dash-top" });
  const switcher = top.createDiv({ cls: "atomic-stepper" });
  const yearButton = (label, key, testId, target) => {
    const button = switcher.createEl("button", {
      text: label,
      cls: "atomic-btn is-icon",
      attr: { "aria-label": t(key, ctx.language), "data-testid": testId, type: "button" }
    });
    button.addEventListener("click", () => onYear(target));
  };
  yearButton("\u2039", "view.dashboard.prevYear", "atomic-dashboard-year-prev", model.year - 1);
  switcher.createSpan({ cls: "atomic-stepper-value", text: String(model.year) });
  yearButton("\u203A", "view.dashboard.nextYear", "atomic-dashboard-year-next", model.year + 1);
  const range = top.createDiv({ cls: "atomic-readout atomic-dash-range" });
  if (model.firstDate && model.lastDate) {
    appendCatalogLabel(
      range,
      t("view.dashboard.range", ctx.language, {
        from: shortDate(model.firstDate, ctx),
        to: shortDate(model.lastDate, ctx)
      })
    );
    range.appendText(" \xB7 ");
  }
  appendCatalogLabel(
    range,
    t("view.dashboard.sessionsCount", ctx.language, { count: formatCount(model.totalSessions) })
  );
  const links = top.createDiv({ cls: "atomic-jumps" });
  for (const card of model.activities) {
    for (const link of activityLinks(card, ctx)) {
      appendActivityLink(links, link, "atomic-link");
    }
  }
}
function appendKpiCard(grid, id, label) {
  const card = grid.createDiv({
    cls: "atomic-kpi",
    attr: { "data-testid": "atomic-dashboard-kpi", "data-kpi": id }
  });
  const caption = card.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, label);
  const value = card.createDiv({ cls: "atomic-kpi-value atomic-dash-kpi-value" });
  const hint = card.createDiv({ cls: "atomic-hint" });
  return { value, hint };
}
function appendHoursMinutes(target, totalMinutes, ctx, tight) {
  const { hours, minutes } = splitHoursMinutes(totalMinutes);
  const unit = tight ? "atomic-unit is-tight" : "atomic-unit";
  target.appendText(formatCount(hours));
  target.createSpan({
    cls: unit,
    text: t("view.dashboard.hourUnitShort", ctx.language)
  });
  target.appendText(String(minutes).padStart(2, "0"));
  target.createSpan({
    cls: unit,
    text: t("view.dashboard.minuteUnitShort", ctx.language)
  });
}
function splitText(cards, language, pick) {
  return cards.map((card) => `${labelForLanguage(card.activity.label, language)} ${formatCount(pick(card))}`).join(" \xB7 ");
}
function renderKpis(root, model, ctx) {
  const grid = root.createDiv({ cls: "atomic-kpis" });
  const exercise = model.activities.filter(
    (card) => card.domain === "exercise"
  );
  const hobbies = model.activities.filter(
    (card) => card.domain === "hobby"
  );
  if (exercise.length) {
    const sessions = appendKpiCard(grid, "sessions", t("view.dashboard.kpiSessions", ctx.language));
    sessions.value.setText(formatCount(model.totalSessions));
    appendCatalogLabel(sessions.hint, splitText(exercise, ctx.language, (card) => card.count));
    const time = appendKpiCard(grid, "exercise-time", t("view.dashboard.kpiExerciseTime", ctx.language));
    appendHoursMinutes(time.value, model.totalExerciseMinutes, ctx, false);
    time.hint.createSpan({
      text: t("view.dashboard.avgPerSession", ctx.language, {
        minutes: formatCount(model.totalExerciseMinutes),
        avg: averagePerSession(model.totalExerciseMinutes, model.totalSessions)
      })
    });
  }
  if (model.totalVolumeKg != null) {
    const volume = appendKpiCard(grid, "volume", t("view.dashboard.kpiVolume", ctx.language));
    volume.value.appendText(formatKg(model.totalVolumeKg));
    volume.value.createSpan({
      cls: "atomic-unit",
      text: t("view.dashboard.kgUnit", ctx.language)
    });
    const setTableLabels = exercise.filter((card) => card.volumeKg != null).map((card) => labelForLanguage(card.activity.label, ctx.language)).join(" \xB7 ");
    appendCatalogLabel(
      volume.hint,
      `${t("view.dashboard.setTableRows", ctx.language)} \xB7 ${setTableLabels}`
    );
  }
  if (model.totalHabitMinutes != null) {
    const habit = appendKpiCard(grid, "habit-time", t("view.dashboard.kpiHabitTime", ctx.language));
    appendHoursMinutes(habit.value, model.totalHabitMinutes, ctx, false);
    appendCatalogLabel(
      habit.hint,
      `${splitText(hobbies, ctx.language, (card) => card.minutes)} ${t("view.dashboard.unitMinutes", ctx.language)}`
    );
  }
}
function appendStat(parent, value, unit) {
  parent.appendText(value);
  parent.createSpan({ cls: "atomic-unit", text: unit });
}
function appendDetail(parent, value, unit) {
  parent.createEl("strong", { text: value });
  parent.appendText(" ");
  appendCatalogLabel(parent, unit);
}
function renderLedgerHead(ledger, ctx) {
  const head = ledger.createDiv({ cls: "atomic-ledger-head" });
  head.createSpan({ attr: { "aria-hidden": "true" } });
  for (const key of [
    "view.dashboard.colCount",
    "view.dashboard.colTime",
    "view.dashboard.colDetail"
  ]) {
    const cell = head.createDiv({ cls: "atomic-caption" });
    appendCatalogLabel(cell, t(key, ctx.language));
  }
  appendMonthInitials(head, ctx);
  const last = head.createDiv({ cls: "atomic-caption atomic-ledger-end" });
  appendCatalogLabel(last, t("view.dashboard.colLast", ctx.language));
}
function appendLastSession(row, card, ctx) {
  const end = row.createDiv({ cls: "atomic-ledger-end" });
  const date = card.lastDate;
  const path = card.lastPath;
  if (!date || !path) return;
  const link = end.createEl("a", {
    cls: "atomic-link",
    attr: {
      href: "#",
      "data-testid": "atomic-dashboard-last",
      "data-path": path
    }
  });
  link.appendText(shortDate(date, ctx));
  link.createSpan({ cls: "atomic-link-arrow", text: "\u2192" });
  link.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void ctx.data.openPath(path);
  });
}
function renderExerciseRow(row, data, ctx) {
  const count = row.createDiv({ cls: "atomic-ledger-count atomic-stat" });
  appendStat(count, formatCount(data.count), t("view.dashboard.unitSessions", ctx.language));
  const time = row.createDiv({ cls: "atomic-ledger-time atomic-stat" });
  appendHoursMinutes(time, data.minutes, ctx, true);
  const detail = row.createDiv({ cls: "atomic-ledger-detail" });
  if (data.volumeKg != null) {
    appendDetail(detail, formatCompactKg(data.volumeKg), t("view.dashboard.kgLifted", ctx.language));
  } else if (data.felt) {
    appendDetail(detail, formatCount(data.felt.good), t("view.dashboard.feltGoodCount", ctx.language));
  }
  const bars = row.createDiv({ cls: "atomic-ledger-bars" });
  bars.style.setProperty("--atomic-c", data.activity.colors[2]);
  appendMonthBars(
    bars,
    data.monthlyMinutes,
    data.activity.colors[2],
    t("view.dashboard.barsHours", ctx.language),
    ctx
  );
  appendLastSession(row, data, ctx);
}
function renderHobbyRow(row, data, ctx) {
  const count = row.createDiv({ cls: "atomic-ledger-count atomic-stat" });
  appendStat(count, formatCount(data.count), t("view.dashboard.unitItems", ctx.language));
  const time = row.createDiv({ cls: "atomic-ledger-time atomic-stat" });
  appendHoursMinutes(time, data.minutes, ctx, true);
  const detail = row.createDiv({ cls: "atomic-ledger-detail" });
  const detailKey = data.activity.id === "reading" ? "view.dashboard.readingNow" : "view.dashboard.inProgress";
  appendDetail(detail, formatCount(data.inProgress), t(detailKey, ctx.language));
  const bars = row.createDiv({ cls: "atomic-ledger-bars" });
  bars.style.setProperty("--atomic-c", data.activity.colors[2]);
  appendMonthBars(
    bars,
    data.monthlyMinutes,
    data.activity.colors[2],
    t("view.dashboard.barsHours", ctx.language),
    ctx
  );
  appendLastSession(row, data, ctx);
}
function renderActivityRow(grid, card, ctx) {
  const { activity } = card;
  const row = grid.createDiv({
    cls: "atomic-ledger-row",
    attr: {
      "data-testid": "atomic-dashboard-activity",
      "data-activity": activity.id,
      "data-count": String(card.count)
    }
  });
  row.style.setProperty("--atomic-c", activity.colors[2]);
  const name = row.createDiv({ cls: "atomic-ledger-name" });
  const title = name.createSpan({ cls: "atomic-name" });
  title.createSpan({ cls: "atomic-dot" });
  const shown = ledgerActivityName(activity.label);
  const label = title.createSpan();
  label.appendText(shown.name);
  if (shown.zh) {
    label.createSpan({
      cls: "atomic-inline-zh",
      text: shown.zh,
      attr: { lang: "zh-Hant-HK" }
    });
  }
  const kind = name.createDiv({ cls: "atomic-caption" });
  switch (card.domain) {
    case "exercise":
      appendCatalogLabel(kind, t("view.dashboard.domainExercise", ctx.language));
      renderExerciseRow(row, card, ctx);
      break;
    case "hobby":
      appendCatalogLabel(kind, t("view.dashboard.domainHabit", ctx.language));
      renderHobbyRow(row, card, ctx);
      break;
    default: {
      const exhaustive = card;
      return exhaustive;
    }
  }
}
function renderActivities(root, model, ctx) {
  if (!model.activities.length) return;
  const { section } = appendSectionTitle(
    root,
    t("view.dashboard.activities", ctx.language),
    t("view.dashboard.activitiesMeta", ctx.language)
  );
  section.setAttr("data-testid", "atomic-dashboard-activities");
  const ledger = section.createDiv({ cls: "atomic-ledger" });
  renderLedgerHead(ledger, ctx);
  for (const card of model.activities) renderActivityRow(ledger, card, ctx);
}
async function renderDashboard(el, data, activityTypes, year, language, timezone) {
  const generation = (renderGeneration.get(el) ?? 0) + 1;
  renderGeneration.set(el, generation);
  const input = await collectDashboardInput(data, activityTypes, year);
  if (renderGeneration.get(el) !== generation) return;
  if (dashboardPaint.shouldSkip(el, dashboardPaintState(input, language))) return;
  const model = buildDashboardModel(input);
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-dashboard",
    attr: { "data-testid": "atomic-dashboard", "data-year": String(year) }
  });
  const ctx = { data, language, timezone, year };
  const onYear = (nextYear) => {
    void renderDashboard(el, data, activityTypes, nextYear, language, timezone);
  };
  renderHeader(root, model, ctx, onYear);
  renderKpis(root, model, ctx);
  renderActivities(root, model, ctx);
  renderDashboardMonthly(root, model, ctx);
  renderDashboardDetails(root, model, ctx);
  renderDashboardRecent(root, model, ctx);
}

// src/util/book-shelf-layout.ts
var DEFAULT_BOOK_WIDTH_PX = 96;
var DEFAULT_BOOK_HEIGHT_PX = 150;
var MIN_BOOK_WIDTH_PX = 56;
var BOOK_GAP_PX = 12;
var ROW_PADDING_PX = 28;
var MIN_BOOKS_PER_ROW = 3;
var DEFAULT_BOOK_SHELF_SCALE = 1;
var MIN_BOOK_SHELF_SCALE = 0.25;
var MAX_BOOK_SHELF_SCALE = 4;
function resolveBookShelfScale(opts) {
  const raw = typeof opts === "string" || opts == null ? opts : opts.scale ?? opts.ratio;
  if (!raw) return DEFAULT_BOOK_SHELF_SCALE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BOOK_SHELF_SCALE;
  return Math.min(MAX_BOOK_SHELF_SCALE, Math.max(MIN_BOOK_SHELF_SCALE, n));
}
function scaledBookSize(scale) {
  const ratio = resolveBookShelfScale(String(scale));
  return {
    maxWidth: Math.max(1, Math.round(DEFAULT_BOOK_WIDTH_PX * ratio)),
    minWidth: Math.max(1, Math.round(MIN_BOOK_WIDTH_PX * ratio))
  };
}
function bookHeightForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_BOOK_HEIGHT_PX;
  return Math.round(width * DEFAULT_BOOK_HEIGHT_PX / DEFAULT_BOOK_WIDTH_PX);
}
function bookWidthForContainer(containerWidth, gap = BOOK_GAP_PX, padding = ROW_PADDING_PX, _minWidth = MIN_BOOK_WIDTH_PX, maxWidth = DEFAULT_BOOK_WIDTH_PX) {
  const preferred = Math.max(1, maxWidth);
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return preferred;
  const available = Math.max(0, containerWidth - padding);
  const gaps = (MIN_BOOKS_PER_ROW - 1) * gap;
  const fitThree = (available - gaps) / MIN_BOOKS_PER_ROW;
  if (!Number.isFinite(fitThree) || fitThree >= preferred) return preferred;
  return Math.max(1, Math.floor(fitThree));
}
function booksPerRow(containerWidth, bookWidth = DEFAULT_BOOK_WIDTH_PX, gap = BOOK_GAP_PX, padding = ROW_PADDING_PX) {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return MIN_BOOKS_PER_ROW;
  }
  const available = Math.max(0, containerWidth - padding);
  const fitted = Math.floor((available + gap) / (bookWidth + gap));
  return Math.max(MIN_BOOKS_PER_ROW, fitted);
}
function chunkItems(items, size) {
  const rowSize = Math.max(1, Math.floor(size));
  if (!items.length) return [[]];
  const rows = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}

// src/util/element-width.ts
function measureElementWidth(el, fallbackWidth = 0) {
  let node = el;
  while (node) {
    const client = node.clientWidth;
    if (Number.isFinite(client) && client > 0) return client;
    const rectWidth = node.getBoundingClientRect?.().width;
    if (Number.isFinite(rectWidth) && (rectWidth ?? 0) > 0) return rectWidth ?? 0;
    node = node.parentElement;
  }
  return Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : 0;
}

// src/views/book-shelf.ts
function sameBookShelfItem(left, right) {
  if (left === right) return true;
  return left.path === right.path && left.title === right.title && sameList(left.authors, right.authors) && left.status === right.status && left.spineColor === right.spineColor && left.cover === right.cover && left.description === right.description;
}
function sameBookShelfPaintState(previous, next) {
  if (!previous) return false;
  return sameList(previous.items, next.items, sameBookShelfItem) && previous.activityId === next.activityId && previous.hasActivity === next.hasActivity && previous.scale === next.scale && previous.language === next.language && sameList(previous.statuses, next.statuses) && sameList(previous.invalidStatuses, next.invalidStatuses);
}
var resizeObservers = /* @__PURE__ */ new WeakMap();
var windowListeners = /* @__PURE__ */ new WeakMap();
var bookShelfPaint = new PaintMemo(
  '[data-testid="atomic-bookshelf"]',
  sameBookShelfPaintState
);
var layoutFrames = /* @__PURE__ */ new WeakMap();
var EMPTY_HOBBY_FILES = [];
function cancelBookShelfLayout(el) {
  const frame = layoutFrames.get(el);
  if (frame == null) return;
  window.cancelAnimationFrame(frame);
  layoutFrames.delete(el);
}
function requestBookShelfLayout(el, layout) {
  if (layoutFrames.has(el)) return;
  const frame = window.requestAnimationFrame(() => {
    layoutFrames.delete(el);
    layout();
  });
  layoutFrames.set(el, frame);
}
function setOverflowVisible(el) {
  el.setCssStyles({ overflow: "visible" });
}
function shouldUnclipBookShelfAncestor(className) {
  return className.split(/\s+/).some((token) => {
    const t2 = token.toLowerCase();
    return t2.includes("code-block") || t2.includes("codeblock") || t2 === "cm-embed-block" || t2.includes("internal-embed");
  });
}
function isBookShelfUnclipStop(className) {
  const t2 = className.toLowerCase();
  return t2.includes("markdown-preview-view") || t2.includes("markdown-source-view") || t2.includes("cm-scroller") || t2.includes("workspace-leaf");
}
function unclipBookShelfAncestors(el, maxDepth = 8) {
  let current = el;
  let depth = 0;
  let reachedKnownWrapper = false;
  while (current && depth < maxDepth) {
    const className = current.className ?? "";
    if (isBookShelfUnclipStop(className)) break;
    const knownWrapper = shouldUnclipBookShelfAncestor(className);
    if (depth === 0 || !reachedKnownWrapper || knownWrapper) {
      setOverflowVisible(current);
    }
    if (knownWrapper) reachedKnownWrapper = true;
    current = current.parentElement;
    depth += 1;
  }
}
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function asStringList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}
function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value);
}
function shelfColorFor(item) {
  const explicit = asString(item.spine_color);
  if (isValidHexColor(explicit)) return explicit;
  const source = `${item.title}
${item.path}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = hash * 31 + source.charCodeAt(index) >>> 0;
  }
  const color = hash & 16777215 | 3158064;
  return `#${color.toString(16).padStart(6, "0").slice(-6)}`;
}
function buildBookShelfItems(files, activityId = "reading", statusFilter = null) {
  return files.filter(
    (file) => file.frontmatter.type === "atomic-item" && file.frontmatter.activity === activityId
  ).map((file) => {
    const title = asString(file.frontmatter.title) || file.basename;
    const status = asString(file.frontmatter.status) || DEFAULT_READING_STATUS;
    const cover = asString(file.frontmatter.cover);
    const description = asString(file.frontmatter.description);
    return {
      path: file.path,
      title,
      authors: asStringList(file.frontmatter.authors),
      status,
      spineColor: shelfColorFor({
        title,
        path: file.path,
        spine_color: asString(file.frontmatter.spine_color)
      }),
      ...cover ? { cover } : {},
      ...description ? { description } : {}
    };
  }).filter((item) => matchesBookShelfStatus(item.status, statusFilter)).sort(
    (a, b) => statusRank(a.status) - statusRank(b.status) || a.title.localeCompare(b.title) || a.path.localeCompare(b.path)
  );
}
var SAFE_REMOTE_COVER = /^(https?:\/\/|app:\/\/)/i;
var SAFE_RASTER_DATA_COVER = /^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i;
function parseCoverRef(raw) {
  const value = raw.trim();
  if (!value) return { kind: "none" };
  if (/^(javascript|vbscript|data):/i.test(value)) {
    if (SAFE_RASTER_DATA_COVER.test(value)) return { kind: "url", src: value };
    return { kind: "none" };
  }
  if (SAFE_REMOTE_COVER.test(value)) {
    return { kind: "url", src: value };
  }
  let path = value;
  const wiki = value.match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
  if (wiki) path = wiki[1].trim();
  path = path.replace(/^\.\//, "").trim();
  if (!path) return { kind: "none" };
  return { kind: "vault", path };
}
function resolveCoverSrc(cover, data, sourcePath) {
  const ref = parseCoverRef(cover ?? "");
  if (ref.kind === "none") return null;
  if (ref.kind === "url") return ref.src;
  return data.resolveResourcePath(ref.path, sourcePath);
}
var COVER_OPEN_CLASS = "is-cover-open";
function hoverFinePointer(media) {
  return Boolean(media?.matches);
}
function bookClickOpensNote(options) {
  if (options.coverOpen) return true;
  return Boolean(options.hoverFine && options.reducedMotion);
}
function hoverFineMedia() {
  if (typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(hover: hover) and (pointer: fine), (pointer: none)");
}
function prefersReducedMotion2() {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function closeOpenCovers(root) {
  root.querySelectorAll(`.atomic-book.${COVER_OPEN_CLASS}`).forEach((el) => {
    el.classList.remove(COVER_OPEN_CLASS);
  });
}
function shelfSummary(items, language) {
  const reading = items.filter((item) => item.status === "reading").length;
  const finished = items.filter((item) => item.status === "finished").length;
  return t("view.bookShelf.summary", language, {
    count: items.length,
    reading,
    finished
  });
}
function showBookReadout(readout, item, language, mode, hoverFine = false) {
  readout.empty();
  readout.createSpan({ cls: "atomic-shelf-readout-title", text: item.title });
  const meta = [item.authors[0] || item.status, item.status].filter(Boolean);
  readout.createSpan({ cls: "atomic-shelf-readout-meta", text: meta.join(" \xB7 ") });
  const again = mode === "again";
  const hint = readout.createDiv({ cls: again ? "atomic-readout is-live" : "atomic-readout" });
  const key = !again ? "view.bookShelf.clickToOpen" : hoverFine ? "view.bookShelf.clickAgain" : "view.bookShelf.tapAgain";
  hint.setText(t(key, language));
}
function titleLengthClass(title) {
  const length = title.trim().length;
  if (length > 36) return "is-title-xs";
  if (length > 22) return "is-title-sm";
  return "";
}
function createBook(parent, item, data, language, ribbonColor, readout) {
  const button = parent.createEl("button", {
    cls: "atomic-book",
    attr: {
      type: "button",
      "data-testid": "atomic-book",
      "data-title": item.title,
      "data-status": item.status,
      "data-path": item.path
    }
  });
  button.style.setProperty("--atomic-book-color", item.spineColor);
  const titleClass = titleLengthClass(item.title);
  const pages = button.createDiv({ cls: "atomic-book-pages" });
  pages.createDiv({
    cls: ["atomic-book-pages-title", titleClass].filter(Boolean).join(" "),
    text: item.title
  });
  const author = item.authors[0];
  if (author) pages.createDiv({ cls: "atomic-book-pages-meta", text: author });
  const face = button.createDiv({ cls: "atomic-book-face" });
  const coverSrc = resolveCoverSrc(item.cover, data, item.path);
  if (coverSrc) {
    face.createEl("img", {
      cls: "atomic-book-cover",
      attr: { src: coverSrc, alt: "", draggable: "false" }
    });
  } else {
    face.createDiv({
      cls: ["atomic-book-cover", "atomic-book-cover-title", titleClass].filter(Boolean).join(" "),
      text: item.title
    });
  }
  if (item.status === "reading") {
    const ribbon = button.createSpan({ cls: "atomic-book-ribbon" });
    ribbon.style.setProperty("--atomic-c", ribbonColor);
  }
  button.addEventListener("pointermove", (event) => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    const rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    button.style.setProperty("--px", px.toFixed(3));
    button.style.setProperty("--py", py.toFixed(3));
    button.style.setProperty("--sx", `${Math.round((event.clientX - rect.left) / rect.width * 100)}%`);
    button.style.setProperty("--sy", `${Math.round((event.clientY - rect.top) / rect.height * 100)}%`);
  });
  button.addEventListener("pointerenter", () => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    showBookReadout(readout, item, language, "preview");
  });
  button.addEventListener("pointerleave", () => {
    if (!hoverFinePointer(hoverFineMedia())) return;
    button.classList.remove(COVER_OPEN_CLASS);
    const summary = readout.dataset.shelfSummary;
    if (summary) readout.setText(summary);
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hoverFine = hoverFinePointer(hoverFineMedia());
    const coverOpen = button.classList.contains(COVER_OPEN_CLASS);
    if (!bookClickOpensNote({
      hoverFine,
      coverOpen,
      reducedMotion: prefersReducedMotion2()
    })) {
      const shelf = parent.closest(".atomic-book-shelf") ?? parent;
      closeOpenCovers(shelf);
      button.classList.add(COVER_OPEN_CLASS);
      showBookReadout(readout, item, language, "again", hoverFine);
      return;
    }
    button.classList.remove(COVER_OPEN_CLASS);
    void data.openPath(item.path);
  });
}
function paintRows(frame, items, perRow, data, language, emptyText, ribbonColor, readout) {
  frame.empty();
  readout.dataset.shelfSummary = shelfSummary(items, language);
  const rows = items.length ? chunkItems(items, perRow) : [[]];
  for (const rowItems of rows) {
    const scroll = frame.createDiv({
      cls: "atomic-book-row-books atomic-shelf-scroll atomic-scrollport",
      attr: { "data-testid": "atomic-bookshelf-scroll" }
    });
    const row = scroll.createDiv({ cls: "atomic-book-shelf-row atomic-shelf-row" });
    if (!rowItems.length) {
      row.createDiv({
        cls: "atomic-book-empty",
        text: emptyText
      });
    } else {
      for (const item of rowItems) {
        createBook(row, item, data, language, ribbonColor, readout);
      }
    }
    scroll.createDiv({ cls: "atomic-book-shelf-plank atomic-plank" });
  }
  readout.setText(shelfSummary(items, language));
}
function applyBookSize(frame, bookWidth) {
  const height = bookHeightForWidth(bookWidth);
  frame.style.setProperty("--atomic-book-width", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-height", `${height}px`);
  frame.style.setProperty("--atomic-book-w", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-h", `${height}px`);
}
function renderBookShelf(el, data, activityTypes, options, language) {
  const scale = resolveBookShelfScale(options);
  const { maxWidth, minWidth } = scaledBookSize(scale);
  const activityId = options.activity?.trim() || "reading";
  const activity = hobbyActivities(activityTypes).find(
    (candidate) => candidate.id === activityId
  );
  const { statuses, invalidStatuses } = resolveBookShelfStatuses(options.status);
  const files = activity ? data.listHobbyItems(activity) : EMPTY_HOBBY_FILES;
  const items = activity ? buildBookShelfItems(files, activityId, statuses) : [];
  const paintState = {
    items,
    activityId,
    hasActivity: Boolean(activity),
    scale,
    language,
    statuses,
    invalidStatuses
  };
  if (bookShelfPaint.shouldSkip(el, paintState)) return;
  resizeObservers.get(el)?.disconnect();
  resizeObservers.delete(el);
  const previousWindowListener = windowListeners.get(el);
  if (previousWindowListener) {
    window.removeEventListener("resize", previousWindowListener);
    windowListeners.delete(el);
  }
  cancelBookShelfLayout(el);
  el.empty();
  unclipBookShelfAncestors(el);
  const root = el.createDiv({
    cls: "fitness-plugin atomic-book-shelf atomic-shelf",
    attr: {
      "data-testid": "atomic-bookshelf",
      "data-scale": String(scale)
    }
  });
  if (!activity) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.noActivity", language, { activity: activityId })
    });
    return;
  }
  if (invalidStatuses.length > 0) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.invalidStatuses", language, {
        statuses: invalidStatuses.join(", ")
      })
    });
  }
  const emptyText = statuses && statuses.length > 0 ? t("view.bookShelf.emptyFiltered", language, {
    statuses: statuses.join(", ")
  }) : t("view.bookShelf.empty", language);
  const frame = root.createDiv({ cls: "atomic-book-shelf-frame" });
  const readout = root.createDiv({ cls: "atomic-shelf-readout" });
  readout.setText(shelfSummary(items, language));
  const ribbonColor = activity.colors[2];
  let lastKey = "";
  const layout = () => {
    const fallback = typeof window !== "undefined" && Number.isFinite(window.innerWidth) ? window.innerWidth : DEFAULT_BOOK_WIDTH_PX * 3 + BOOK_GAP_PX * 2 + ROW_PADDING_PX;
    const width = measureElementWidth(frame, fallback);
    const bookWidth = bookWidthForContainer(
      width,
      BOOK_GAP_PX,
      ROW_PADDING_PX,
      minWidth,
      maxWidth
    );
    const perRow = booksPerRow(width, bookWidth);
    const key = `${bookWidth}:${perRow}`;
    if (key === lastKey && frame.childElementCount > 0) return;
    lastKey = key;
    applyBookSize(frame, bookWidth);
    paintRows(frame, items, perRow, data, language, emptyText, ribbonColor, readout);
  };
  layout();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(layout);
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      requestBookShelfLayout(el, layout);
    });
    observer.observe(frame);
    resizeObservers.set(el, observer);
    return;
  }
  const onWindowResize = () => {
    if (!el.isConnected) {
      window.removeEventListener("resize", onWindowResize);
      windowListeners.delete(el);
      return;
    }
    requestBookShelfLayout(el, layout);
  };
  window.addEventListener("resize", onWindowResize);
  windowListeners.set(el, onWindowResize);
}

// src/util/heatmap-activities.ts
function enabledActivities(activityTypes) {
  return [...exerciseActivities(activityTypes), ...hobbyActivities(activityTypes)];
}
function parseActivityTokens(activityOption) {
  if (activityOption == null) return ["all"];
  return activityOption.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
}
function resolveHeatmapActivities(activityTypes, activityOption) {
  const enabled = enabledActivities(activityTypes);
  const tokens = parseActivityTokens(activityOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { activities: enabled, invalidIds: [] };
  }
  const byId = new Map(
    activityTypes.map((activity) => [activity.id.toLowerCase(), activity])
  );
  const activities = [];
  const invalidIds = [];
  const seen = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const activity = byId.get(key);
    if (!activity || activity.enabled === false) {
      invalidIds.push(token);
      continue;
    }
    const isRenderable = activity.domain === "exercise" && activity.noteModel === "dailySession" || activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer;
    if (!isRenderable) {
      invalidIds.push(token);
      continue;
    }
    activities.push(activity);
  }
  return { activities, invalidIds };
}

// src/util/heatmap-day-labels.ts
function heatmapWeekdayLabels(language) {
  switch (language) {
    case "en":
      return ["S", "M", "T", "W", "T", "F", "S"];
    case "zh-Hant-en":
      return ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
    default: {
      const exhaustive = language;
      return exhaustive;
    }
  }
}

// src/util/heatmap-layout.ts
var DEFAULT_ROWS = 1;
var DEFAULT_COLUMNS = 1;
var DEFAULT_MIN_COLUMN_WIDTH = 300;
var DEFAULT_DEFAULT_SPAN = 1.2;
var HEATMAP_GRID_GAP_PX = 40;
function parsePositiveNumber(value, defaultValue) {
  if (!value) return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return n;
}
function parsePositiveInt(value, defaultValue) {
  const n = parsePositiveNumber(value, defaultValue);
  return Math.max(1, Math.floor(n));
}
function resolveHeatmapLayout(opts) {
  return {
    rows: parsePositiveInt(opts.rows, DEFAULT_ROWS),
    columns: parsePositiveInt(opts.columns, DEFAULT_COLUMNS),
    minColumnWidth: parsePositiveInt(
      opts["min-column-width"],
      DEFAULT_MIN_COLUMN_WIDTH
    ),
    defaultSpan: parsePositiveNumber(
      opts["default-span"],
      DEFAULT_DEFAULT_SPAN
    )
  };
}
function effectiveHeatmapColumns(params) {
  const {
    columns,
    minColumnWidth,
    containerWidth,
    activityCount,
    gridGap = HEATMAP_GRID_GAP_PX
  } = params;
  if (activityCount <= 0) return 1;
  const widthBased = Math.max(
    1,
    Math.floor((containerWidth + gridGap) / (minColumnWidth + gridGap))
  );
  return Math.min(columns, activityCount, widthBased);
}

// src/util/heatmap-model.ts
function formatHeatmapTooltip(template, date, minutes) {
  return template.split("{date}").join(date).split("{minutes}").join(String(minutes));
}
function heatmapLayoutKey(layout) {
  return `${layout.rows}:${layout.columns}:${layout.minColumnWidth}:${layout.defaultSpan}`;
}
function heatmapActivityKey(activities) {
  return activities.map(activityPaintKey).join("|");
}
function sameDurationMap(left, right) {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const [date, entry] of left) {
    const other = right.get(date);
    if (!other || other.minutes !== entry.minutes || other.path !== entry.path) {
      return false;
    }
  }
  return true;
}
function sameHeatmapPaintState(previous, next) {
  if (!previous) return false;
  return previous.year === next.year && previous.timezone === next.timezone && previous.language === next.language && previous.layoutKey === next.layoutKey && previous.activityKey === next.activityKey && sameList(previous.invalidIds, next.invalidIds) && sameList(previous.maps, next.maps, sameDurationMap);
}
function buildHeatmapWeeks(params) {
  const { year, todayStr, language, activityMap } = params;
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const daysToSubtract = weekdaySun0(start.y, start.m, start.d);
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);
  const weeks = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd) break;
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = formatYmd(cursor.y, cursor.m, cursor.d);
      const entry = activityMap.get(dateStr);
      const minutes = entry ? entry.minutes : 0;
      week.push({
        date: dateStr,
        minutes,
        level: durationToLevel(minutes),
        path: entry?.path ?? null,
        fullDate: fullDateForLanguage(cursor.y, cursor.m, cursor.d, language),
        isCurrentYear: cursor.y === year,
        isToday: dateStr === todayStr,
        isFuture: cursor.y === year && dateStr > todayStr,
        y: cursor.y,
        m: cursor.m,
        d: cursor.d
      });
      cursor = addDays(cursor.y, cursor.m, cursor.d, 1);
    }
    weeks.push(week);
    weekCount++;
  }
  return weeks;
}
function heatmapMonthPlacements(weeks, language) {
  const placements = [];
  const seen = /* @__PURE__ */ new Set();
  let index = 0;
  for (const week of weeks) {
    for (const day of week) {
      if (day.isCurrentYear && !seen.has(day.m)) {
        seen.add(day.m);
        placements.push({
          month: day.m,
          text: monthShortForLanguage(day.y, day.m, day.d, language),
          week: Math.floor(index / 7) + 1
        });
      }
      index += 1;
    }
  }
  return placements;
}
function appendHeatmapWeeks(parent, weeks, colors, tooltip, tooltipOpen) {
  void colors;
  for (const week of weeks) {
    for (const day of week) {
      const attr = {
        "data-minutes": String(day.minutes),
        "data-date": day.fullDate,
        "data-ymd": day.date,
        title: formatHeatmapTooltip(
          day.path ? tooltipOpen : tooltip,
          day.fullDate,
          day.minutes
        )
      };
      if (day.isToday) attr["data-testid"] = "atomic-heatmap-today";
      if (day.path && day.isCurrentYear && !day.isFuture) attr["data-path"] = day.path;
      if (day.isCurrentYear && !day.isFuture) attr["data-l"] = String(day.level);
      parent.createDiv({ cls: cellClass(day), attr });
    }
  }
}
function cellClass(day) {
  if (!day.isCurrentYear) return "atomic-heat-cell is-pad";
  const parts = ["atomic-heat-cell"];
  if (day.isToday) parts.push("is-today");
  if (day.isFuture) parts.push("is-future");
  if (day.path && !day.isFuture) parts.push("is-link");
  return parts.join(" ");
}

// src/util/heatmap-metrics.ts
var HEATMAP_CELL_PX = 10;
var HEATMAP_GAP_PX = 3;
var HEATMAP_PITCH_PX = HEATMAP_CELL_PX + HEATMAP_GAP_PX;
var HEATMAP_TODAY_RING_PX = 4;

// src/util/heatmap-scroll.ts
function heatmapRevealOffsets(todayColumn, monthColumns) {
  return {
    todayLeft: todayColumn * HEATMAP_PITCH_PX,
    todayWidth: HEATMAP_CELL_PX,
    pitch: HEATMAP_PITCH_PX,
    monthStarts: monthColumns.map((column) => column * HEATMAP_PITCH_PX)
  };
}
function scrollLeftToRevealToday(params) {
  const { scrollWidth, clientWidth, todayLeft, todayWidth, pitch, monthStarts } = params;
  if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth) || !Number.isFinite(todayLeft) || !Number.isFinite(todayWidth) || !Number.isFinite(pitch) || scrollWidth < 0 || clientWidth < 0 || pitch < 0) {
    return 0;
  }
  if (scrollWidth <= clientWidth) return 0;
  const minLeft = todayLeft + todayWidth + HEATMAP_TODAY_RING_PX + 2 * pitch - clientWidth;
  const start = monthStarts.find((value) => Number.isFinite(value) && value >= minLeft);
  const desired = start ?? minLeft;
  const maxScrollLeft = scrollWidth - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}

// src/views/heatmap.ts
var heatmapObserverRegistry = /* @__PURE__ */ new WeakMap();
var heatmapPaint = new PaintMemo(
  '[data-testid="atomic-heatmap"], [data-testid="atomic-heatmap-empty"], [data-testid="atomic-heatmap-invalid"]',
  sameHeatmapPaintState
);
function cleanupHeatmapObservers(container) {
  const registry = heatmapObserverRegistry.get(container);
  if (!registry) return;
  for (const observer of registry.scrolls) observer.disconnect();
  registry.grid?.disconnect();
  heatmapObserverRegistry.delete(container);
}
function wireHeatmapScroll(scrollEl, registry, todayColumn, monthColumns) {
  let userHasScrolled = false;
  let expectedScrollLeft = null;
  const offsets = heatmapRevealOffsets(todayColumn, monthColumns);
  const applyTodayAlign = () => {
    if (todayColumn < 0) return;
    const nextScrollLeft = scrollLeftToRevealToday({
      scrollWidth: scrollEl.scrollWidth,
      clientWidth: scrollEl.clientWidth,
      ...offsets
    });
    expectedScrollLeft = nextScrollLeft;
    scrollEl.scrollLeft = nextScrollLeft;
  };
  scrollEl.addEventListener(
    "scroll",
    () => {
      if (expectedScrollLeft !== null && Math.abs(scrollEl.scrollLeft - expectedScrollLeft) < 1) {
        expectedScrollLeft = null;
        return;
      }
      userHasScrolled = true;
    },
    { passive: true }
  );
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      if (userHasScrolled) return;
      window.requestAnimationFrame(() => {
        if (!userHasScrolled) applyTodayAlign();
      });
    });
    resizeObserver.observe(scrollEl);
    registry.scrolls.push(resizeObserver);
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!userHasScrolled) applyTodayAlign();
    });
  });
}
function htmlElementFromTarget(target) {
  if (target == null || !("instanceOf" in target)) return null;
  const node = target;
  return node.instanceOf(HTMLElement) ? node : null;
}
function wireHeatmapCellClicks(weeksEl, data) {
  weeksEl.addEventListener("click", (event) => {
    const target = htmlElementFromTarget(event.target);
    if (!target) return;
    const cell = target.closest(".atomic-heat-cell.is-link");
    const path = cell?.getAttribute("data-path");
    if (!path) return;
    event.preventDefault();
    void data.openPath(path);
  });
}
function renderOneHeatmap(root, data, activity, year, timezone, language, registry, activityMap) {
  const weeks = buildHeatmapWeeks({
    year,
    todayStr: ymdInZone(/* @__PURE__ */ new Date(), timezone),
    language,
    activityMap
  });
  const wrap = root.createDiv({
    cls: "atomic-heatmap",
    attr: {
      "data-testid": "atomic-heatmap",
      "data-activity": activity.id
    }
  });
  wrap.detach();
  wrap.setCssProps({
    "--atomic-c": activity.colors[2],
    "--atomic-heat-weeks": String(weeks.length)
  });
  const head = wrap.createDiv({ cls: "atomic-heat-head" });
  const title = head.createSpan({ cls: "atomic-name" });
  title.createSpan({ cls: "atomic-dot" });
  title.createSpan({ text: labelForLanguage(activity.label, language) });
  head.createDiv({ cls: "atomic-readout atomic-heat-readout" });
  const body = wrap.createDiv({ cls: "atomic-heat-body" });
  const dayLabels = body.createDiv({ cls: "atomic-heat-days atomic-caption" });
  for (const mark of heatmapWeekdayLabels(language)) {
    dayLabels.createSpan({ text: mark });
  }
  const scroll = body.createDiv({
    cls: "atomic-heat-scroll fitness-heatmap-scroll atomic-scrollport",
    attr: { "data-testid": "atomic-heatmap-scroll" }
  });
  const grid = scroll.createDiv({ cls: "atomic-heat-grid" });
  const monthPlacements = heatmapMonthPlacements(weeks, language);
  const monthRow = grid.createDiv({ cls: "atomic-heat-months atomic-caption" });
  for (const placement of monthPlacements) {
    const label = monthRow.createSpan({
      text: placement.text,
      attr: {
        "data-testid": "atomic-heatmap-month",
        "data-month": String(placement.month),
        "data-week": String(placement.week)
      }
    });
    label.setCssProps({ "--w": String(placement.week) });
  }
  const cells = grid.createDiv({ cls: "atomic-heat-cells" });
  appendHeatmapWeeks(
    cells,
    weeks,
    activity.colors,
    t("view.heatmap.tooltip", language),
    t("view.heatmap.tooltipOpen", language)
  );
  wireHeatmapCellClicks(cells, data);
  wireHeatmapReadout(wrap, language);
  const todayColumn = weeks.findIndex((week) => week.some((day) => day.isToday));
  const monthColumns = monthPlacements.map((placement) => placement.week - 1);
  wireHeatmapScroll(scroll, registry, todayColumn, monthColumns);
  const foot = wrap.createDiv({ cls: "atomic-heat-foot" });
  foot.createSpan({
    cls: "atomic-caption",
    text: t("view.heatmap.byDuration", language)
  });
  const legend = foot.createDiv({ cls: "atomic-heat-legend" });
  legend.createSpan({ cls: "atomic-caption", text: t("view.heatmap.less", language) });
  legend.createSpan({ cls: "atomic-heat-cell", attr: { "data-l": "0" } });
  activity.colors.forEach((_, level) => {
    legend.createSpan({
      cls: "atomic-heat-cell",
      attr: { "data-l": String(level + 1) }
    });
  });
  legend.createSpan({ cls: "atomic-caption", text: t("view.heatmap.more", language) });
  root.appendChild(wrap);
}
function wireHeatmapReadout(wrap, language) {
  const readout = wrap.querySelector(".atomic-heat-readout");
  if (!readout?.instanceOf(HTMLElement)) return;
  const cells = Array.from(wrap.querySelectorAll(".atomic-heat-cells .atomic-heat-cell"));
  let days = 0;
  let minutes = 0;
  for (const cell of cells) {
    if (!cell.instanceOf(HTMLElement)) continue;
    const value = Number(cell.getAttribute("data-minutes") || "0");
    if (value > 0) {
      days += 1;
      minutes += value;
    }
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const summary = hours > 0 ? t("view.heatmap.summaryHours", language, { days, hours, minutes: rest }) : t("view.heatmap.summary", language, { days, minutes });
  readout.setText(summary);
  wrap.addEventListener("pointerover", (event) => {
    const target = htmlElementFromTarget(event.target);
    if (!target) return;
    const cell = target.closest(".atomic-heat-cells .atomic-heat-cell");
    if (!cell?.instanceOf(HTMLElement)) return;
    const title = cell.getAttribute("title");
    if (title) readout.setText(title);
  });
  wrap.addEventListener("pointerleave", () => {
    readout.setText(summary);
  });
}
function wireHeatmapGrid(gridEl, layout, activityCount, registry) {
  gridEl.style.gridTemplateRows = `repeat(${layout.rows}, auto)`;
  const applyColumns = () => {
    const fallback = typeof window !== "undefined" && Number.isFinite(window.innerWidth) ? window.innerWidth : layout.minColumnWidth;
    const columnCount = effectiveHeatmapColumns({
      columns: layout.columns,
      minColumnWidth: layout.minColumnWidth,
      containerWidth: measureElementWidth(gridEl, fallback),
      activityCount
    });
    gridEl.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, ${layout.defaultSpan}fr))`;
  };
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(applyColumns);
    });
    resizeObserver.observe(gridEl);
    registry.grid = resizeObserver;
  }
  applyColumns();
}
async function renderHeatmaps(el, data, activityTypes, year, timezone, language, activityOption, layoutOptions) {
  const layout = resolveHeatmapLayout(layoutOptions ?? {});
  const { activities, invalidIds } = resolveHeatmapActivities(
    activityTypes,
    activityOption
  );
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year))
  );
  const paintState = {
    year,
    timezone,
    language,
    layoutKey: heatmapLayoutKey(layout),
    activityKey: heatmapActivityKey(activities),
    invalidIds,
    maps
  };
  if (heatmapPaint.shouldSkip(el, paintState)) return;
  cleanupHeatmapObservers(el);
  el.empty();
  const registry = { scrolls: [] };
  heatmapObserverRegistry.set(el, registry);
  const root = el.createDiv({ cls: "fitness-plugin" });
  if (invalidIds.length > 0) {
    root.createEl("p", {
      text: t("view.heatmap.invalidActivities", language, {
        ids: invalidIds.join(", ")
      }),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-invalid" }
    });
  }
  if (activities.length === 0 && invalidIds.length === 0) {
    root.createEl("p", {
      text: t("view.heatmap.noActivities", language),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-empty" }
    });
    return;
  }
  const useGrid = activities.length > 1 && layout.columns > 1;
  const heatmapParent = useGrid ? root.createDiv({ cls: "fitness-heatmap-grid" }) : root;
  for (let i = 0; i < activities.length; i++) {
    renderOneHeatmap(
      heatmapParent,
      data,
      activities[i],
      year,
      timezone,
      language,
      registry,
      maps[i]
    );
  }
  if (useGrid) {
    wireHeatmapGrid(heatmapParent, layout, activities.length, registry);
  }
}
function resolveHeatmapYear(opts, sourcePath, timezone) {
  return resolveBlockYear(opts, nowYear(timezone), { sourcePath });
}

// src/views/gym-log.ts
var import_obsidian7 = require("obsidian");

// src/core/gym-log.ts
var NEW_EXERCISE_SENTINEL = "__atomic_new_exercise__";
var CUSTOM_MUSCLE_SENTINEL = "__atomic_custom_muscle__";
var GYM_LOG_FENCE_RE = /```atomic-gym-log\b/;
var DAILY_SESSION_FILE_RE = /\d{4}-\d{2}-\d{2}\.md$/i;
var DEFAULT_SET_TABLE_HEADERS = {
  exercise: "Exercise",
  muscle: "Muscle",
  weight: "Weight",
  reps: "Reps",
  notes: "Notes"
};
function isGymLogSetup(value) {
  return value === "pending" || value === "complete" || value === "skipped";
}
function gymExercisePairKey(pair) {
  return `${normalizePairPart(pair.exercise)}\0${normalizePairPart(pair.muscle)}`;
}
function gymExercisePairLabel(pair) {
  return `${pair.exercise} \xB7 ${pair.muscle}`;
}
function parseGymExercisePairValue(value) {
  if (!value || value === NEW_EXERCISE_SENTINEL) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    const exercise = String(parsed[0] ?? "").trim();
    const muscle = String(parsed[1] ?? "").trim();
    if (!exercise || !muscle) return null;
    return { exercise, muscle };
  } catch {
    return null;
  }
}
function gymExercisePairValue(pair) {
  return JSON.stringify([pair.exercise, pair.muscle]);
}
function normalizeGymExercisePair(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const exercise = String(record.exercise ?? "").trim();
  const muscle = String(record.muscle ?? "").trim();
  if (!exercise || !muscle) return null;
  return { exercise, muscle };
}
function normalizeGymExercises(value) {
  if (!Array.isArray(value)) return [];
  return mergeGymExercises([], value);
}
function mergeGymExercises(existing, incoming) {
  const byKey = /* @__PURE__ */ new Map();
  for (const value of [...existing, ...incoming]) {
    const pair = normalizeGymExercisePair(value);
    if (!pair) continue;
    const key = gymExercisePairKey(pair);
    if (!byKey.has(key)) byKey.set(key, pair);
  }
  return [...byKey.values()].sort((a, b) => {
    const exercise = a.exercise.localeCompare(b.exercise);
    if (exercise !== 0) return exercise;
    return a.muscle.localeCompare(b.muscle);
  });
}
function extractExercisePairs(markdown) {
  return mergeGymExercises([], pairsFromSetTable(markdown));
}
function lastExercisePairFromSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return null;
  for (let i = table.end; i >= table.firstData; i -= 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (isAlignmentRow(cells) || isEmptySetTableRow(cells)) continue;
    const exercise = cells[0] || "";
    const muscle = cells[1] || "";
    if (!exercise || !muscle) continue;
    return { exercise, muscle };
  }
  return null;
}
function resolveGymLogDropdownValue(remembered, lastLogged, catalogFirst, optionValues) {
  const allowed = new Set(
    optionValues.filter((value) => value && value !== NEW_EXERCISE_SENTINEL)
  );
  if (remembered && allowed.has(remembered)) return remembered;
  if (lastLogged && allowed.has(lastLogged)) return lastLogged;
  if (catalogFirst && allowed.has(catalogFirst)) return catalogFirst;
  return "";
}
function hasGymLogBlock(markdown) {
  return GYM_LOG_FENCE_RE.test(String(markdown || ""));
}
function isGymLogMigrationTarget(path) {
  const base = String(path || "").split("/").pop() ?? "";
  if (!base.toLowerCase().endsWith(".md")) return false;
  if (/^cues\.md$/i.test(base)) return false;
  return true;
}
function isDailySessionPath(path) {
  return DAILY_SESSION_FILE_RE.test(String(path || ""));
}
function sanitizeSetTableCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}
function formatSetTableRow(row, columnCount = 5) {
  const cells = [
    sanitizeSetTableCell(row.exercise),
    sanitizeSetTableCell(row.muscle),
    sanitizeSetTableCell(row.weight),
    sanitizeSetTableCell(row.reps),
    sanitizeSetTableCell(row.notes)
  ];
  while (cells.length < columnCount) cells.push("");
  return `| ${cells.slice(0, columnCount).join(" | ")} |`;
}
function emptySetTable(headers = DEFAULT_SET_TABLE_HEADERS) {
  return [
    `| ${headers.exercise} | ${headers.muscle} | ${headers.weight} | ${headers.reps} | ${headers.notes} |`,
    "| --- | --- | --- | --- | --- |",
    ""
  ].join("\n");
}
function appendSetRow(markdown, row, headers = DEFAULT_SET_TABLE_HEADERS) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  const formatted = formatSetTableRow(row, table?.columnCount ?? 5);
  if (!table) {
    const suffix = `${ensureTrailingNewline(markdown).replace(/\n+$/, "\n\n")}${emptySetTable(headers)}${formatted}
`;
    return { markdown: suffix, filledEmpty: false };
  }
  for (let i = table.firstData; i <= table.end; i += 1) {
    if (isEmptySetTableRow(parsePipeCells(lines[i] ?? ""))) {
      lines[i] = formatted;
      return { markdown: lines.join("\n"), filledEmpty: true };
    }
  }
  lines.splice(table.end + 1, 0, formatted);
  return { markdown: lines.join("\n"), filledEmpty: false };
}
function insertGymLogFence(markdown, fence, headers = DEFAULT_SET_TABLE_HEADERS) {
  const source = String(markdown || "");
  if (hasGymLogBlock(source)) return { markdown: source, changed: false };
  const lines = source.split(/\r?\n/);
  const table = findSetTableRange(lines);
  const block = String(fence || "").trim();
  if (!block) return { markdown: source, changed: false };
  if (table) {
    const prefix2 = lines.slice(0, table.header).join("\n").replace(/\s+$/, "");
    const rest = lines.slice(table.header).join("\n");
    return {
      markdown: withSingleTrailingNewline(joinMarkdownSeams([prefix2, block, rest])),
      changed: true
    };
  }
  const prefix = source.replace(/\n+$/, "");
  const tableMarkdown = emptySetTable(headers).replace(/\n+$/, "");
  return {
    markdown: withSingleTrailingNewline(
      joinMarkdownSeams([prefix, block, tableMarkdown])
    ),
    changed: true
  };
}
function planGymLogSetup(files, fence, headers = DEFAULT_SET_TABLE_HEADERS) {
  const notes = [];
  let pairs = [];
  for (const file of files) {
    if (!isGymLogMigrationTarget(file.path)) continue;
    const markdown = String(file.markdown || "");
    pairs = mergeGymExercises(pairs, extractExercisePairs(markdown));
    const shouldRewrite = isDailySessionPath(file.path) || hasSetTableHeader(markdown);
    if (!shouldRewrite) continue;
    const next = insertGymLogFence(markdown, fence, headers);
    if (next.changed) {
      notes.push({ path: file.path, nextMarkdown: next.markdown });
    }
  }
  return { pairs, notes };
}
function normalizePairPart(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function withSingleTrailingNewline(markdown) {
  return `${String(markdown || "").replace(/\n+$/, "")}
`;
}
function joinMarkdownSeams(parts) {
  return parts.filter((part) => part.length > 0).join("\n\n");
}
function hasSetTableHeader(markdown) {
  return findSetTableRange(String(markdown || "").split(/\r?\n/)) !== null;
}
function pairsFromSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return [];
  const pairs = [];
  for (let i = table.firstData; i <= table.end; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (isAlignmentRow(cells) || isEmptySetTableRow(cells)) continue;
    const exercise = cells[0] || "";
    const muscle = cells[1] || "";
    if (!exercise || !muscle) continue;
    pairs.push({ exercise, muscle });
  }
  return pairs;
}

// src/commands/gym-log-setup.ts
var import_obsidian6 = require("obsidian");
function gymSetTableHeaders(language) {
  return {
    exercise: t("template.gymTable.exercise", language),
    muscle: t("template.gymTable.muscle", language),
    weight: t("template.gymTable.weight", language),
    reps: t("template.gymTable.reps", language),
    notes: t("template.gymTable.notes", language)
  };
}
function muscleLabel(muscle, language) {
  const key = `muscle.${muscle}`;
  const translated = t(key, language);
  return translated === key ? muscle : translated;
}
async function applyGymLogSetup(plugin) {
  const language = plugin.settings.language;
  const fence = defaultAtomicBlockFence("atomic-gym-log", language);
  const headers = gymSetTableHeaders(language);
  const paths = [];
  for (const activity of plugin.settings.activityTypes) {
    if (!activity.supportsSetTable) continue;
    for (const file of plugin.data.listMarkdownInFolder(activity.folder)) {
      if (!isGymLogMigrationTarget(file.path)) continue;
      paths.push(file.path);
    }
  }
  const files = await Promise.all(
    paths.map(async (path) => ({
      path,
      markdown: await plugin.data.readBody(path)
    }))
  );
  const plan = planGymLogSetup(files, fence, headers);
  await Promise.all(
    plan.notes.map(
      (note) => plugin.data.processNote(note.path, (current) => {
        const latest = insertGymLogFence(current, fence, headers);
        return latest.changed ? latest.markdown : current;
      })
    )
  );
  plugin.settings.gymExercises = mergeGymExercises(
    plugin.settings.gymExercises,
    plan.pairs
  );
  plugin.settings.gymLogSetup = "complete";
  await plugin.saveSettings();
  plugin.scheduleRefresh();
  return {
    pairs: plugin.settings.gymExercises.length,
    notes: plan.notes.length
  };
}
async function runGymLogSetup(plugin) {
  const language = plugin.settings.language;
  try {
    const result = await applyGymLogSetup(plugin);
    new import_obsidian6.Notice(
      t("notice.gymLogSetupComplete", language, {
        pairs: result.pairs,
        notes: result.notes
      })
    );
    return true;
  } catch (error) {
    console.error("Gym set log setup failed", error);
    new import_obsidian6.Notice(
      t("notice.gymLogSetupFailed", language, {
        message: error instanceof Error ? error.message : String(error)
      })
    );
    return false;
  }
}
function promptGymLogSetup(plugin) {
  if (plugin.settings.gymLogSetup !== "pending") return;
  new GymLogSetupModal(plugin).open();
}
function promptNewGymExercise(plugin) {
  return new Promise((resolve) => {
    const modal = new NewGymExerciseModal(plugin.app, plugin.settings.language, (pair) => {
      resolve(pair);
    });
    modal.open();
  });
}
var GymLogSetupModal = class extends import_obsidian6.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen() {
    const language = this.plugin.settings.language;
    this.modalEl.setAttr("data-testid", "atomic-gym-log-setup-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymSetupTitle", language) });
    contentEl.createEl("p", { text: t("modal.gymSetupLead", language) });
    contentEl.createEl("p", { text: t("modal.gymSetupBody", language) });
    new import_obsidian6.Setting(contentEl).addButton((button) => {
      button.setButtonText(t("modal.gymSetupLater", language));
      button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-later");
      button.onClick(() => {
        void this.skip();
      });
    }).addButton((button) => {
      button.setButtonText(t("modal.gymSetupConfirm", language));
      button.setCta();
      button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-confirm");
      button.onClick(() => {
        void this.confirm();
      });
    });
  }
  async skip() {
    this.plugin.settings.gymLogSetup = "skipped";
    await this.plugin.saveSettings();
    new import_obsidian6.Notice(t("notice.gymLogSetupLater", this.plugin.settings.language));
    this.close();
  }
  async confirm() {
    this.close();
    await runGymLogSetup(this.plugin);
  }
};
var NewGymExerciseModal = class extends import_obsidian6.Modal {
  constructor(app, language, onFinish) {
    super(app);
    this.language = language;
    this.onFinish = onFinish;
    this.exercise = "";
    this.muscle = MUSCLES[0] ?? "Chest";
    this.customMuscle = "";
    this.customMuscleRow = null;
    this.resolved = false;
  }
  onOpen() {
    this.modalEl.setAttr("data-testid", "atomic-gym-new-exercise-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymNewExerciseTitle", this.language) });
    new import_obsidian6.Setting(contentEl).setName(t("modal.gymExerciseName", this.language)).addText((text) => {
      text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-name");
      text.inputEl.setCssStyles({ width: "100%" });
      text.onChange((value) => {
        this.exercise = value;
      });
      window.setTimeout(() => text.inputEl.focus(), 20);
    });
    new import_obsidian6.Setting(contentEl).setName(t("modal.gymMuscle", this.language)).addDropdown((dropdown) => {
      dropdown.selectEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle");
      for (const muscle of MUSCLES) {
        dropdown.addOption(muscle, muscleLabel(muscle, this.language));
      }
      dropdown.addOption(
        CUSTOM_MUSCLE_SENTINEL,
        t("view.gymLog.customMuscle", this.language)
      );
      dropdown.setValue(this.muscle);
      dropdown.onChange((value) => {
        this.muscle = value;
        this.syncCustomMuscleVisibility();
      });
    });
    const customSetting = new import_obsidian6.Setting(contentEl).setName(t("modal.gymCustomMuscle", this.language)).addText((text) => {
      text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle-custom");
      text.setValue(this.customMuscle);
      text.onChange((value) => {
        this.customMuscle = value;
      });
    });
    customSetting.settingEl.setAttr(
      "data-testid",
      "atomic-gym-new-exercise-muscle-custom-row"
    );
    this.customMuscleRow = customSetting.settingEl;
    this.syncCustomMuscleVisibility();
    new import_obsidian6.Setting(contentEl).addButton(
      (button) => button.setButtonText(t("modal.cancel", this.language)).onClick(() => this.finish(null))
    ).addButton(
      (button) => button.setButtonText(t("modal.ok", this.language)).setCta().onClick(() => this.submit())
    );
  }
  syncCustomMuscleVisibility() {
    if (!this.customMuscleRow) return;
    this.customMuscleRow.toggleClass(
      "atomic-gym-custom-muscle-hidden",
      this.muscle !== CUSTOM_MUSCLE_SENTINEL
    );
  }
  submit() {
    const exercise = this.exercise.trim();
    if (!exercise) {
      new import_obsidian6.Notice(t("notice.gymLogEmptyExercise", this.language));
      return;
    }
    const muscle = this.muscle === CUSTOM_MUSCLE_SENTINEL ? this.customMuscle.trim() : this.muscle.trim();
    if (!muscle) {
      new import_obsidian6.Notice(t("notice.gymLogEmptyMuscle", this.language));
      return;
    }
    this.finish({ exercise, muscle });
  }
  finish(pair) {
    if (this.resolved) return;
    this.resolved = true;
    this.close();
    this.onFinish(pair);
  }
  onClose() {
    if (this.resolved) return;
    this.resolved = true;
    this.onFinish(null);
  }
};

// src/views/gym-log.ts
var lastGymLogSelection = /* @__PURE__ */ new Map();
function rememberGymLogSelection(sourcePath, value) {
  if (!sourcePath || !parseGymExercisePairValue(value)) return;
  lastGymLogSelection.set(sourcePath, value);
}
function gymLogOptionValues(select) {
  return Array.from(select.options, (option) => option.value);
}
async function renderAtomicGymLog(plugin, el, sourcePath) {
  el.empty();
  const language = plugin.settings.language;
  const root = el.createDiv({
    cls: "fitness-plugin atomic-gym-log atomic-well",
    attr: { "data-testid": "atomic-gym-log" }
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.gymLog.needsSession", language)
    });
    return;
  }
  const catalog = plugin.settings.gymExercises;
  if (!catalog.length) {
    root.createEl("p", {
      cls: "fitness-muted atomic-gym-log-empty",
      text: t("view.gymLog.emptyCatalog", language)
    });
  }
  const form = root.createDiv({ cls: "atomic-gym-log-fields" });
  const exerciseField = addField(form, t("view.gymLog.exercise", language));
  const select = exerciseField.createEl("select", {
    cls: "dropdown atomic-field-value",
    attr: {
      "data-testid": "atomic-gym-log-exercise",
      "aria-label": t("view.gymLog.exercise", language)
    }
  });
  select.createEl("option", {
    text: t("view.gymLog.exercise", language),
    value: ""
  });
  for (const pair of catalog) {
    select.createEl("option", {
      text: gymExercisePairLabel(pair),
      value: gymExercisePairValue(pair)
    });
  }
  select.createEl("option", {
    text: t("view.gymLog.newExercise", language),
    value: NEW_EXERCISE_SENTINEL
  });
  let lastLoggedValue = null;
  const fileForLast = plugin.data.getFileByPath(sourcePath);
  if (fileForLast) {
    const lastPair = lastExercisePairFromSetTable(
      await plugin.app.vault.cachedRead(fileForLast)
    );
    if (lastPair) lastLoggedValue = gymExercisePairValue(lastPair);
  }
  const catalogFirst = catalog[0] ? gymExercisePairValue(catalog[0]) : "";
  select.value = resolveGymLogDropdownValue(
    lastGymLogSelection.get(sourcePath),
    lastLoggedValue,
    catalogFirst,
    gymLogOptionValues(select)
  );
  const weightInput = addTextField(
    form,
    t("view.gymLog.weight", language),
    "atomic-gym-log-weight"
  );
  weightInput.parentElement?.createSpan({
    cls: "atomic-field-suffix",
    text: t("view.dashboard.kgUnit", language)
  });
  const repsInput = addRepsStepper(form, t("view.gymLog.reps", language));
  const notesInput = addTextField(
    form,
    t("view.gymLog.notes", language),
    "atomic-gym-log-notes"
  );
  notesInput.setAttr("placeholder", t("view.gymLog.notes", language));
  const addButton = form.createEl("button", {
    cls: "atomic-btn is-primary mod-cta",
    text: t("view.gymLog.add", language),
    attr: { "data-testid": "atomic-gym-log-add", type: "button" }
  });
  select.addEventListener("change", () => {
    if (select.value !== NEW_EXERCISE_SENTINEL) {
      rememberGymLogSelection(sourcePath, select.value);
      return;
    }
    void (async () => {
      const created = await promptNewGymExercise(plugin);
      if (!created) {
        select.value = resolveGymLogDropdownValue(
          lastGymLogSelection.get(sourcePath),
          lastLoggedValue,
          catalogFirst,
          gymLogOptionValues(select)
        );
        return;
      }
      plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
        created
      ]);
      await plugin.saveSettings();
      new import_obsidian7.Notice(
        t("notice.gymExerciseSaved", language, {
          exercise: created.exercise,
          muscle: created.muscle
        })
      );
      rememberGymLogSelection(sourcePath, gymExercisePairValue(created));
      plugin.scheduleRefresh();
    })();
  });
  addButton.addEventListener("click", () => {
    void (async () => {
      if (addButton.disabled) return;
      const pair = parseGymExercisePairValue(select.value);
      const weight = weightInput.value.trim();
      const reps = repsInput.value.trim();
      const notes = notesInput.value.trim();
      if (!pair || !weight || !reps) {
        new import_obsidian7.Notice(t("notice.gymLogMissingFields", language));
        return;
      }
      rememberGymLogSelection(sourcePath, select.value);
      const file = plugin.data.getFileByPath(sourcePath);
      if (!file) {
        new import_obsidian7.Notice(t("notice.gymLogNeedsSavedNote", language));
        return;
      }
      const headers = gymSetTableHeaders(language);
      addButton.disabled = true;
      try {
        await plugin.app.vault.process(file, (latest) => {
          return appendSetRow(
            latest,
            {
              exercise: pair.exercise,
              muscle: pair.muscle,
              weight,
              reps,
              notes
            },
            headers
          ).markdown;
        });
        plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
          pair
        ]);
        await plugin.saveSettings();
        weightInput.value = "";
        repsInput.value = "";
        notesInput.value = "";
        new import_obsidian7.Notice(
          t("notice.gymLogAdded", language, { exercise: pair.exercise })
        );
      } finally {
        addButton.disabled = false;
      }
    })();
  });
}
function addField(parent, label) {
  const field = parent.createDiv({ cls: "atomic-field atomic-gym-log-field" });
  const caption = field.createSpan({ cls: "atomic-field-label atomic-caption" });
  caption.setText(label);
  return field;
}
function addRepsStepper(parent, label) {
  const field = parent.createDiv({ cls: "atomic-stepper is-tall atomic-gym-log-field" });
  field.createSpan({ cls: "atomic-stepper-label atomic-caption", text: label });
  const input = field.createEl("input", {
    cls: "atomic-stepper-value",
    attr: {
      type: "text",
      inputmode: "numeric",
      "data-testid": "atomic-gym-log-reps",
      "aria-label": label
    }
  });
  const step = (delta) => {
    const current = Number.parseInt(input.value, 10);
    const next = (Number.isFinite(current) ? current : 0) + delta;
    input.value = String(Math.max(0, next));
  };
  const minus = field.createEl("button", {
    text: "\u2212",
    cls: "atomic-btn",
    attr: { type: "button", "aria-label": label }
  });
  minus.addEventListener("click", () => step(-1));
  field.insertBefore(minus, input);
  field.createEl("button", {
    text: "+",
    cls: "atomic-btn",
    attr: { type: "button", "aria-label": label }
  }).addEventListener("click", () => step(1));
  return input;
}
function addTextField(parent, label, testId) {
  return addField(parent, label).createEl("input", {
    cls: "atomic-field-value",
    attr: {
      type: "text",
      "data-testid": testId,
      "aria-label": label
    }
  });
}

// src/views/timer.ts
var import_obsidian8 = require("obsidian");
async function modifyCurrentNote(plugin, sourcePath, updater) {
  const file = plugin.data.getFileByPath(sourcePath);
  if (!file) {
    new import_obsidian8.Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
    return false;
  }
  await plugin.app.vault.process(file, updater);
  return true;
}
var timerClocks = /* @__PURE__ */ new WeakMap();
function stopTimerClock(el) {
  const id = timerClocks.get(el);
  if (id == null) return;
  window.clearInterval(id);
  timerClocks.delete(el);
}
function localClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
function elapsedClock(iso, now = Date.now()) {
  const started = new Date(iso).getTime();
  if (Number.isNaN(started)) return "00:00";
  const total = Math.max(0, Math.floor((now - started) / 1e3));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
function paintTimer(plugin, el, sourcePath) {
  void renderAtomicTimer(plugin, el, sourcePath);
}
async function renderAtomicTimer(plugin, el, sourcePath, generation) {
  const markdown = sourcePath ? await plugin.data.readCachedBody(sourcePath) : "";
  if (!shouldCommitBlockPaint(el, generation)) {
    return;
  }
  stopTimerClock(el);
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-timer atomic-well",
    attr: { "data-testid": "atomic-timer" }
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.timer.needsSavedNote", plugin.settings.language)
    });
    return;
  }
  const frontmatter = readTimerFrontmatter(markdown);
  const language = plugin.settings.language;
  const totalKey = frontmatter.persistMode === "session" ? "view.timer.duration" : "view.timer.total";
  const minutes = displayedTimerMinutes(frontmatter);
  const head = root.createDiv({ cls: "atomic-timer-head" });
  const caption = head.createDiv({ cls: "atomic-timer-caption atomic-caption" });
  const total = head.createDiv({ cls: "atomic-readout atomic-timer-total" });
  appendCatalogLabel(total, t(totalKey, language, { minutes }));
  const clock = root.createDiv({ cls: "atomic-timer-clock" });
  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.addClass("is-running");
    const startedAt = frontmatter.timerStartedAt;
    caption.createSpan({ cls: "atomic-pulse" });
    appendCatalogLabel(
      caption,
      t("view.timer.runningSince", language, { time: localClock(startedAt) })
    );
    clock.setText(elapsedClock(startedAt));
    const tick = window.setInterval(() => {
      if (!clock.isConnected) {
        stopTimerClock(el);
        return;
      }
      clock.setText(elapsedClock(startedAt));
    }, 1e3);
    timerClocks.set(el, tick);
    actions.createEl("button", {
      text: t("view.timer.stop", plugin.settings.language),
      cls: "atomic-btn is-primary",
      attr: { "data-testid": "atomic-timer-stop", type: "button" }
    }).addEventListener("click", () => {
      void (async () => {
        const file = plugin.data.getFileByPath(sourcePath);
        if (!file) {
          new import_obsidian8.Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
          return;
        }
        const latest = await plugin.app.vault.read(file);
        const persistMode = readTimerFrontmatter(latest).persistMode;
        switch (persistMode) {
          case "session": {
            let minutes2 = null;
            await plugin.app.vault.process(file, (current) => {
              const startedAtIso = readTimerFrontmatter(current).timerStartedAt;
              if (!startedAtIso) return current;
              const result = stopSessionTimer({
                markdown: current,
                startedAtIso,
                stoppedAtIso: (/* @__PURE__ */ new Date()).toISOString()
              });
              minutes2 = result.minutes;
              return result.markdown;
            });
            if (minutes2 === null) {
              new import_obsidian8.Notice(t("notice.timerNotRunning", plugin.settings.language));
              return;
            }
            new import_obsidian8.Notice(
              t("notice.timerLogged", plugin.settings.language, { minutes: minutes2 })
            );
            paintTimer(plugin, el, sourcePath);
            return;
          }
          case "item": {
            const itemFrontmatter = readTimerFrontmatter(latest);
            if (!itemFrontmatter.timerStartedAt) {
              new import_obsidian8.Notice(t("notice.timerNotRunning", plugin.settings.language));
              return;
            }
            const note = await promptText(
              plugin.app,
              t("modal.timeLogNote", plugin.settings.language),
              "",
              plugin.settings.language
            );
            if (note === null) return;
            const result = stopTimer({
              markdown: latest,
              startedAtIso: itemFrontmatter.timerStartedAt,
              stoppedAtIso: (/* @__PURE__ */ new Date()).toISOString(),
              note
            });
            await plugin.app.vault.process(file, () => result.markdown);
            new import_obsidian8.Notice(
              t("notice.timerLogged", plugin.settings.language, {
                minutes: result.minutes
              })
            );
            paintTimer(plugin, el, sourcePath);
            return;
          }
          default: {
            const unseen = persistMode;
            throw new Error(`Unknown timer persist mode: ${unseen}`);
          }
        }
      })();
    });
    actions.createEl("button", {
      text: t("view.timer.discard", plugin.settings.language),
      cls: "atomic-btn is-quiet",
      attr: { "data-testid": "atomic-timer-discard", type: "button" }
    }).addEventListener("click", () => {
      void (async () => {
        const written = await modifyCurrentNote(
          plugin,
          sourcePath,
          (latest) => updateTimerFrontmatter(latest, { timerStartedAtIso: null })
        );
        if (written) paintTimer(plugin, el, sourcePath);
      })();
    });
    return;
  }
  appendCatalogLabel(caption, t("view.timer.caption", language));
  clock.appendText(String(minutes));
  clock.createSpan({ cls: "atomic-unit", text: t("view.timer.minuteUnit", language) });
  actions.createEl("button", {
    text: t("view.timer.start", plugin.settings.language),
    cls: "atomic-btn is-primary",
    attr: { "data-testid": "atomic-timer-start", type: "button" }
  }).addEventListener("click", () => {
    void (async () => {
      const written = await modifyCurrentNote(
        plugin,
        sourcePath,
        (latest) => updateTimerFrontmatter(latest, {
          timerStartedAtIso: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      if (written) paintTimer(plugin, el, sourcePath);
    })();
  });
}

// src/views/today.ts
function resolveTodayDate(opts, sourcePath, timezone) {
  if (opts.date && parseYmd(opts.date)) return opts.date;
  const fromPath = extractYmdFromPath(sourcePath);
  if (fromPath) return fromPath;
  return ymdInZone(/* @__PURE__ */ new Date(), timezone);
}
function sessionFromMap(map, dateStr) {
  const entry = map?.get(dateStr);
  if (!entry || entry.minutes <= 0) return null;
  return { minutes: entry.minutes, path: entry.path ?? "" };
}
function conventionalSessionPath(activity, dateStr) {
  return `${activity.folder}/${dateStr.slice(0, 4)}/${dateStr}.md`;
}
function sessionForToday(data, activity, map, dateStr) {
  const mapped = sessionFromMap(map, dateStr);
  const conventional = conventionalSessionPath(activity, dateStr);
  const path = mapped?.path || (data.exists(conventional) ? conventional : "");
  if (!mapped && !path) return null;
  return { minutes: mapped?.minutes ?? 0, path };
}
async function renderTodaySessions(el, data, activityTypes, dateStr, language, generation) {
  const activities = exerciseActivities(activityTypes);
  const year = Number(dateStr.slice(0, 4));
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year))
  );
  if (generation !== void 0 && isStaleBlockRender(el, generation)) return;
  el.empty();
  const rows = activities.map((activity, index) => ({
    activity,
    session: sessionForToday(data, activity, maps[index], dateStr)
  }));
  const done = rows.filter((row) => row.session).length;
  const parsed = parseYmd(dateStr);
  const dateLabel = parsed ? weekdayDateForLanguage(parsed.y, parsed.m, parsed.d, language) : dateStr;
  const root = el.createDiv({
    cls: "fitness-plugin atomic-today",
    attr: { "data-testid": "atomic-today" }
  });
  const head = root.createDiv({ cls: "atomic-section-head" });
  const titleWrap = head.createDiv();
  const caption = titleWrap.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, t("view.today.title", language));
  const readout = head.createDiv({ cls: "atomic-readout" });
  appendCatalogLabel(
    readout,
    t("view.today.summary", language, {
      date: dateLabel,
      done,
      total: activities.length
    })
  );
  for (const { activity, session: session2 } of rows) {
    const line = root.createDiv({
      cls: session2?.path ? "atomic-recent-row atomic-today-row" : "atomic-recent-row atomic-today-row is-empty",
      attr: session2?.path ? {
        "data-testid": "atomic-today-row",
        "data-path": session2.path,
        role: "link",
        tabindex: "0"
      } : void 0
    });
    line.setCssProps({ "--atomic-c": activity.colors[2] });
    if (session2?.path) {
      const path = session2.path;
      const open = (event) => {
        event.preventDefault();
        void data.openPath(path);
      };
      line.addEventListener("click", open);
      line.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        open(event);
      });
    }
    const name = line.createSpan({ cls: "atomic-name" });
    name.createSpan({ cls: "atomic-dot" });
    name.createSpan({ text: labelForLanguage(activity.label, language) });
    const sum = line.createSpan({ cls: "atomic-recent-sum" });
    if (session2) {
      sum.createEl("strong", { text: String(session2.minutes) });
      sum.appendText(" ");
      appendInlineCatalog(sum, t("view.dashboard.minuteWord", language));
    } else {
      sum.setText(t("view.today.noSession", language));
    }
    line.createSpan({ cls: "atomic-recent-arrow", text: session2?.path ? "\u2192" : "" });
  }
}

// src/codeblocks.ts
function frontmatterYear(plugin, sourcePath) {
  const cache = plugin.app.metadataCache.getCache(sourcePath);
  return cache?.frontmatter?.year;
}
var AtomicBlockChild = class extends import_obsidian9.MarkdownRenderChild {
  constructor(containerEl, plugin, seed) {
    super(containerEl);
    this.plugin = plugin;
    this.generation = 0;
    this.paint = null;
    this.block = { ...seed, beginPaint: () => this.beginPaint() };
  }
  beginPaint() {
    if (this.paint) this.removeChild(this.paint);
    this.paint = new import_obsidian9.Component();
    this.addChild(this.paint);
    return this.paint;
  }
  onload() {
    this.plugin.trackLiveBlock(this.block);
    void renderTrackedBlock(this.plugin, this.block);
    this.generation = currentBlockGeneration(this.containerEl);
  }
  onunload() {
    invalidateBlockRenderIfCurrent(this.containerEl, this.generation);
    this.plugin.untrackLiveBlock(this.block);
  }
};
function renderTrackedBlock(plugin, block) {
  return enqueueBlockRender(block.el, async (generation) => {
    if (isStaleBlockRender(block.el, generation)) {
      return;
    }
    if (!plugin.app.workspace.layoutReady) return;
    await renderBlock(plugin, block.kind, block.source, block.el, {
      sourcePath: block.sourcePath,
      generation,
      beginPaint: block.beginPaint
    });
  });
}
async function renderBlock(plugin, kind, source, el, ctx) {
  const opts = parseBlockOptions(source);
  const sourcePath = ctx.sourcePath || "";
  const data = plugin.data;
  const settings = plugin.settings;
  const activityTypes = settings.activityTypes;
  const tz = settings.timezone;
  const language = settings.language;
  try {
    switch (kind) {
      case "atomic-heatmap": {
        const year = resolveHeatmapYear(opts, sourcePath, tz);
        await renderHeatmaps(
          el,
          data,
          activityTypes,
          year,
          tz,
          language,
          opts.activity,
          opts
        );
        break;
      }
      case "atomic-today": {
        const dateStr = resolveTodayDate(opts, sourcePath, tz);
        await renderTodaySessions(
          el,
          data,
          activityTypes,
          dateStr,
          language,
          ctx.generation
        );
        break;
      }
      case "atomic-dashboard": {
        const year = resolveDashboardYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderDashboard(
          el,
          data,
          activityTypes,
          year,
          language,
          tz
        );
        break;
      }
      case "atomic-cues": {
        const activity = resolveCueActivity(kind, opts);
        if (!activity) {
          el.empty();
          const root = el.createDiv({ cls: "fitness-plugin" });
          root.createEl("p", {
            text: t("view.atomicCuesRequiresActivity", language),
            cls: "fitness-muted"
          });
          break;
        }
        const year = resolveCuesYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderCues(
          el,
          data,
          activityTypes,
          year,
          activity,
          language,
          { app: plugin.app, sourcePath, beginPaint: ctx.beginPaint }
        );
        break;
      }
      case "atomic-actions": {
        renderActions(el, plugin);
        break;
      }
      case "atomic-timer": {
        await renderAtomicTimer(plugin, el, sourcePath, ctx.generation);
        break;
      }
      case "atomic-gym-log": {
        await renderAtomicGymLog(plugin, el, sourcePath);
        break;
      }
      case "atomic-cue-log": {
        await renderAtomicCueLog(
          plugin,
          el,
          {
            app: plugin.app,
            sourcePath,
            beginPaint: ctx.beginPaint
          },
          ctx.generation
        );
        break;
      }
      case "atomic-bookshelf": {
        renderBookShelf(el, data, activityTypes, opts, language);
        break;
      }
      default:
        el.empty();
        el.createEl("p", {
          text: t("view.unknownAtomicBlock", language, { kind })
        });
    }
    if (kind === "atomic-timer" || kind === "atomic-gym-log") {
      markSessionEmbed(el, kind === "atomic-timer" ? "timer" : "gym-log");
    } else if (kind === "atomic-cue-log") {
      el.classList.add("atomic-embed-stretch");
    }
  } catch (err) {
    console.error("Atomic block error", kind, err);
    el.empty();
    el.createEl("p", {
      text: t("view.atomicError", language, {
        message: err instanceof Error ? err.message : String(err)
      }),
      cls: "mod-warning"
    });
  }
}
function registerCodeblocks(plugin) {
  const kinds = codeblockLanguages();
  for (const kind of kinds) {
    plugin.registerMarkdownCodeBlockProcessor(kind, (source, el, ctx) => {
      const block = { kind, el, source, sourcePath: ctx.sourcePath };
      mountAtomicBlockShell(el);
      ctx.addChild(new AtomicBlockChild(el, plugin, block));
    });
  }
}

// src/data/vault-source.ts
var import_obsidian10 = require("obsidian");

// src/util/duration-map.ts
function durationMapFromSessions(sessions) {
  const map = /* @__PURE__ */ new Map();
  for (const session2 of sessions) {
    if (!session2.date) continue;
    const entry = map.get(session2.date) || { minutes: 0, path: null };
    entry.minutes += session2.duration_min;
    if (!entry.path) entry.path = session2.path;
    map.set(session2.date, entry);
  }
  return map;
}
function addHobbyItemMinutes(map, path, totals) {
  for (const [date, minutes] of totals) {
    const entry = map.get(date) || { minutes: 0, path };
    entry.minutes += minutes;
    if (!entry.path) entry.path = path;
    map.set(date, entry);
  }
}
function durationMapFromHobbyLogs(items, year) {
  const map = /* @__PURE__ */ new Map();
  for (const item of items) {
    addHobbyItemMinutes(
      map,
      item.path,
      minutesByDateForYear(item.entries, year)
    );
  }
  return map;
}

// src/util/folder-files.ts
function isVaultFolderLike(node) {
  return !!node && Array.isArray(node.children);
}
function markdownFilesInFolder(folder) {
  if (!isVaultFolderLike(folder)) return [];
  const out = [];
  const stack = [...folder.children ?? []];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (isVaultFolderLike(node)) {
      if (node.children) stack.push(...node.children);
      continue;
    }
    if (isMarkdownFile(node)) out.push(node);
  }
  return out;
}
function isMarkdownFile(node) {
  if (node.extension) return node.extension === "md";
  return node.path.toLowerCase().endsWith(".md");
}

// src/util/hobby-item-scan.ts
function hobbyItemFromFileCache(params) {
  const { path, basename, activityId } = params;
  const fm = params.frontmatter;
  if (fm == null) {
    return {
      path,
      basename,
      frontmatter: {
        type: "atomic-item",
        activity: activityId,
        title: basename
      }
    };
  }
  if (fm.type !== "atomic-item" || fm.activity !== activityId) return null;
  return { path, basename, frontmatter: fm };
}

// src/util/note-parse-cache.ts
var NoteParseCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.pending = /* @__PURE__ */ new Map();
  }
  get(path, mtime) {
    const hit = this.cache.get(path);
    if (!hit || hit.mtime !== mtime) return void 0;
    return hit.value;
  }
  set(path, mtime, value) {
    this.cache.set(path, { mtime, value });
  }
  /**
   * Cached value for `mtime`, or the result of `load()` (stored under that mtime).
   * A load already in flight for the same path and mtime is reused.
   */
  resolve(path, mtime, load) {
    const hit = this.get(path, mtime);
    if (hit !== void 0) return Promise.resolve(hit);
    const inFlight = this.pending.get(path);
    if (inFlight && inFlight.mtime === mtime) return inFlight.promise;
    const promise = load().then(
      (value) => {
        if (this.pending.get(path)?.promise === promise) {
          this.pending.delete(path);
          this.set(path, mtime, value);
        }
        return value;
      },
      (error) => {
        if (this.pending.get(path)?.promise === promise) this.pending.delete(path);
        throw error;
      }
    );
    this.pending.set(path, { mtime, promise });
    return promise;
  }
  invalidate(path) {
    if (!path) {
      this.cache.clear();
      this.pending.clear();
      return;
    }
    this.cache.delete(path);
    this.pending.delete(path);
  }
  rename(oldPath, newPath) {
    const hit = this.cache.get(oldPath);
    this.cache.delete(oldPath);
    this.pending.delete(oldPath);
    if (!hit) {
      this.cache.delete(newPath);
      return;
    }
    this.cache.set(newPath, hit);
  }
  get size() {
    return this.cache.size;
  }
};

// src/util/session-meta.ts
function asList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}
function resolveSessionDate(frontmatter, basename) {
  if (frontmatter?.date != null && frontmatter.date !== "") {
    const raw = String(frontmatter.date);
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) return basename;
  return null;
}
function sessionMetaFromFile(params) {
  const fm = params.frontmatter ?? {};
  return {
    path: params.path,
    basename: params.basename,
    date: resolveSessionDate(params.frontmatter, params.basename),
    duration_min: Number(fm.duration_min) || 0,
    weight_unit: fm.weight_unit === "lb" ? "lb" : "kg",
    focus: asList(fm.focus),
    felt: String(fm.felt || "")
  };
}

// src/util/vault-list-cache.ts
var VaultListCache = class {
  constructor() {
    this.stamp = 0;
    this.entries = /* @__PURE__ */ new Map();
  }
  get(key) {
    const hit = this.entries.get(key);
    if (!hit || hit.stamp !== this.stamp) return void 0;
    return hit.value;
  }
  set(key, value, scope = "") {
    this.entries.set(key, { stamp: this.stamp, value, scope });
  }
  /**
   * Drop cached lists. With a path, only entries whose scope touches that path.
   * With no path, drop everything and bump the generation stamp.
   */
  invalidate(path) {
    if (path == null || path === "") {
      this.stamp++;
      this.entries.clear();
      return;
    }
    for (const [key, entry] of [...this.entries]) {
      if (!entry.scope || pathTouchesScope(path, entry.scope)) {
        this.entries.delete(key);
      }
    }
  }
  get generation() {
    return this.stamp;
  }
  get size() {
    return this.entries.size;
  }
};

// src/data/vault-source.ts
var EMPTY_TIME_LOG = [];
var EMPTY_REMINDERS = [];
var VaultDataSource = class {
  constructor(app) {
    this.app = app;
    this.timeLogCache = new NoteParseCache();
    this.setTableCache = new NoteParseCache();
    this.reminderCache = new NoteParseCache();
    this.noteParseCaches = [
      this.timeLogCache,
      this.setTableCache,
      this.reminderCache
    ];
    this.sessionListCache = new VaultListCache();
    this.hobbyItemListCache = new VaultListCache();
    this.durationMapCache = new VaultListCache();
    this.needsMetadataRefreshPrefixes = /* @__PURE__ */ new Set();
  }
  /** Drop cached note parses (all paths, or one path after edit/delete). */
  invalidateNoteParseCaches(path) {
    const scoped = path ? (0, import_obsidian10.normalizePath)(path) : void 0;
    for (const cache of this.noteParseCaches) cache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }
  /** Keep parse cache entries aligned when a note is renamed. */
  renameNoteParseCaches(oldPath, newPath) {
    const from = (0, import_obsidian10.normalizePath)(oldPath);
    const to = (0, import_obsidian10.normalizePath)(newPath);
    for (const cache of this.noteParseCaches) cache.rename(from, to);
  }
  /** Drop cached vault list scans (sessions / hobby items / duration maps). */
  invalidateListCache(path) {
    const scoped = path ? (0, import_obsidian10.normalizePath)(path) : void 0;
    this.sessionListCache.invalidate(scoped);
    this.hobbyItemListCache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }
  /**
   * Invalidate list caches for scan prefixes whose `getFileCache()` was null
   * (index not ready). Returns true when at least one prefix was consumed.
   * Empty frontmatter on an existing cache does not record a prefix.
   */
  invalidateUnreadyPrefixes() {
    const prefixes = [...this.needsMetadataRefreshPrefixes];
    this.needsMetadataRefreshPrefixes.clear();
    if (!prefixes.length) return false;
    for (const prefix of prefixes) this.invalidateListCache(prefix);
    return true;
  }
  /**
   * Parsed Time log entries for a hobby item note.
   * Reuses an in-memory parse while the file mtime is unchanged.
   */
  getHobbyTimeLogEntries(path) {
    return this.parsedNote(this.timeLogCache, path, parseTimeLog, EMPTY_TIME_LOG);
  }
  /** Parsed set-table rows of a session note; same mtime reuse as Time logs. */
  getSessionSetRows(path) {
    return this.parsedNote(this.setTableCache, path, parseSetTable, EMPTY_SET_ROWS);
  }
  /** Reminder bullets of a session note; same mtime reuse as Time logs. */
  getSessionReminders(path) {
    return this.parsedNote(this.reminderCache, path, parseReminders, EMPTY_REMINDERS);
  }
  /**
   * One parsed view of a note, reused while its mtime is unchanged. Reads go
   * through `cachedRead`; results are shared, so callers must not mutate them.
   */
  parsedNote(cache, path, parse, empty) {
    const file = this.getFileByPath(path);
    if (!file) return Promise.resolve(empty);
    return cache.resolve(
      file.path,
      file.stat.mtime,
      async () => parse(await this.app.vault.cachedRead(file))
    );
  }
  listSessions(folder, year) {
    const prefix = sessionScanPrefix(folder, year);
    if (!prefix) return [];
    const cached = this.sessionListCache.get(prefix);
    if (cached) return cached;
    const out = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file, prefix);
      out.push(
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: cache == null ? void 0 : cache.frontmatter ?? {}
        })
      );
    }
    this.cacheList(this.sessionListCache, prefix, out, prefix);
    return out;
  }
  listHobbyItems(activity) {
    if (activity.domain !== "hobby" || activity.noteModel !== "item" || !activity.supportsTimer) {
      return [];
    }
    const prefix = hobbyItemsScanPrefix(activity.folder);
    if (!prefix) return [];
    const cacheKey = `${activity.id}\0${prefix}`;
    const cached = this.hobbyItemListCache.get(cacheKey);
    if (cached) return cached;
    const out = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file, prefix);
      const item = hobbyItemFromFileCache({
        path: file.path,
        basename: file.basename,
        frontmatter: cache == null ? null : cache.frontmatter ?? {},
        activityId: activity.id
      });
      if (item) out.push(item);
    }
    this.cacheList(this.hobbyItemListCache, cacheKey, out, prefix);
    return out;
  }
  /**
   * Minutes-by-date for one activity/year. Shared by every heatmap that
   * asks for the same pair until a touching vault path invalidates it.
   */
  async getActivityDurationMap(activity, year) {
    const prefix = activity.domain === "hobby" ? hobbyItemsScanPrefix(activity.folder) : sessionScanPrefix(activity.folder, year);
    if (!prefix) return /* @__PURE__ */ new Map();
    const cacheKey = `${activity.id}\0${prefix}\0${year}`;
    const cached = this.durationMapCache.get(cacheKey);
    if (cached) return cached;
    if (activity.domain === "hobby") {
      const items = this.listHobbyItems(activity);
      const perItem = await Promise.all(
        items.map(async (item) => ({
          path: item.path,
          entries: await this.getHobbyTimeLogEntries(item.path)
        }))
      );
      const map2 = durationMapFromHobbyLogs(perItem, year);
      this.cacheList(this.durationMapCache, cacheKey, map2, prefix);
      return map2;
    }
    const map = durationMapFromSessions(this.listSessions(activity.folder, year));
    this.cacheList(this.durationMapCache, cacheKey, map, prefix);
    return map;
  }
  /**
   * Folder scans that run while Obsidian is still restoring the layout may
   * see a partial file tree, so they are served but not remembered. The
   * plugin refreshes once at layout ready; from then on scans are cached.
   */
  cacheList(cache, key, value, scope) {
    if (!this.app.workspace.layoutReady) return;
    cache.set(key, value, scope);
  }
  /** Fresh disk read. Use before deciding on or composing a write. */
  async readBody(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(path));
    if (!(af instanceof import_obsidian10.TFile)) return "";
    return this.app.vault.read(af);
  }
  /** Display-only read served from Obsidian's content cache when unchanged. */
  async readCachedBody(path) {
    const file = this.getFileByPath(path);
    if (!file) return "";
    return this.app.vault.cachedRead(file);
  }
  exists(path) {
    return !!this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(path));
  }
  async ensureFolder(folderPath) {
    const norm = (0, import_obsidian10.normalizePath)(folderPath);
    if (this.app.vault.getAbstractFileByPath(norm)) return;
    const parts = norm.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }
  async createNote(path, content) {
    const norm = (0, import_obsidian10.normalizePath)(path);
    const parent = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
    if (parent) await this.ensureFolder(parent);
    return this.app.vault.create(norm, content);
  }
  async writeNote(path, content) {
    const norm = (0, import_obsidian10.normalizePath)(path);
    const existing = this.app.vault.getAbstractFileByPath(norm);
    if (existing instanceof import_obsidian10.TFile) {
      await this.app.vault.process(existing, () => content);
      return existing;
    }
    return this.createNote(norm, content);
  }
  /**
   * Apply an updater to the current file bytes. Returns null when the path
   * is missing. Unchanged content is returned as-is so callers can skip a rewrite.
   */
  async processNote(path, updater) {
    const existing = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(path));
    if (!(existing instanceof import_obsidian10.TFile)) return null;
    await this.app.vault.process(existing, updater);
    return existing;
  }
  async openPath(path) {
    const norm = (0, import_obsidian10.normalizePath)(path);
    const file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof import_obsidian10.TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    await this.app.workspace.openLinkText(norm, "", false);
  }
  getFileByPath(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(path));
    return af instanceof import_obsidian10.TFile ? af : null;
  }
  getFolder(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(path));
    return af instanceof import_obsidian10.TFolder ? af : null;
  }
  listMarkdownInFolder(folder) {
    if (!isSafeVaultFolder(folder)) return [];
    return this.markdownNotesInFolder(folder);
  }
  /** Resolve a vault path/wikilink target (or absolute URL) into an img src. */
  resolveResourcePath(linkOrPath, sourcePath = "") {
    const trimmed = linkOrPath.trim();
    if (!trimmed) return null;
    if (/^(javascript|vbscript):/i.test(trimmed)) return null;
    if (/^data:/i.test(trimmed)) {
      if (!/^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i.test(trimmed)) {
        return null;
      }
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed) || /^app:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const fromLink = this.app.metadataCache.getFirstLinkpathDest(
      trimmed,
      sourcePath
    );
    const fromPath = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(trimmed));
    const file = fromLink instanceof import_obsidian10.TFile ? fromLink : fromPath instanceof import_obsidian10.TFile ? fromPath : null;
    if (!file) return null;
    return this.app.vault.getResourcePath(file);
  }
  markdownNotesInFolder(folderPath) {
    const folder = this.app.vault.getAbstractFileByPath((0, import_obsidian10.normalizePath)(folderPath));
    return markdownFilesInFolder(asFolderLike(folder));
  }
  fileCache(file, scanPrefix) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache == null) this.needsMetadataRefreshPrefixes.add(scanPrefix);
    return cache;
  }
};
function asFolderLike(node) {
  if (!node || typeof node !== "object") return null;
  if (!("children" in node) || !Array.isArray(node.children)) {
    return null;
  }
  return node;
}

// src/properties/property-select.ts
var import_obsidian11 = require("obsidian");
var SELECT_CLASS = "atomic-property-select";
var HIDDEN_CLASS = "atomic-property-native-hidden";
var SYNC_GRACE_MS = 2e3;
function appendOption(selectEl, value, label, selected = false) {
  const optionEl = selectEl.createEl("option", { text: label, value });
  optionEl.selected = selected;
  return optionEl;
}
function insertOption(selectEl, before, value, label) {
  const optionEl = selectEl.createEl("option", { text: label, value });
  selectEl.insertBefore(optionEl, before);
  return optionEl;
}
function frontmatterForFile(app, file) {
  if (!file) return null;
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? null;
}
function getFileFromElement(app, el) {
  const leafEl = el.closest(".workspace-leaf");
  if (!leafEl) return app.workspace.getActiveFile();
  let targetFile = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view.containerEl.parentElement === leafEl) {
      const view = leaf.view;
      if ("file" in view && view.file instanceof import_obsidian11.TFile) {
        targetFile = view.file;
      }
    }
  });
  return targetFile ?? app.workspace.getActiveFile();
}
function readNativeValue(valueContainer) {
  const nativeInput = valueContainer.querySelector("input");
  if (nativeInput?.instanceOf(HTMLInputElement)) return nativeInput.value;
  const nativeEditable = valueContainer.querySelector("[contenteditable]");
  return (nativeEditable?.textContent ?? "").replace(/\s+/g, " ").trim();
}
function optionLabel(spec, value, language) {
  const labelKey = spec.labelKey?.(value) ?? value;
  if (labelKey === value) return value;
  const translated = t(labelKey, language);
  return translated === labelKey ? value : translated;
}
function createPropertySelect(app, spec, property, getLanguage, currentValue, onChange) {
  const language = getLanguage();
  const selectEl = createEl("select", {
    cls: [SELECT_CLASS, "dropdown"],
    attr: {
      "data-testid": "atomic-property-select",
      "data-property": property,
      "aria-label": t("property.selectLabel", language, { property })
    }
  });
  for (const value of spec.values) {
    appendOption(
      selectEl,
      value,
      optionLabel(spec, value, language),
      value === currentValue
    );
  }
  if (currentValue && !spec.values.includes(currentValue)) {
    appendOption(selectEl, currentValue, currentValue, true);
  }
  if (spec.allowCustom) {
    appendOption(
      selectEl,
      CUSTOM_LOCATION_SENTINEL,
      t("property.location.custom", language)
    );
  }
  selectEl.dataset.committedValue = currentValue || spec.values[0] || "";
  selectEl.addEventListener("change", () => {
    const language2 = getLanguage();
    const newValue = selectEl.value;
    selectEl.dataset.lastChanged = Date.now().toString();
    if (spec.allowCustom && newValue === CUSTOM_LOCATION_SENTINEL) {
      const previous = selectEl.dataset.committedValue || "";
      selectEl.value = previous;
      void (async () => {
        const raw = await promptText(
          app,
          t("modal.customLocation", language2),
          "",
          language2
        );
        if (raw === null) return;
        const trimmed = raw.trim();
        if (!trimmed) {
          new import_obsidian11.Notice(t("notice.emptyCustomLocation", language2));
          return;
        }
        selectEl.dataset.committedValue = trimmed;
        if (!Array.from(selectEl.options).some((o) => o.value === trimmed)) {
          const customOption = Array.from(selectEl.options).find(
            (o) => o.value === CUSTOM_LOCATION_SENTINEL
          );
          insertOption(selectEl, customOption ?? null, trimmed, trimmed);
        }
        selectEl.value = trimmed;
        onChange(trimmed);
      })();
      return;
    }
    selectEl.dataset.committedValue = newValue;
    onChange(newValue);
  });
  return selectEl;
}
function writePropertyValue(app, file, key, value, valueContainer) {
  if (valueContainer) {
    const nativeInput = valueContainer.querySelector("input");
    const nativeEditable = valueContainer.querySelector("[contenteditable]");
    if (nativeInput?.instanceOf(HTMLInputElement)) {
      nativeInput.value = value;
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (nativeEditable?.instanceOf(HTMLElement)) {
      nativeEditable.textContent = value;
      nativeEditable.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }
  if (!(file instanceof import_obsidian11.TFile)) return;
  void app.fileManager.processFrontMatter(
    file,
    (frontmatter) => {
      frontmatter[key] = value;
    }
  );
}
function hideNativeEditors(valueContainer) {
  for (const child of Array.from(valueContainer.children)) {
    if (child.classList.contains(SELECT_CLASS)) continue;
    if (child.instanceOf(HTMLElement)) {
      child.hidden = true;
      child.addClass(HIDDEN_CLASS);
    }
  }
}
function syncExistingSelect(selectEl, spec, currentValue, fallbackValue) {
  const lastChanged = Number.parseInt(selectEl.dataset.lastChanged || "0", 10);
  if (Date.now() - lastChanged < SYNC_GRACE_MS) return;
  const valueToSet = currentValue || fallbackValue;
  if (valueToSet && !spec.values.includes(valueToSet)) {
    const hasOption = Array.from(selectEl.options).some(
      (option) => option.value === valueToSet
    );
    if (!hasOption) {
      const customOption = Array.from(selectEl.options).find(
        (option) => option.value === CUSTOM_LOCATION_SENTINEL
      );
      insertOption(selectEl, customOption ?? null, valueToSet, valueToSet);
    }
  }
  if (selectEl.value !== valueToSet) {
    selectEl.value = valueToSet;
  }
  selectEl.dataset.committedValue = valueToSet;
}
function stopBasesPointerCapture(selectEl) {
  const stop = (event) => {
    event.stopPropagation();
  };
  for (const type of [
    "mousedown",
    "mouseup",
    "click",
    "pointerdown",
    "pointerup",
    "focusin"
  ]) {
    selectEl.addEventListener(type, stop);
    selectEl.addEventListener(type, stop, { capture: true });
  }
}
function injectPropertySelect(app, getLanguage, property, spec, valueContainer, file, forBases) {
  const existing = valueContainer.querySelector(`.${SELECT_CLASS}`);
  const currentValue = forBases ? (valueContainer.querySelector(".metadata-input-longtext")?.textContent ?? "").replace(/\s+/g, " ").trim() : readNativeValue(valueContainer);
  if (existing?.instanceOf(HTMLSelectElement)) {
    if (!forBases) hideNativeEditors(valueContainer);
    syncExistingSelect(existing, spec, currentValue, spec.values[0] ?? "");
    return;
  }
  if (!forBases) hideNativeEditors(valueContainer);
  const editableValue = currentValue;
  const selectEl = createPropertySelect(
    app,
    spec,
    property,
    getLanguage,
    editableValue,
    (newValue) => {
      writePropertyValue(app, file, property, newValue, forBases ? void 0 : valueContainer);
    }
  );
  if (forBases) {
    selectEl.classList.add("mod-base");
    stopBasesPointerCapture(selectEl);
  }
  valueContainer.appendChild(selectEl);
}
var PROPERTY_UI_SELECTOR = ".metadata-property, .metadata-container, .metadata-content, .bases-td, .bases-tr, .bases-table";
function elementTouchesPropertyUi(el) {
  return el.matches(PROPERTY_UI_SELECTOR) || !!el.closest(PROPERTY_UI_SELECTOR) || !!el.querySelector(PROPERTY_UI_SELECTOR);
}
function mutationTouchesPropertyUi(mutation) {
  const target = mutation.target;
  const el = target.instanceOf(Element) ? target : target.parentElement;
  if (el && (el.matches(PROPERTY_UI_SELECTOR) || el.closest(PROPERTY_UI_SELECTOR))) {
    return true;
  }
  for (const node of Array.from(mutation.addedNodes)) {
    if (node.instanceOf(Element) && elementTouchesPropertyUi(node)) return true;
  }
  return false;
}
function registerPropertySelects(plugin, options) {
  const app = plugin.app;
  const { getLanguage } = options;
  const inject = (container) => {
    container.querySelectorAll(".metadata-property").forEach((propEl) => {
      const keyEl = propEl.querySelector(".metadata-property-key-input");
      if (!keyEl?.instanceOf(HTMLInputElement)) return;
      const property = (keyEl.value || keyEl.textContent || "").trim();
      if (!property) return;
      if (!propEl.instanceOf(HTMLElement)) return;
      const file = getFileFromElement(app, propEl);
      const frontmatter = frontmatterForFile(app, file);
      const spec = resolvePropertyOptions(property, { frontmatter });
      if (!spec) return;
      const valueContainer = propEl.querySelector(".metadata-property-value");
      if (!valueContainer?.instanceOf(HTMLElement)) return;
      injectPropertySelect(
        app,
        getLanguage,
        property,
        spec,
        valueContainer,
        file,
        false
      );
    });
    for (const property of DROPDOWN_PROPERTY_NAMES) {
      container.querySelectorAll(`.bases-td[data-property="note.${property}"]`).forEach((cellEl) => {
        if (!cellEl.instanceOf(HTMLElement)) return;
        const row = cellEl.closest(".bases-tr");
        if (!row?.instanceOf(HTMLElement)) return;
        const link = row.querySelector(".internal-link");
        const href = link?.getAttribute("data-href") ?? "";
        const file = href ? app.metadataCache.getFirstLinkpathDest(href, "") : null;
        const frontmatter = frontmatterForFile(
          app,
          file instanceof import_obsidian11.TFile ? file : null
        );
        const spec = resolvePropertyOptions(property, { frontmatter });
        if (!spec) return;
        injectPropertySelect(
          app,
          getLanguage,
          property,
          spec,
          cellEl,
          file instanceof import_obsidian11.TFile ? file : null,
          true
        );
      });
    }
  };
  let injectFrame = null;
  const scheduleInject = () => {
    if (injectFrame !== null) return;
    injectFrame = window.requestAnimationFrame(() => {
      injectFrame = null;
      inject(document.body);
    });
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList" || mutation.addedNodes.length === 0) {
        continue;
      }
      if (!mutationTouchesPropertyUi(mutation)) continue;
      scheduleInject();
      return;
    }
  });
  plugin.register(() => {
    observer.disconnect();
    if (injectFrame !== null) {
      window.cancelAnimationFrame(injectFrame);
      injectFrame = null;
    }
  });
  plugin.app.workspace.onLayoutReady(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    inject(document.body);
  });
}

// src/commands/update-note.ts
var import_obsidian12 = require("obsidian");

// src/core/update-notes.json
var update_notes_default = {
  version: "1.5.5",
  body: {
    en: "Atomic has a new look. The dashboard, heatmap, cue cards, book shelf, and timer got a new design. Give them a try.",
    "zh-Hant": "Atomic \u500B\u6A23\u65B0\u5497 \u2014 Dashboard\u3001Heat Map\u3001cue cards\u3001\u66F8\u67B6\u540C timer \u90FD\u6539\u5497\u500B\u8A2D\u8A08\uFF0C\u5FEB\u5572\u8A66\u5413\u5566\uFF01"
  }
};

// src/core/update-notes.ts
var UNSEEN_UPDATE_NOTE_VERSION = "0.0.0";
function nonEmptyText(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}
function parsePluginSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}
function comparePluginSemver(a, b) {
  const left = parsePluginSemver(a);
  const right = parsePluginSemver(b);
  if (!left || !right) {
    throw new Error(`Expected x.y.z semver, got: ${a} vs ${b}`);
  }
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return 0;
}
function parseUpdateNote(raw) {
  if (!isRecord(raw)) return null;
  const version = typeof raw.version === "string" ? raw.version : "";
  if (!parsePluginSemver(version)) return null;
  if (!isRecord(raw.body)) return null;
  const en2 = nonEmptyText(raw.body.en);
  const zhHant = nonEmptyText(raw.body["zh-Hant"]);
  if (!en2 || !zhHant) return null;
  return { version, body: { en: en2, "zh-Hant": zhHant } };
}
var parsedCatalog = parseUpdateNote(update_notes_default);
if (!parsedCatalog) {
  throw new Error(
    "Invalid src/core/update-notes.json. Need version plus body.en and body.zh-Hant."
  );
}
var UPDATE_NOTE = parsedCatalog;
function updateNoteBodyForLanguage(note, language) {
  if (language.startsWith("zh-Hant")) return note.body["zh-Hant"];
  return note.body.en;
}
function formatUpdateNoteNotice(title, body) {
  return `${title}
${body}`;
}
function currentUpdateNote(note, currentVersion) {
  const parsed = parseUpdateNote(note);
  if (!parsed || parsed.version !== currentVersion) return null;
  return parsed;
}
function updateNoteToShow(options) {
  const latest = currentUpdateNote(options.note, options.currentVersion);
  if (!latest) return null;
  const lastSeen = options.lastSeenVersion.trim();
  if (!parsePluginSemver(lastSeen)) return null;
  if (comparePluginSemver(latest.version, lastSeen) <= 0) return null;
  return latest;
}

// src/commands/update-note.ts
var UPDATE_NOTE_NOTICE_MS = 8e3;
var activeUpdateNotice = null;
async function persistSeenUpdateNote(plugin) {
  const current = plugin.manifest.version;
  if (plugin.settings.lastSeenUpdateNoteVersion === current) return;
  plugin.settings.lastSeenUpdateNoteVersion = current;
  await plugin.saveSettings();
}
function promptPendingUpdateNote(plugin) {
  const note = updateNoteToShow({
    note: UPDATE_NOTE,
    lastSeenVersion: plugin.settings.lastSeenUpdateNoteVersion,
    currentVersion: plugin.manifest.version
  });
  if (!note) {
    void persistSeenUpdateNote(plugin);
    return;
  }
  const language = plugin.settings.language;
  const message = formatUpdateNoteNotice(
    t("notice.updateNoteTitle", language, { version: note.version }),
    updateNoteBodyForLanguage(note, language)
  );
  showUpdateNoteNotice(message);
  void persistSeenUpdateNote(plugin);
}
function showUpdateNoteNotice(message) {
  activeUpdateNotice?.hide();
  const notice = new import_obsidian12.Notice(message, UPDATE_NOTE_NOTICE_MS);
  if ((0, import_obsidian12.requireApiVersion)("1.8.7")) {
    notice.messageEl.addClass("atomic-update-note-notice");
    notice.messageEl.setAttr("data-testid", "atomic-update-note-notice");
  }
  activeUpdateNotice = notice;
}

// src/settings.ts
var import_obsidian13 = require("obsidian");

// src/util/merge-settings.ts
function safeVaultPath(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return isSafeVaultFolder(trimmed) ? trimmed : fallback;
}
function stringField(value) {
  return typeof value === "string" ? value : "";
}
function cloneActivities(activityTypes) {
  return activityTypes.map((activity) => ({
    ...activity,
    enabled: activity.enabled !== false,
    baseColor: activity.baseColor,
    colors: [
      activity.colors[0],
      activity.colors[1],
      activity.colors[2],
      activity.colors[3]
    ]
  }));
}
function normalizeActivities(values, fallback) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values.map((value) => normalizeActivityType(value, fallback[0].colors)).filter((activity) => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}
function appendMissingBuiltInHobbies(activityTypes, builtIns) {
  const existingIds = new Set(activityTypes.map((activity) => activity.id));
  const addedBuiltIns = builtIns.filter(
    (activity) => activity.domain === "hobby" && !existingIds.has(activity.id)
  );
  return [...activityTypes, ...cloneActivities(addedBuiltIns)];
}
function legacySeriesActivities(values, fallback) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values.map((value) => activityTypeFromSeries(value, fallback[0].colors)).filter((activity) => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}
function storedLastSeenUpdateNoteVersion(raw) {
  if (!("lastSeenUpdateNoteVersion" in raw)) return UNSEEN_UPDATE_NOTE_VERSION;
  const value = stringField(raw.lastSeenUpdateNoteVersion).trim();
  return parsePluginSemver(value) ? value : UNSEEN_UPDATE_NOTE_VERSION;
}
function mergeSettings(raw) {
  const base = {
    ...DEFAULT_SETTINGS,
    activityTypes: cloneActivities(DEFAULT_SETTINGS.activityTypes),
    gymExercises: [...DEFAULT_SETTINGS.gymExercises]
  };
  if (!isRecord(raw)) return base;
  const golfCuesPath = safeVaultPath(
    stringField(raw.golfCuesPath).trim() || stringField(raw.cuesPath).trim(),
    base.golfCuesPath
  );
  const fromActivityTypes = normalizeActivities(
    raw.activityTypes,
    base.activityTypes
  );
  const fromLegacySeries = legacySeriesActivities(raw.series, base.activityTypes);
  let activityTypes;
  if (fromActivityTypes) {
    activityTypes = fromActivityTypes;
  } else if (fromLegacySeries) {
    activityTypes = appendMissingBuiltInHobbies(
      fromLegacySeries,
      DEFAULT_SETTINGS.activityTypes
    );
  } else {
    activityTypes = cloneActivities(base.activityTypes);
  }
  const timezone = stringField(raw.timezone);
  return {
    language: isLanguage(raw.language) ? raw.language : DEFAULT_LANGUAGE,
    timezone: timezone || base.timezone,
    dashboardPath: safeVaultPath(raw.dashboardPath, base.dashboardPath),
    golfCuesPath,
    gymCuesPath: safeVaultPath(raw.gymCuesPath, base.gymCuesPath),
    activityTypes,
    gymExercises: normalizeGymExercises(raw.gymExercises),
    gymLogSetup: isGymLogSetup(raw.gymLogSetup) ? raw.gymLogSetup : "pending",
    lastSeenUpdateNoteVersion: storedLastSeenUpdateNoteVersion(raw)
  };
}

// src/settings.ts
function styleDestructiveButton(button) {
  button.buttonEl.addClass("mod-warning");
}
function wrapLastSettingControl(setting, options) {
  const last = setting.controlEl.lastElementChild;
  if (!last) return;
  const classes = options.action ? "atomic-setting-field atomic-setting-field-action" : "atomic-setting-field";
  const field = setting.controlEl.createDiv({
    cls: classes,
    attr: { "data-testid": options.testId }
  });
  field.createSpan({
    cls: options.action ? "atomic-setting-field-label is-spacer" : "atomic-setting-field-label",
    text: options.action ? "\xA0" : options.label,
    attr: { "data-testid": `${options.testId}-label` }
  });
  field.appendChild(last);
}
function isFunction(value) {
  return typeof value === "function";
}
function callNamedMethod(target, name) {
  const method = target[name];
  if (!isFunction(method)) return false;
  method.call(target);
  return true;
}
var ConfirmDeleteActivityModal = class extends import_obsidian13.Modal {
  constructor(app, options) {
    super(app);
    this.message = options.message;
    this.confirmLabel = options.confirmLabel;
    this.cancelLabel = options.cancelLabel;
    this.onConfirm = options.onConfirm;
  }
  onOpen() {
    this.modalEl.setAttr("data-testid", "atomic-confirm-delete-modal");
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: this.message });
    new import_obsidian13.Setting(this.contentEl).addButton(
      (button) => button.setButtonText(this.cancelLabel).onClick(() => this.close())
    ).addButton((button) => {
      button.setButtonText(this.confirmLabel);
      styleDestructiveButton(button);
      button.onClick(() => {
        this.onConfirm();
        this.close();
      });
    });
  }
};
var FitnessSettingTab = class extends import_obsidian13.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.pendingExerciseName = "";
    this.pendingHobbyName = "";
    this.plugin = plugin;
  }
  /** Fallback for Obsidian < 1.13.0. 1.13+ renders `getSettingDefinitions()`. */
  display() {
    this.paintSettings(this.containerEl);
  }
  getSettingDefinitions() {
    return this.settingsRows().map((row) => {
      switch (row.kind) {
        case "control":
          return {
            name: row.name,
            desc: row.desc,
            control: this.controlFor(row.key)
          };
        case "heading":
          return {
            name: row.name,
            desc: row.desc,
            render: (setting) => {
              setting.setHeading();
            }
          };
        case "custom":
          return {
            name: row.name,
            desc: row.desc,
            aliases: row.aliases,
            render: (setting) => {
              row.paint(setting);
            }
          };
        default: {
          const _exhaustive = row;
          return _exhaustive;
        }
      }
    });
  }
  getControlValue(key) {
    if (key === "language") return this.plugin.settings.language;
    if (key === "timezone") return this.plugin.settings.timezone;
    if (key === "dashboardPath") return this.plugin.settings.dashboardPath;
    return void 0;
  }
  async setControlValue(key, value) {
    if (key === "language") {
      if (typeof value !== "string" || !isLanguage(value)) return;
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.redrawSettings();
      await this.plugin.refreshAll();
      new import_obsidian13.Notice(t("notice.reloadForCommands", value));
      return;
    }
    if (key === "timezone") {
      if (typeof value !== "string") return;
      this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
      await this.plugin.saveSettings();
      void this.plugin.refreshAll();
      return;
    }
    if (key === "dashboardPath") {
      if (typeof value !== "string") return;
      const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
      if (!isSafeVaultFolder(next)) {
        new import_obsidian13.Notice(t("notice.folderUnsafe", this.plugin.settings.language));
        return;
      }
      this.plugin.settings.dashboardPath = next;
      await this.plugin.saveSettings();
    }
  }
  redrawSettings() {
    if (callNamedMethod(this, "update")) return;
    this.paintSettings(this.containerEl);
  }
  settingsRows() {
    const language = this.plugin.settings.language;
    const rows = [
      {
        kind: "control",
        name: t("settings.language", language),
        desc: t("settings.languageDesc", language),
        key: "language"
      },
      {
        kind: "control",
        name: t("settings.timezone", language),
        desc: t("settings.timezoneDesc", language),
        key: "timezone"
      },
      {
        kind: "control",
        name: t("settings.dashboardPath", language),
        desc: t("settings.dashboardPathDesc", language),
        key: "dashboardPath"
      },
      {
        kind: "heading",
        name: t("settings.exerciseTypes", language),
        desc: t("settings.exerciseTypesDesc", language)
      }
    ];
    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      rows.push(...this.activityRows(activity, { showCues: true }));
    }
    rows.push({
      kind: "custom",
      name: t("settings.addExerciseType", language),
      desc: t("settings.addExerciseTypeDesc", language),
      paint: (setting) => {
        this.paintAddActivity(setting, "exercise");
      }
    });
    rows.push({
      kind: "heading",
      name: t("settings.hobbyTypes", language),
      desc: t("settings.hobbyTypesDesc", language)
    });
    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      rows.push(...this.activityRows(activity, { showCues: false }));
    }
    rows.push({
      kind: "custom",
      name: t("settings.addHobbyType", language),
      desc: t("settings.addHobbyTypeDesc", language),
      paint: (setting) => {
        this.paintAddActivity(setting, "hobby");
      }
    });
    rows.push({
      kind: "heading",
      name: t("settings.gymExercises", language),
      desc: t("settings.gymExercisesDesc", language)
    });
    rows.push({
      kind: "custom",
      name: t("settings.gymImport", language),
      desc: t("settings.gymImportDesc", language),
      paint: (setting) => {
        this.paintGymImport(setting);
      }
    });
    return rows;
  }
  activityRows(activity, options) {
    const language = this.plugin.settings.language;
    return [
      {
        kind: "custom",
        name: labelForLanguage(activity.label, language),
        desc: t("settings.activityId", language, { id: activity.id }),
        aliases: [activity.id, activity.label],
        paint: (setting) => {
          this.paintActivityControls(setting, activity, options);
        }
      },
      {
        kind: "custom",
        name: t("settings.baseColor", language, {
          label: labelForLanguage(activity.label, language)
        }),
        desc: t("settings.baseColorDesc", language),
        aliases: [activity.id, "color"],
        paint: (setting) => {
          this.paintColorControls(setting, activity);
        }
      }
    ];
  }
  controlFor(key) {
    const language = this.plugin.settings.language;
    switch (key) {
      case "language":
        return {
          type: "dropdown",
          key: "language",
          options: {
            "zh-Hant-en": t("settings.languageOption.zh-Hant-en", language),
            en: t("settings.languageOption.en", language)
          }
        };
      case "timezone":
        return {
          type: "text",
          key: "timezone",
          placeholder: "Asia/Hong_Kong"
        };
      case "dashboardPath":
        return {
          type: "text",
          key: "dashboardPath",
          placeholder: DEFAULT_SETTINGS.dashboardPath,
          validate: (value) => {
            const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
            if (!isSafeVaultFolder(next)) {
              return t("notice.folderUnsafe", this.plugin.settings.language);
            }
          }
        };
      default: {
        const _exhaustive = key;
        return _exhaustive;
      }
    }
  }
  paintBoundControl(setting, key) {
    const control = this.controlFor(key);
    switch (control.type) {
      case "dropdown":
        setting.addDropdown((dropdown) => {
          for (const [value, label] of Object.entries(control.options)) {
            dropdown.addOption(value, label);
          }
          dropdown.setValue(String(this.getControlValue(key) ?? ""));
          dropdown.onChange((value) => {
            void this.setControlValue(key, value);
          });
        });
        return;
      case "text":
        setting.addText((text) => {
          if (control.placeholder) text.setPlaceholder(control.placeholder);
          text.setValue(String(this.getControlValue(key) ?? ""));
          text.onChange((value) => {
            void this.setControlValue(key, value);
          });
        });
        return;
      default: {
        const _exhaustive = control;
        return _exhaustive;
      }
    }
  }
  paintSettings(containerEl) {
    containerEl.empty();
    for (const row of this.settingsRows()) {
      const setting = new import_obsidian13.Setting(containerEl).setName(row.name).setDesc(row.desc);
      switch (row.kind) {
        case "heading":
          setting.setHeading();
          break;
        case "control":
          this.paintBoundControl(setting, row.key);
          break;
        case "custom":
          row.paint(setting);
          break;
        default: {
          const _exhaustive = row;
          return _exhaustive;
        }
      }
    }
  }
  async saveAndRefresh() {
    await this.plugin.saveSettings();
    await this.plugin.refreshAll();
  }
  uniqueActivityId(baseId) {
    const used = new Set(this.plugin.settings.activityTypes.map((activity) => activity.id));
    if (!used.has(baseId)) return baseId;
    let index = 2;
    while (used.has(`${baseId}-${index}`)) index += 1;
    return `${baseId}-${index}`;
  }
  paintActivityControls(setting, activity, options) {
    const language = this.plugin.settings.language;
    const folderPlaceholder = options.showCues ? t("settings.exerciseFolderPlaceholder", language) : t("settings.hobbyFolderPlaceholder", language);
    setting.setClass("atomic-setting-exercise-type");
    if (activity.enabled === false) {
      setting.settingEl.addClass("is-disabled");
    }
    setting.addToggle((toggle) => {
      toggle.setTooltip(t("settings.enabledTooltip", language)).setValue(activity.enabled !== false).onChange(async (value) => {
        activity.enabled = value;
        setting.settingEl.toggleClass("is-disabled", !value);
        await this.saveAndRefresh();
      });
      toggle.toggleEl.setAttr("aria-label", t("settings.enabledLabel", language));
    });
    wrapLastSettingControl(setting, {
      label: t("settings.enabledLabel", language),
      testId: "atomic-setting-enabled"
    });
    setting.addText((text) => {
      text.setPlaceholder(t("settings.labelPlaceholder", language)).setValue(labelForLanguage(activity.label, language)).onChange(async (value) => {
        const label = applyLabelEdit(activity.label, value, language);
        if (!value.trim() || label === activity.label) return;
        activity.label = label;
        await this.saveAndRefresh();
      });
      text.inputEl.setAttr("aria-label", t("settings.labelField", language));
    });
    wrapLastSettingControl(setting, {
      label: t("settings.labelField", language),
      testId: "atomic-setting-label"
    });
    setting.addText((text) => {
      text.setPlaceholder(folderPlaceholder).setValue(activity.folder).onChange(async (value) => {
        const folder = value.trim();
        if (!isSafeVaultFolder(folder)) {
          new import_obsidian13.Notice(t("notice.folderUnsafe", this.plugin.settings.language));
          return;
        }
        activity.folder = folder;
        await this.saveAndRefresh();
      });
      text.inputEl.setAttr("aria-label", t("settings.folderField", language));
    });
    wrapLastSettingControl(setting, {
      label: t("settings.folderField", language),
      testId: "atomic-setting-folder"
    });
    setting.settingEl.setAttr("data-testid", "atomic-setting-activity");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    if (options.showCues) {
      setting.addToggle((toggle) => {
        toggle.setTooltip(t("settings.enableCuesTooltip", language)).setValue(activity.supportsCues).onChange(async (value) => {
          activity.supportsCues = value;
          await this.saveAndRefresh();
        });
        toggle.toggleEl.setAttr("aria-label", t("settings.cuesLabel", language));
      });
      wrapLastSettingControl(setting, {
        label: t("settings.cuesLabel", language),
        testId: "atomic-setting-cues"
      });
    }
    setting.addButton((button) => {
      button.setButtonText(t("settings.delete", language));
      styleDestructiveButton(button);
      button.onClick(() => {
        this.confirmDeleteActivity(activity);
      });
    });
    wrapLastSettingControl(setting, {
      label: "",
      testId: "atomic-setting-delete",
      action: true
    });
  }
  paintColorControls(setting, activity) {
    setting.setClass("atomic-setting-colors");
    setting.addColorPicker(
      (picker) => picker.setValue(activity.baseColor || activity.colors[2]).onChange(async (value) => {
        activity.baseColor = value;
        activity.colors = shadesFromBaseColor(value);
        await this.saveAndRefresh();
        this.renderColorSwatches(setting.controlEl, activity);
      })
    );
    setting.settingEl.setAttr("data-testid", "atomic-setting-colors");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    this.renderColorSwatches(setting.controlEl, activity);
  }
  paintAddActivity(setting, kind) {
    const language = this.plugin.settings.language;
    const isHobby = kind === "hobby";
    setting.addText(
      (text) => text.setPlaceholder(
        t(
          isHobby ? "settings.hobbyNamePlaceholder" : "settings.exerciseNamePlaceholder",
          language
        )
      ).setValue(isHobby ? this.pendingHobbyName : this.pendingExerciseName).onChange((value) => {
        if (isHobby) this.pendingHobbyName = value;
        else this.pendingExerciseName = value;
      })
    ).addButton(
      (button) => button.setButtonText(t("settings.add", language)).onClick(async () => {
        const name = (isHobby ? this.pendingHobbyName : this.pendingExerciseName).trim();
        if (!name) {
          new import_obsidian13.Notice(
            t(
              isHobby ? "notice.enterHobbyType" : "notice.enterExerciseType",
              this.plugin.settings.language
            )
          );
          return;
        }
        const activity = isHobby ? createHobbyActivityType(name) : createExerciseActivityType(name);
        activity.id = this.uniqueActivityId(activity.id);
        this.plugin.settings.activityTypes = [
          ...this.plugin.settings.activityTypes,
          activity
        ];
        if (isHobby) this.pendingHobbyName = "";
        else this.pendingExerciseName = "";
        await this.saveAndRefresh();
        this.redrawSettings();
      })
    );
    if (isHobby) {
      setting.settingEl.setAttr("data-testid", "atomic-setting-add-hobby");
    }
  }
  paintGymImport(setting) {
    const language = this.plugin.settings.language;
    const count = this.plugin.settings.gymExercises.length;
    setting.setDesc(
      `${t("settings.gymImportDesc", language)} ${t("settings.gymExercisesCount", language, { count })}`
    );
    setting.addButton((button) => {
      button.setButtonText(t("settings.gymImport", language));
      button.buttonEl.setAttr("data-testid", "atomic-setting-gym-import");
      button.onClick(() => {
        void runGymLogSetup(this.plugin).then(() => this.redrawSettings());
      });
    });
    setting.settingEl.setAttr("data-testid", "atomic-setting-gym-exercises");
  }
  renderColorSwatches(controlEl, activity) {
    controlEl.querySelectorAll(".atomic-color-swatch-row").forEach((node) => node.remove());
    const row = controlEl.createDiv({
      cls: "atomic-color-swatch-row",
      attr: { "data-testid": "atomic-color-swatch-row" }
    });
    row.createSpan({
      cls: "atomic-setting-field-label",
      text: t("settings.heatmapShades", this.plugin.settings.language),
      attr: { "data-testid": "atomic-setting-shades-label" }
    });
    for (const color of activity.colors) {
      const swatch = row.createDiv({
        cls: "atomic-color-swatch",
        attr: { "data-testid": "atomic-color-swatch" }
      });
      swatch.style.backgroundColor = color;
      swatch.title = color;
    }
  }
  confirmDeleteActivity(activity) {
    const language = this.plugin.settings.language;
    new ConfirmDeleteActivityModal(this.app, {
      message: t("settings.deleteConfirm", language, {
        label: labelForLanguage(activity.label, language)
      }),
      confirmLabel: t("settings.delete", language),
      cancelLabel: t("modal.cancel", language),
      onConfirm: () => {
        void this.deleteActivity(activity);
      }
    }).open();
  }
  async deleteActivity(activity) {
    this.plugin.settings.activityTypes = this.plugin.settings.activityTypes.filter(
      (candidate) => candidate.id !== activity.id
    );
    await this.saveAndRefresh();
    this.redrawSettings();
    new import_obsidian13.Notice(
      t("notice.activityDeleted", this.plugin.settings.language, {
        label: labelForLanguage(activity.label, this.plugin.settings.language)
      })
    );
  }
};

// src/util/refresh-path.ts
function normalizeVaultPath2(path) {
  return normalizeSlashes(path.trim());
}
function parentFolder(filePath) {
  const norm = normalizeVaultPath2(filePath);
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  const parent = norm.slice(0, idx);
  return isSafeVaultFolder(parent) ? parent : null;
}
function collectAtomicDataRoots(settings) {
  const folderRoots = /* @__PURE__ */ new Set(["atomics"]);
  const filePaths = /* @__PURE__ */ new Set();
  for (const activity of settings.activityTypes) {
    if (isSafeVaultFolder(activity.folder)) {
      folderRoots.add(normalizeVaultPath2(activity.folder).replace(/\/$/, ""));
    }
  }
  for (const configured of [
    settings.dashboardPath,
    settings.golfCuesPath,
    settings.gymCuesPath
  ]) {
    const norm = normalizeVaultPath2(configured);
    if (!norm) continue;
    filePaths.add(norm);
    const parent = parentFolder(norm);
    if (parent) folderRoots.add(parent);
  }
  return {
    folderRoots: [...folderRoots],
    filePaths: [...filePaths]
  };
}
function isUnderFolderRoot(normPath, normRoot) {
  return normPath === normRoot || normPath.startsWith(`${normRoot}/`);
}
function pathAffectsAtomicRefresh(path, roots, liveBlockSourcePaths) {
  const norm = normalizeVaultPath2(path);
  if (!norm) return false;
  if (liveBlockSourcePaths.includes(norm)) return true;
  if (roots.filePaths.includes(norm)) return true;
  return roots.folderRoots.some((root) => isUnderFolderRoot(norm, root));
}

// src/util/rewrite-cue-fences.ts
var DEDICATED_OPEN = /(^|\n)(```+|~~~+)(atomic-golf-cues|atomic-gym-cues)(?![A-Za-z0-9_-])([^\n]*)(\n|$)/g;
var DEDICATED_HOST_IDS = ["golf", "gym"];
function rewriteDedicatedCueFences(markdown) {
  return String(markdown || "").replace(
    DEDICATED_OPEN,
    (_full, pre, fence, lang, rest, nl) => {
      const activity = lang === "atomic-golf-cues" ? "golf" : "gym";
      return `${pre}${fence}atomic-cues${rest}${nl}activity: ${activity}
`;
    }
  );
}
function dedicatedCueHostPaths(settings) {
  const paths = /* @__PURE__ */ new Set();
  if (settings.golfCuesPath) paths.add(settings.golfCuesPath);
  if (settings.gymCuesPath) paths.add(settings.gymCuesPath);
  for (const id of DEDICATED_HOST_IDS) {
    const activity = settings.activityTypes.find((candidate) => candidate.id === id);
    if (activity?.supportsCues) paths.add(cuePathForActivity(activity));
  }
  return [...paths];
}

// src/main.ts
var REFRESH_DEBOUNCE_MS = 300;
var FitnessPlugin = class extends import_obsidian14.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.liveBlocks = [];
    this.refreshTimer = null;
    this.unloaded = false;
  }
  async onload() {
    this.unloaded = false;
    this.data = new VaultDataSource(this.app);
    registerCodeblocks(this);
    await this.loadSettings();
    registerPropertySelects(this, {
      getLanguage: () => this.settings.language
    });
    this.addSettingTab(new FitnessSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded) return;
      this.registerVaultEvents();
      for (const path of dedicatedCueHostPaths(this.settings)) {
        void this.data.processNote(path, rewriteDedicatedCueFences);
      }
      this.scheduleRefresh();
      this.ensureCuesHosts();
      this.promptGymLogSetupIfPending();
      this.promptUpdateNoteIfNeeded();
    });
    this.addCommand({
      id: "new-gym-session",
      name: t("command.newGymSession", this.settings.language),
      callback: () => {
        void this.createGymSession();
      }
    });
    this.addCommand({
      id: "new-golf-session",
      name: t("command.newGolfSession", this.settings.language),
      callback: () => {
        void this.createGolfSession();
      }
    });
    this.addCommand({
      id: "new-exercise-session",
      name: t("command.newExerciseSession", this.settings.language),
      callback: () => {
        void this.createExerciseSession();
      }
    });
    this.addCommand({
      id: "new-reading-item",
      name: t("command.newReadingItem", this.settings.language),
      callback: () => {
        void this.createReadingItem();
      }
    });
    this.addCommand({
      id: "new-hobby-item",
      name: t("command.newHobbyItem", this.settings.language),
      callback: () => {
        void this.createHobbyItem();
      }
    });
    this.addCommand({
      id: "create-reading-bookshelf",
      name: t("command.createReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new import_obsidian14.Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void createReadingBookshelfCommand(this.app, this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "open-reading-bookshelf",
      name: t("command.openReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new import_obsidian14.Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void openReadingBookshelfCommand(this.app, this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "create-book-shelf",
      name: t("command.createBookShelf", this.settings.language),
      callback: () => {
        void createBookShelfHostCommand(this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "open-book-shelf",
      name: t("command.openBookShelf", this.settings.language),
      callback: () => {
        void openBookShelfHostCommand(this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "create-cues",
      name: t("command.createCues", this.settings.language),
      callback: () => {
        void createCuesHostCommand(
          this.data,
          this.settings.activityTypes,
          this.settings.language
        );
      }
    });
    this.addCommand({
      id: "create-daily-note-template",
      name: t("command.createDailyNoteTemplate", this.settings.language),
      callback: () => {
        void createDailyNoteTemplateCommand(
          this.app,
          this.data,
          this.settings.activityTypes,
          this.settings.language
        );
      }
    });
    this.addCommand({
      id: "create-todays-daily-note",
      name: t("command.createTodaysDailyNote", this.settings.language),
      callback: () => {
        void createTodaysDailyNoteCommand(
          this.app,
          this.data,
          this.settings.activityTypes,
          this.settings.timezone,
          this.settings.language
        );
      }
    });
    this.addCommand({
      id: "open-dashboard",
      name: t("command.openDashboard", this.settings.language),
      callback: () => {
        void this.openDashboard();
      }
    });
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        if (!this.liveBlocks.some((block) => block.el.isConnected)) return;
        if (!this.data.invalidateUnreadyPrefixes()) return;
        this.scheduleRefresh();
      })
    );
  }
  onunload() {
    this.unloaded = true;
    this.liveBlocks = [];
    if (this.refreshTimer != null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  registerVaultEvents() {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.handleVaultPathChange(file.path, oldPath);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
  }
  async loadSettings() {
    this.settings = mergeSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  promptGymLogSetupIfPending() {
    promptGymLogSetup(this);
  }
  promptUpdateNoteIfNeeded() {
    promptPendingUpdateNote(this);
  }
  /** Ensure `{folder}/Cues.md` for every enabled cue-supporting exercise. Silent; open/command retry. */
  ensureCuesHosts() {
    void ensureCuesHostFiles(
      this.data,
      this.settings.activityTypes,
      this.settings.language
    ).catch(() => void 0);
  }
  /**
   * Register a codeblock for refreshes, replacing an earlier entry for the same
   * host. Connectivity is deliberately not consulted here or in `refreshAll`:
   * the editor detaches offscreen codeblocks without re-running their
   * post-processor, so pruning detached hosts silently stopped refreshing every
   * other block on the note. `AtomicBlockChild` owns both calls, and its
   * `onunload` is now the only thing that bounds this list.
   */
  trackLiveBlock(block) {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el !== block.el);
    this.liveBlocks.push(block);
  }
  untrackLiveBlock(block) {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el !== block.el);
  }
  scheduleRefresh() {
    if (this.refreshTimer != null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshAll();
    }, REFRESH_DEBOUNCE_MS);
  }
  async refreshAll() {
    await Promise.all(
      this.liveBlocks.map((block) => renderTrackedBlock(this, block))
    );
  }
  liveBlockSourcePaths() {
    return this.liveBlocks.map((block) => block.sourcePath);
  }
  pathAffectsRefresh(path) {
    return pathAffectsAtomicRefresh(
      path,
      collectAtomicDataRoots(this.settings),
      this.liveBlockSourcePaths()
    );
  }
  handleVaultPathChange(path, oldPath) {
    const affectsCurrent = this.pathAffectsRefresh(path) || oldPath != null && this.pathAffectsRefresh(oldPath);
    if (!affectsCurrent) return;
    if (oldPath != null) {
      this.data.renameNoteParseCaches(oldPath, path);
      this.data.invalidateListCache(oldPath);
    } else {
      this.data.invalidateNoteParseCaches(path);
    }
    this.data.invalidateListCache(path);
    this.scheduleRefresh();
  }
  exerciseActivityById(id) {
    return exerciseActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id
    );
  }
  hobbyActivityById(id) {
    return hobbyActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id
    );
  }
  chooseActivity(activities, emptyNoticeKey, placeholderKey) {
    if (!activities.length) {
      new import_obsidian14.Notice(t(emptyNoticeKey, this.settings.language));
      return Promise.resolve(null);
    }
    return suggestItem(
      this.app,
      t(placeholderKey, this.settings.language),
      activities,
      (activity) => labelForLanguage(activity.label, this.settings.language)
    );
  }
  chooseExerciseActivity() {
    return this.chooseActivity(
      exerciseActivities(this.settings.activityTypes),
      "notice.noExerciseActivities",
      "modal.exerciseTypePlaceholder"
    );
  }
  chooseHobbyActivity() {
    return this.chooseActivity(
      hobbyActivities(this.settings.activityTypes),
      "notice.noHobbyActivities",
      "modal.hobbyTypePlaceholder"
    );
  }
  async createExerciseSession(activity) {
    const picked = activity ?? await this.chooseExerciseActivity();
    if (!picked) return;
    await createActivitySession(
      this.app,
      this.data,
      picked,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createGymSession() {
    const activity = this.exerciseActivityById("gym");
    if (!activity) {
      new import_obsidian14.Notice(t("notice.noGymActivity", this.settings.language));
      return;
    }
    await createActivitySession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createGolfSession() {
    const activity = this.exerciseActivityById("golf");
    if (!activity) {
      new import_obsidian14.Notice(t("notice.noGolfActivity", this.settings.language));
      return;
    }
    await createActivitySession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createReadingItem() {
    const activity = this.hobbyActivityById("reading");
    if (!activity) {
      new import_obsidian14.Notice(t("notice.noReadingHobby", this.settings.language));
      return;
    }
    await createReadingItem(this.app, this.data, activity, this.settings.language);
  }
  async createHobbyItem(activity) {
    const picked = activity ?? await this.chooseHobbyActivity();
    if (!picked) return;
    await createHobbyItem(this.app, this.data, picked, this.settings.language);
  }
  async openDashboard() {
    const path = this.settings.dashboardPath;
    if (!this.data.exists(path)) {
      new import_obsidian14.Notice(t("notice.dashboardNotFound", this.settings.language, { path }));
      return;
    }
    await this.data.openPath(path);
  }
};
