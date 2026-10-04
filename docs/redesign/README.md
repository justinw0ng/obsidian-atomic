# Atomic Settings redesign (2026-10 pass)

A redesign-director pass over Atomic Tracker. Interactive research was skipped;
forks were recorded in [ASSUMPTIONS.md](./ASSUMPTIONS.md). Deep-research was
skipped. Composed skills `ux-principles-skill` and `artifact-design` are not in
this repo; principles are cited by name, and tokens honor the live Obsidian
plugin instead of inventing a new brand.

**Design thesis:** A habit in Settings is a labeled card. You can see what each
control does without hovering.

Open [index.html](./index.html) for the foundations page and screen mockups.

## Immutable core (must not change)

- Plugin id `atomic-tracker`; display name Atomic Tracker.
- Notes and frontmatter are the store. Settings hold paths, colors, enabled
  flags, and catalogs.
- Default created content lives under `atomics/**`.
- Codeblock languages stay (`atomic-heatmap`, `atomic-timer`, `atomic-gym-log`,
  `atomic-cues`, `atomic-bookshelf`, `atomic-dashboard`, …).
- No telemetry, accounts, or credential handling.
- Enable / disable / delete / add / color-picker → four shades behavior stays
  the same. Vault notes are never deleted by Settings Delete.

## Map — current plugin UI (from source)

### Settings (`src/settings.ts`)

Obsidian `PluginSettingTab` / `getSettingDefinitions()` (1.13+).

| Row | What it is |
|-----|------------|
| Language | Dropdown: English (`en`) or Traditional Chinese (`zh-Hant-en`). Chinese UI is Traditional Chinese only. A stored `Gym / 健身` name shows one half. |
| Timezone | Text, IANA id |
| Dashboard path | Text, vault-relative |
| Exercise types | Heading, then one **activity row + color row** per exercise |
| Add exercise type | Text + Add |
| General habits | Heading, then the same pair per hobby (no Cues toggle) |
| Add general habit | Text + Add |
| Gym exercises | Import from gym notes |

**Activity row (highest friction):** unlabeled Enabled toggle, Label text,
Folder text, optional unlabeled Cues toggle, Delete. Color picker + four swatches
sit on the next setting item, so they do not look like the same habit.

### Commands (`src/main.ts`)

New gym/golf/exercise session; new reading/hobby item; create/open reading
Bases; create/open book shelf; create cues notes; create daily note template;
create today's daily note; open dashboard. Command palette chrome is Obsidian's.

### Codeblock views

| Block | File | Notes |
|-------|------|--------|
| `atomic-heatmap` | `src/views/heatmap.ts` | Year grid, activity filter |
| `atomic-dashboard` | `src/views/dashboard.ts` | KPI cards, activity cards, monthly chart |
| `atomic-timer` | `src/views/timer.ts` | Start / Stop / Resume / Discard |
| `atomic-gym-log` | `src/views/gym-log.ts` | Labeled Exercise / Weight / Reps / Notes |
| `atomic-cues` | `src/views/cues.ts` | Fanned index cards. A narrow list shows four lines. |
| `atomic-cue-log` | `src/views/cue-log.ts` | Labeled cue textarea |
| `atomic-bookshelf` | `src/views/book-shelf.ts` | Hover pops the book. Click opens the cover. The next click opens the note. A user cover fills the face. |
| `atomic-actions` / `atomic-today` | `src/views/actions.ts`, `today.ts` | Buttons / today's sessions |
| Property selects | `src/properties/property-select.ts` | The select is the value for status, felt, location, and weight unit. |

### Modals

| Modal | Source |
|-------|--------|
| Confirm delete activity | `ConfirmDeleteActivityModal` in `src/settings.ts` |
| Text prompt | `src/util/prompt-text.ts` (`atomic-prompt-modal`) |
| Fuzzy suggest | `src/util/suggest-item.ts` |
| Gym log setup | `src/commands/gym-log-setup.ts` |
| What's new | Notice in `src/commands/update-note.ts` |

### Current design system (live)

- Obsidian CSS variables (`--background-primary`, `--text-normal`,
  `--interactive-accent`, `--background-modifier-border`, …).
- Plugin tokens in `styles.css` for heatmap cells, dashboard cards, cue paper,
  book size. System UI stack on `.fitness-plugin`.
- Settings previously stacked dense rows with `flex-wrap` and tooltip-only
  control names.

## Why Settings activity is the screen

Gym log, cue log, and timer already name their controls. Dashboard and cues
already have a designed shell. Settings is the only place a user meets **two
identical toggles and two text fields** with no persistent label — a Norman gulf
of execution on an infrequent surface.

## What shipped in plugin code

Visible field labels, a card that groups the activity row with its color row,
and an accent/faint rail for enabled vs disabled. Behavior is unchanged.

## Deliverables

| File | Role |
|------|------|
| [ASSUMPTIONS.md](./ASSUMPTIONS.md) | Forks and conservative picks |
| [00-foundations.html](./00-foundations.html) | Tokens + thesis |
| [01-settings-activity.html](./01-settings-activity.html) | Default: enabled Gym card |
| [02-settings-activity-disabled.html](./02-settings-activity-disabled.html) | Key state: disabled Reading |
| [decisions/ADR-0001-settings-activity-labels.md](./decisions/ADR-0001-settings-activity-labels.md) | Decision record |
