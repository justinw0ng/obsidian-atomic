import test from "node:test";
import assert from "node:assert/strict";
import {
  appendCueBullet,
  buildCueCards,
  isRemindersHeadingLabel,
  normalizeCue,
  parseReminders,
  sanitizeCueText,
} from "../src/core/cues.ts";
import { en } from "../src/i18n/locales/en.ts";
import { zhHantEn } from "../src/i18n/locales/zh-Hant-en.ts";

test("buildCueCards keeps every cue of the year, newest first", () => {
  const cards = buildCueCards(
    [
      { text: "Keep lead arm soft", date: "2026-01-02", focus: "Grip" },
      { text: "One-off cue", date: "2026-02-01", focus: "Tempo" },
      { text: "keep  lead arm soft", date: "2026-03-01", focus: "Grip" },
      { text: "Last year", date: "2025-12-31", focus: "Tempo" },
    ],
    2026,
  );

  assert.deepEqual(
    cards.map((card) => [card.key, card.count, card.lastSeen]),
    [
      ["keep lead arm soft", 2, "2026-03-01"],
      ["one-off cue", 1, "2026-02-01"],
    ],
  );
});

test("buildCueCards collapses repeats onto one card and keeps its focus", () => {
  const cards = buildCueCards(
    [
      { text: "Smooth tempo", date: "2026-04-01", focus: "Tempo" },
      { text: "smooth tempo", date: "2026-05-01", focus: "" },
      { text: "Smooth Tempo", date: "2026-06-01", focus: "Rhythm" },
    ],
    2026,
  );

  assert.equal(cards.length, 1);
  assert.equal(cards[0].count, 3);
  assert.equal(cards[0].focus, "Rhythm");
  assert.equal(cards[0].text, "Smooth Tempo");
});

test("buildCueCards drops blank cues and other years", () => {
  const cards = buildCueCards(
    [
      { text: "   ", date: "2026-01-01" },
      { text: "Real cue", date: "2026-01-01" },
      { text: "Other year", date: "2025-01-01" },
      { text: "No date", date: "" },
    ],
    2026,
  );

  assert.deepEqual(cards.map((card) => card.text), ["Real cue"]);
});

test("buildCueCards keeps note order for cues that share a date", () => {
  const cards = buildCueCards(
    [
      { text: "First written", date: "2026-09-12" },
      { text: "Second written", date: "2026-09-12" },
      { text: "Third written", date: "2026-09-12" },
      { text: "Older", date: "2026-09-01" },
    ],
    2026,
  );

  assert.deepEqual(cards.map((card) => card.text), [
    "First written",
    "Second written",
    "Third written",
    "Older",
  ]);
});

test("normalizeCue folds case and whitespace", () => {
  assert.equal(normalizeCue("  Keep  Lead Arm Soft "), "keep lead arm soft");
  assert.equal(normalizeCue(""), "");
});

test("sanitizeCueText flattens input so it cannot forge markdown", () => {
  assert.equal(sanitizeCueText("  Soft grip  "), "Soft grip");
  assert.equal(
    sanitizeCueText("Soft grip\n- Injected bullet"),
    "Soft grip - Injected bullet",
  );
  assert.equal(sanitizeCueText("- - Soft grip"), "Soft grip");
  assert.equal(sanitizeCueText("> ## Soft grip"), "Soft grip");
  assert.equal(sanitizeCueText("\n\n"), "");
});

test("appendCueBullet adds a bullet under an existing Reminders heading", () => {
  const markdown = `# Golf — 2026-08-02

## 💡 Reminders

- Keep lead arm soft

## Next

- ignore me
`;

  const updated = appendCueBullet(markdown, "Finish balanced", "💡 Reminders");
  assert.deepEqual(parseReminders(updated), [
    "Keep lead arm soft",
    "Finish balanced",
  ]);
  assert.match(updated, /## Next\n\n- ignore me\n$/);
});

test("appendCueBullet replaces the empty bullet placeholder", () => {
  const markdown = `# Golf — 2026-08-02

## 💡 Reminders

- 
`;

  const updated = appendCueBullet(markdown, "Soft grip", "💡 Reminders");
  assert.equal(updated, "# Golf — 2026-08-02\n\n## 💡 Reminders\n\n- Soft grip\n");
});

test("appendCueBullet creates the Reminders section when the note has none", () => {
  const updated = appendCueBullet("# Gym — 2026-08-02\n", "Brace the core", "💡 Reminders");
  assert.equal(updated, "# Gym — 2026-08-02\n\n## 💡 Reminders\n\n- Brace the core\n");
});

test("appendCueBullet keeps the note untouched for an empty cue", () => {
  assert.equal(appendCueBullet("# Gym\n", "   ", "💡 Reminders"), "# Gym\n");
  assert.equal(appendCueBullet("# Gym", "\n- ", "💡 Reminders"), "# Gym\n");
});

test("appendCueBullet sanitizes so a pasted cue cannot forge extra bullets", () => {
  const updated = appendCueBullet(
    "# Golf\n\n## 💡 Reminders\n\n- First\n",
    "Second\n- Forged\n## Forged heading",
    "💡 Reminders",
  );

  assert.deepEqual(parseReminders(updated), [
    "First",
    "Second - Forged ## Forged heading",
  ]);
  assert.doesNotMatch(updated, /\n- Forged/);
  assert.doesNotMatch(updated, /\n## Forged heading/);
});

test("appendCueBullet stops at the next same-level heading", () => {
  const updated = appendCueBullet(
    "## 💡 Reminders\n\n- First\n\n## Session log\n\n- keep\n",
    "Second",
    "💡 Reminders",
  );

  assert.equal(
    updated,
    "## 💡 Reminders\n\n- First\n- Second\n\n## Session log\n\n- keep\n",
  );
});

test("appendCueBullet writes past the cue form fence, not inside it", () => {
  const markdown = `# Gym — 2026-09-12

## 💡 Reminders

\`\`\`atomic-cue-log
# No options. Type a cue and add it.
\`\`\`

- Brace the core
`;

  const updated = appendCueBullet(markdown, "Knees over toes", "💡 Reminders");
  assert.match(updated, /\n- Brace the core\n- Knees over toes\n$/);
  assert.deepEqual(parseReminders(updated), ["Brace the core", "Knees over toes"]);
});

test("appendCueBullet leaves a blank line after a fence-only section", () => {
  const markdown = `## 💡 Reminders

\`\`\`atomic-cue-log
# No options. Type a cue and add it.
\`\`\`
`;

  const updated = appendCueBullet(markdown, "Soft grip", "💡 Reminders");
  assert.match(updated, /\`\`\`\n\n- Soft grip\n$/);
  assert.deepEqual(parseReminders(updated), ["Soft grip"]);
});

test("parseReminders and appendCueBullet ignore headings inside a fence", () => {
  const markdown = `## 💡 Reminders

\`\`\`atomic-cue-log
## Reminders
- not a cue
\`\`\`

- real cue

## Session log

- keep me
`;

  assert.deepEqual(parseReminders(markdown), ["real cue"]);
  const updated = appendCueBullet(markdown, "Second cue", "💡 Reminders");
  assert.match(updated, /\n- real cue\n- Second cue\n\n## Session log\n/);
});

test("the Reminders section ends at the next heading at or above its level", () => {
  const markdown = `## 💡 Reminders

- First

# Journal

- not a cue
`;

  // Reader and writer have to agree on where the section stops.
  assert.deepEqual(parseReminders(markdown), ["First"]);
  const updated = appendCueBullet(markdown, "Second", "💡 Reminders");
  assert.match(updated, /\n- First\n- Second\n\n# Journal\n/);
  assert.deepEqual(parseReminders(updated), ["First", "Second"]);
});

test("a Reminders heading at any level is used rather than duplicated", () => {
  const markdown = `### 💡 Reminders

- First

### Next
`;

  assert.deepEqual(parseReminders(markdown), ["First"]);
  const updated = appendCueBullet(markdown, "Second", "💡 Reminders");
  assert.equal(updated.match(/Reminders/g).length, 1);
  assert.deepEqual(parseReminders(updated), ["First", "Second"]);
});

test("appendCueBullet keeps a blank bullet a user wrote among real cues", () => {
  const updated = appendCueBullet(
    "## 💡 Reminders\n\n- A\n-\n- B\n",
    "New",
    "💡 Reminders",
  );

  assert.equal(updated, "## 💡 Reminders\n\n- A\n-\n- B\n- New\n");
});

test("fenced blocks only close with the delimiter that opened them", () => {
  const markdown = `## 💡 Reminders

\`\`\`atomic-cue-log
~~~
# No options.
\`\`\`

- real cue
`;

  assert.deepEqual(parseReminders(markdown), ["real cue"]);
});

test("every locale's Reminders heading round-trips through the scanner", () => {
  // appendCueBullet writes `## <template.reminders>` and later has to re-find
  // it, so a locale that drifts from the heading pattern would append a fresh
  // section on every click.
  for (const [language, locale] of [
    ["en", en],
    ["zh-Hant-en", zhHantEn],
  ]) {
    const label = locale["template.reminders"];
    assert.ok(
      isRemindersHeadingLabel(label),
      `${language} template.reminders (${label}) is not a Reminders heading`,
    );
    const written = appendCueBullet("# Session\n", "Soft grip", label);
    assert.deepEqual(parseReminders(written), ["Soft grip"]);
    assert.deepEqual(
      parseReminders(appendCueBullet(written, "Finish tall", label)),
      ["Soft grip", "Finish tall"],
    );
  }
});

test("appendCueBullet finds the bilingual Reminders heading", () => {
  const updated = appendCueBullet(
    "# ⛳ Golf / 高爾夫\n\n## 💡 Reminders / 提醒\n\n- Soft grip\n",
    "Finish tall",
    "💡 Reminders / 提醒",
  );

  assert.deepEqual(parseReminders(updated), ["Soft grip", "Finish tall"]);
  assert.equal(updated.match(/## 💡 Reminders/g).length, 1);
});
