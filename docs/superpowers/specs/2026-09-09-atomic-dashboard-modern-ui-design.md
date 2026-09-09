# Design: Modern UI for the `atomic-dashboard` block

Date: 2026-09-09  
Status: proposed (design only; no plugin code changed)  
Mockup: `docs/mockups/atomic/09-atomic-dashboard-modern.html`  
Related: `2026-08-09-atomic-tracker-redesign-design.md`, `2026-08-09-habits-basecolor-heatmap-filter-design.md`

## Goal

Replace the current text-first dashboard (H2/H3 headings, bullet lists, bordered 12-row table, inline sparklines; see `docs/images/atomic-dashboard.png`) with a card-based, scannable layout that reads like a native Obsidian view, works in light and dark themes, and degrades gracefully in narrow panes and on mobile. The block keeps the same inputs (`year:` option, note `year` property, enabled activities from Settings) and the same data model; this is a presentation redesign, not a data change.

## Design principles

| Principle | Consequence |
|-----------|-------------|
| Numbers first | Every section leads with a large tabular-numeral figure; labels are secondary and muted |
| Obsidian-native | Only theme tokens (`--background-primary`, `--background-modifier-border`, `--text-muted`, `--interactive-accent`, `--link-color`, `--font-ui-small`) plus the activity `baseColor` / derived `colors[]`. No hard-coded palette except activity colors |
| One visual language | Cards with 1px border + 12px radius, `999px` chips, 8px progress rails, 12-column month bars. The same primitives repeat in every section |
| Progressive disclosure | Charts are the primary view; exact tables sit behind `<details>` so nothing is lost for copy-paste or screen readers |
| Responsive by grid, not media queries | `repeat(auto-fit, minmax(...))` grids collapse 4 → 2 → 1 columns as the pane narrows; only a few `narrow`-only rules hide the date column and shrink gaps |
| Zero new settings | No new block options or settings are required to ship the redesign |

## Layout (top → bottom)

1. **Header row** — `{year} overview` H2 (existing i18n key, emoji dropped), subtitle `Jan 1 – Aug 14 · 192 sessions`, a `‹ 2026 ›` year switcher, and quick-link chips (`{activity} cues` for `supportsCues` exercise activities; `Reading bookshelf` and `Book shelf` when Reading is enabled). Chips carry a color dot from the activity `colors[2]`.
2. **KPI cards** — `auto-fit, minmax(170px, 1fr)`: Exercise sessions (with per-activity split), Exercise time (`h m` form, plus raw minutes and average per session), Volume lifted (only when any exercise activity `supportsSetTable`), Habit time (sum of hobby minutes, per-habit split). Sessions and Volume cards carry a 12-bar sparkline of the monthly series.
3. **Activity cards** — `auto-fit, minmax(340px, 1fr)`; one card per enabled activity, exercise and general habits in the same grid. A 3px color rail at the top uses `colors[2]`. Exercise cards: sessions, minutes, optional volume, monthly bars (sessions), `Open {activity} cues →` footer, `last: <date>`. Golf additionally shows the felt good/ok/bad segmented bar with counts. Habit cards: items, minutes, monthly bars (timer minutes), optional "reading now" count (items with `status: reading`), bookshelf links for Reading.
4. **Monthly** — grouped bar chart (one bar per activity per month) as the primary view; the existing 12-row table moves behind `Show monthly table` and gains habit-minute columns.
5. **Muscles / Golf focus** — two-column `auto-fit, minmax(300px, 1fr)`. Muscles: ranked horizontal rails (volume kg, set count), sorted as today. Golf focus: tag chips with counts; the top two are rendered larger (`.lg`). Both remain conditional on `supportsSetTable` and the `golf` id.
6. **Recent sessions** — latest 10 as a timeline list: weekday + date, activity dot, activity link, faint note path, right-aligned summary (`58 min · 880 kg` for set-table activities, `85 min · felt good` for golf). Narrow panes hide the date column and truncate the path.

Empty states keep the current muted italic copy (`No set data`, `No focus tags`, `No sessions yet`) inside the relevant card.

## Mapping to the current renderer

Everything on the mockup is already computed in `src/views/dashboard.ts`; the redesign only changes how it is laid out.

| Mockup element | Source today |
|----------------|--------------|
| Sessions, minutes per activity | `activityStats[].pages.length`, `.duration` |
| Monthly bars, KPI sparklines | `sessionsByMonth`, `volumeByMonth` |
| Volume lifted, Muscles rails | `parseSetTable` + `rowVolumeKg`, `muscleVolume`, `muscleFreq` |
| Golf felt bar, Golf focus chips | `collectGolfStats` → `feltCounts`, `focusCounts` |
| Habit items / minutes | `data.listHobbyItems`, `sumMinutesForYear` |
| Recent sessions | `recent10` |
| Cue / bookshelf chips | `cuePathForActivity`, `READING_BOOKSHELF_REL`, `BOOK_SHELF_HOST_REL` |

New derived values needed (all pure, testable in `src/core`):

- Habit minutes **per month** (currently only the yearly sum is computed) for the habit-card bars and the extra table columns; `minutesByDateForYear` already yields the per-date map to bucket.
- `h m` formatting for minute totals, average minutes per session, and "last session" date per activity.
- Per-session summary for the recent list (volume for set-table notes, `felt` for golf) — volume per session is already computed as `sessionVol` inside the loop; it just needs to be kept on the `recent` entry.
- Optional "reading now" count via `matchesBookShelfStatus(status, ["reading"])` on hobby item frontmatter.

## Implementation notes (for a follow-up PR)

- Split `renderDashboard` into a pure model builder (`src/core/dashboard.ts`: `buildDashboardModel(...)` returning KPIs, activity cards, monthly series, muscles, focus tags, recent rows) and a thin DOM renderer in `src/views/dashboard.ts`. The model builder is unit-testable without Obsidian, per `AGENTS.md`.
- Add the mockup's `.atomic-dash-*` rules to `styles.css` under `.fitness-plugin.atomic-dashboard`. The mockup CSS intentionally uses Obsidian token names so it can move over nearly verbatim; replace the mockup-only tokens (`--radius-l`, `--shadow-s`, `--font-interface`) with literals or existing Obsidian vars.
- Year switcher: re-render the block with `year ± 1` in memory only (does not edit the note or the `year:` option). Skip it if we want to stay strictly static; nothing else depends on it.
- New i18n keys (add to `en` and `zh-Hant-en`): `view.dashboard.subtitleRange`, `view.dashboard.exerciseSessions`, `view.dashboard.exerciseTime`, `view.dashboard.volumeLifted`, `view.dashboard.habitTime`, `view.dashboard.avgPerSession`, `view.dashboard.lastSession`, `view.dashboard.readingNow`, `view.dashboard.showMonthlyTable`, `view.dashboard.activities`, `view.dashboard.byVolumeSets`, `view.dashboard.openCues`. Existing keys for headings, `felt`, `Muscle`/`Sets`/`Volume (kg)`, empty states, and links are reused.
- Test hooks for `e2e/health-check.test.mjs`: `data-testid="atomic-dashboard"`, `atomic-dashboard-year`, `atomic-dashboard-kpi`, `atomic-dashboard-activity`, `atomic-dashboard-monthly`, `atomic-dashboard-muscles`, `atomic-dashboard-golf-focus`, `atomic-dashboard-recent`. The E2E should assert the KPI count, one activity card per enabled activity, that disabling an activity removes its card, and that a recent-row link opens the session note.
- Accessibility: month bar charts are `aria-hidden` and always paired with the `<details>` table; rails and chips keep their numeric text; chips are `<a>`/`<button>` with visible focus.
- Update `docs/USER_GUIDE.md` `### atomic-dashboard` and recapture `docs/images/atomic-dashboard.png` with `npm run docs:user-guide-screenshots` once implemented.

## Out of scope

- New block options (`sections:`, `layout:`), streak or "active days" metrics, cross-year comparison, and any change to how sessions or timers are stored.
- Replacing the `atomic-heatmap` block; the dashboard links to it via the existing note layout rather than embedding it.

## Review

Open the mockup in a browser. The top bar toggles **Light / Dark**, **Wide pane / Narrow (mobile)**, and **Show design annotations** (numbered callouts 1–6 explained under the pane). Query params `?theme=dark`, `?width=narrow`, `?annotate=1` preselect those for screenshots.
