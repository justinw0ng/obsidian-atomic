import test from "node:test";
import assert from "node:assert/strict";
import {
  appendTimeLog,
  minutesByDate,
  parseTimeLog,
  displayedTimerMinutes,
  elapsedTimerMinutes,
  readTimerFrontmatter,
  stopSessionTimer,
  stopTimer,
  updateTimerFrontmatter,
} from "../src/core/hobby.ts";

test("parseTimeLog reads mockup-style time log bullets", () => {
  const markdown = `---
total_min: 70
timer_started_at:
---

# Atomic Habits

## Remarks

- This is not a timer entry.

## Time log

- 2026-08-07 21:10-21:40 | 30 min | ch.1
- 2026-08-08 07:05-07:45 | 40 min | ch.2

## Other

- 2026-08-09 12:00-12:10 | 10 min | ignore outside log
`;

  assert.deepEqual(parseTimeLog(markdown), [
    {
      date: "2026-08-07",
      minutes: 30,
      note: "ch.1",
    },
    {
      date: "2026-08-08",
      minutes: 40,
      note: "ch.2",
    },
  ]);
});

test("appendTimeLog creates a Time log section and round-trips ISO metadata", () => {
  const markdown = `---
total_min: 0
timer_started_at:
---

# Atomic Habits
`;

  const updated = appendTimeLog(markdown, {
    date: "2026-08-09",
    minutes: 55,
    note: "ch.3 start",
    startIso: "2026-08-09T12:00:00.000Z",
    endIso: "2026-08-09T12:55:00.000Z",
  });

  assert.match(updated, /## Time log\n\n- 2026-08-09 12:00-12:55 \| 55 min \| ch\.3 start/);
  assert.deepEqual(parseTimeLog(updated), [
    {
      date: "2026-08-09",
      minutes: 55,
      note: "ch.3 start",
      startIso: "2026-08-09T12:00:00.000Z",
      endIso: "2026-08-09T12:55:00.000Z",
    },
  ]);
});

test("appendTimeLog inserts into an existing Time log before the next heading", () => {
  const markdown = `# Atomic Habits

## Time log

- 2026-08-08 07:05-07:45 | 40 min | ch.2

## Remarks

Keep going.
`;

  const updated = appendTimeLog(markdown, {
    date: "2026-08-09",
    minutes: 25,
    note: "",
  });

  assert.match(
    updated,
    /- 2026-08-08 07:05-07:45 \| 40 min \| ch\.2\n- 2026-08-09 \| 25 min\n\n## Remarks/,
  );
});

test("minutesByDate totals parsed entries by date", () => {
  const entries = [
    { date: "2026-08-09", minutes: 15, note: "" },
    { date: "2026-08-09", minutes: 25, note: "" },
    { date: "2026-08-10", minutes: 10, note: "" },
  ];

  assert.deepEqual([...minutesByDate(entries)], [
    ["2026-08-09", 40],
    ["2026-08-10", 10],
  ]);
});

test("frontmatter helpers read and update timer fields", () => {
  const markdown = `---
status: reading
timer_started_at: "2026-08-09T12:00:00.000Z"
total_min: 15
---

# Atomic Habits
`;

  assert.deepEqual(readTimerFrontmatter(markdown), {
    persistMode: "item",
    totalMin: 15,
    durationMin: 0,
    timerStartedAt: "2026-08-09T12:00:00.000Z",
  });

  const updated = updateTimerFrontmatter(markdown, {
    totalMin: 45,
    timerStartedAtIso: null,
  });

  assert.match(updated, /status: reading\n/);
  assert.match(updated, /timer_started_at:\n/);
  assert.match(updated, /total_min: 45\n/);
  assert.deepEqual(readTimerFrontmatter(updated), {
    persistMode: "item",
    totalMin: 45,
    durationMin: 0,
    timerStartedAt: null,
  });
});

test("stopTimer appends a log entry, clears the timer, and updates total_min", () => {
  const markdown = `---
status: reading
total_min: 20
timer_started_at: "2026-08-09T12:00:00.000Z"
---

# Atomic Habits

## Time log

- 2026-08-08 07:05-07:25 | 20 min | ch.2
`;

  const result = stopTimer({
    markdown,
    startedAtIso: "2026-08-09T12:00:00.000Z",
    stoppedAtIso: "2026-08-09T12:45:00.000Z",
    note: "ch.3",
  });

  assert.equal(result.minutes, 45);
  assert.equal(result.totalMin, 65);
  assert.deepEqual(readTimerFrontmatter(result.markdown), {
    persistMode: "item",
    totalMin: 65,
    durationMin: 0,
    timerStartedAt: null,
  });
  assert.deepEqual(parseTimeLog(result.markdown), [
    {
      date: "2026-08-08",
      minutes: 20,
      note: "ch.2",
    },
    {
      date: "2026-08-09",
      minutes: 45,
      note: "ch.3",
      startIso: "2026-08-09T12:00:00.000Z",
      endIso: "2026-08-09T12:45:00.000Z",
    },
  ]);
});

test("stopTimer does not duplicate an existing start/end log entry", () => {
  const markdown = `---
total_min: 45
timer_started_at:
---

# Atomic Habits

## Time log

- 2026-08-09 12:00-12:45 | 45 min | ch.3 <!-- atomic-timer start="2026-08-09T12:00:00.000Z" end="2026-08-09T12:45:00.000Z" -->
`;

  const result = stopTimer({
    markdown,
    startedAtIso: "2026-08-09T12:00:00.000Z",
    stoppedAtIso: "2026-08-09T12:45:00.000Z",
    note: "ch.3",
  });

  assert.equal(result.minutes, 45);
  assert.equal(result.totalMin, 45);
  assert.equal(parseTimeLog(result.markdown).length, 1);
});

test("session notes persist duration_min instead of a Time log", () => {
  const markdown = `---
type: session
date: 2026-08-11
activity: gym
duration_min:
timer_started_at: "2026-08-11T12:00:00.000Z"
---

# Gym — 2026-08-11

\`\`\`atomic-timer
\`\`\`

\`\`\`atomic-gym-log
\`\`\`

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |
`;

  assert.deepEqual(readTimerFrontmatter(markdown), {
    persistMode: "session",
    totalMin: 0,
    durationMin: 0,
    timerStartedAt: "2026-08-11T12:00:00.000Z",
  });
  assert.equal(displayedTimerMinutes(readTimerFrontmatter(markdown)), 0);
  assert.equal(
    elapsedTimerMinutes("2026-08-11T12:00:00.000Z", "2026-08-11T12:45:00.000Z"),
    45,
  );

  const result = stopSessionTimer({
    markdown,
    startedAtIso: "2026-08-11T12:00:00.000Z",
    stoppedAtIso: "2026-08-11T12:45:00.000Z",
  });

  assert.equal(result.minutes, 45);
  assert.equal(result.durationMin, 45);
  assert.deepEqual(readTimerFrontmatter(result.markdown), {
    persistMode: "session",
    totalMin: 0,
    durationMin: 45,
    timerStartedAt: null,
  });
  assert.match(result.markdown, /duration_min: 45\n/);
  assert.doesNotMatch(result.markdown, /total_min:/);
  assert.doesNotMatch(result.markdown, /## Time log/);
  assert.match(result.markdown, /\| Squat \| Quads \| 80 \| 5 \|/);
  assert.equal(parseTimeLog(result.markdown).length, 0);

  const second = stopSessionTimer({
    markdown: result.markdown.replace(
      /timer_started_at:\n/,
      'timer_started_at: "2026-08-11T13:00:00.000Z"\n',
    ),
    startedAtIso: "2026-08-11T13:00:00.000Z",
    stoppedAtIso: "2026-08-11T13:20:00.000Z",
  });
  assert.equal(second.durationMin, 65);
  assert.match(second.markdown, /duration_min: 65\n/);
});

test("timer persist mode follows type: session even when total_min is present", () => {
  const markdown = `---
type: session
duration_min: 10
total_min: 99
---
`;
  assert.equal(readTimerFrontmatter(markdown).persistMode, "session");
  assert.equal(displayedTimerMinutes(readTimerFrontmatter(markdown)), 10);
});

test("duration_min without type: session still uses session persist mode", () => {
  const markdown = `---
duration_min: 30
timer_started_at:
---
`;
  assert.equal(readTimerFrontmatter(markdown).persistMode, "session");
  assert.equal(displayedTimerMinutes(readTimerFrontmatter(markdown)), 30);
});
