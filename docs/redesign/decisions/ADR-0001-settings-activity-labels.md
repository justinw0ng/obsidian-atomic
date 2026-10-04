# ADR-0001: Label Settings habit controls in place

- Status: accepted
- Date: 2026-10-04
- Version: 1.0.0
- Supercedes: none

## Context

Settings paints each habit as a dense Obsidian `Setting` row: Enabled toggle,
label text, folder text, optional Cues toggle, Delete — then a second row for
the color picker and four generated shades. The two toggles look the same. The
two text fields are named only by placeholder. Color does not look like it
belongs to the habit.

The redesign-director pass mapped every plugin surface and picked this as the
highest-friction screen. The user asked for a small shell change (Obsidian
CSS/classes, same behavior), not a Settings rewrite.

Assumptions and rejected forks: [../ASSUMPTIONS.md](../ASSUMPTIONS.md).

## Decision

Keep the existing two `Setting` items and their `data-testid` hooks.

1. Wrap each activity control in a captioned field (`Enabled`, `Label`, `Folder`,
   `Cues`) using a `div`, not a `<label>` — a label around Obsidian's
   checkbox-container can fire the toggle twice. Delete keeps its button text
   and uses a spacer so it lines up.
2. Name the swatch row `Heatmap shades`.
3. Group the activity row and the following color row as one card with a shared
   background, border, and a 3px inset rail.
4. Enabled = accent rail; disabled = faint rail. Do not fade the card.
5. Copy lives in `en` and `zh-Hant-en`. Tooltips stay as the longer explanation.

## Rationale

- **Norman · Gulf of Execution.** “Which toggle is Cues?” is unanswerable from
  the resting UI. A persistent label puts the name on the control.
- **Norman · Knowledge in the world.** Settings is visited rarely. Tooltips are
  hover-only and fail on touch.
- **Cooper · Supporting surface.** The sovereign work is in notes. Settings must
  be self-explanatory on first glance, not optimized for expert density.
- **Lidwell · Visibility + Consistency.** The labeled field is the same pattern
  as `atomic-gym-log-field` / `atomic-cue-log-field`.
- **Lupton · Hierarchy.** Small muted captions; the habit name stays the heading.
- **Accessibility.** State is the labeled toggle plus the rail, not color alone.
  Contrast on editable text is unchanged because we do not apply opacity.
- Design judgment, not a cited study: the specific words `Enabled` / `Cues` /
  `Heatmap shades`, and the 3px rail instead of a badge.

## Consequences

- Activity rows are taller. That is acceptable: Settings is not a dashboard.
- Bilingual `zh-Hant-en` labels are longer; fields wrap, which they already did.
- Selenium still finds the first `.checkbox-container` (Enabled) and the Delete
  button text. New hooks: `atomic-setting-enabled`, `atomic-setting-label`,
  `atomic-setting-folder`, `atomic-setting-cues`, `atomic-setting-delete`.
- `getSettingDefinitions()` custom rows still call the same paint functions.

## Rejected alternatives

| Alternative | Why not |
|-------------|---------|
| Merge activity + color into one Setting | Breaks two testids and the 1.13 definitions list. |
| Icon-only toggles / keep tooltips | Repeats the gulf on touch and infrequent use. |
| Opacity on disabled cards | Drops body contrast while fields stay editable. |
| New Settings tabs or search | Out of scope; changes IA, not the shell. |
| Remove Cues from the row | Behavior change. |
