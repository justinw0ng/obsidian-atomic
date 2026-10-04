# Atomic Tracker: design direction (mock, for approval)

Status: proposal only. Nothing in the plugin has changed. Everything here was built in a scratch copy and rendered from one shared stylesheet, so the PNGs, the interactive HTML mock and the video all show the same system.

## Concept

**Your notes are the desk. Atomic keeps a quiet ledger and puts a few real objects on it.**

The plugin lives inside someone else's note, in someone else's theme. So most of it should read like a well-kept notebook: hairline rules, ink numbers, colour only where there is data. The warmth comes from a few physical objects: cue cards, books on a plank, the timer well. Three directions were explored at real size (board 00). The ledger won because it sits inside any light or dark theme without fighting it, keeps numbers as the loudest thing on the page, and works from a 390 px phone up to a 1900 px pane.

## Materials

| Material | Used for | Rule |
|---|---|---|
| Paper | Data: dashboard, heatmap, ledger, recent | Hairline rules only. No fills, no shadows, no boxes. |
| Well | Controls: year switcher, timer, gym log fields | One step off the surface it sits on. No border, no shadow. |
| Object | Cue cards, books, the plank | The only things with shadow, tilt or texture. |
| Glass | Floating things (the cue read-out pill) | Blur plus a 1 px rim, solid paper fallback. One at a time, never on the note itself. |

Signature interaction: **pointing answers in the read-out.** Hovering a month, a day, a book or a card writes the answer into the small read-out line next to the section title, instead of opening a floating tooltip. On touch, the first tap reads and the second tap opens.

## Type

One family, the theme's interface font, carries every word and every number. Hierarchy comes from size steps, then weight, then two colour tiers (ink and ink-2). Mono is the only second voice, and only for raw values.

| Role | Size / weight / tracking | Notes |
|---|---|---|
| KPI hero number | 34 / 400 / −0.02em, lining figures | Unit 15 / 500. 30 / 14 on narrow panes. Big numbers are lighter, not bolder. |
| Ledger stat | 20 / 500 / −0.01em, tabular | Unit 13 / 500. |
| Activity name | 15 / 600 | Shown as typed. Chinese name inline: "Gym 健身". |
| Section title | 13 / 600, ink | "Activities", "Monthly". |
| Body | 13 / 400–500 | Line-height 1.45 (covers CJK). |
| Label | 12 / 500, ink-2, +0.01em, sentence case | "Exercise sessions", never "EXERCISE SESSIONS". |
| Hint | 12 / 400, ink-2 | |
| Read-out | 11 mono, ink-2 (ink when live), tabular | The only mono voice. Never uppercase, never Chinese. |
| Bilingual label | EN 12 / 500 over 中文 12 / 400 | Tagged `lang="zh-Hant-HK"` so Apple devices pick PingFang HK. 12 px is the CJK floor. |
| Cue handwriting | Caveat 23 (the font the plugin already bundles) | Cue cards only. |

Figures: `font-variant-numeric: lining-nums tabular-nums` where numbers tick or stack in columns (timer, ledger, gym table). Standalone hero totals use natural-width digits. No `font-feature-settings`, because it wipes the theme's own OpenType features.

## Colour

- Ink is `--text-normal`, ink-2 is `--text-muted`. Faint is never used for text.
- Rules are text colour at 11 % (normal) and 22 % (strong). Fills are 4.5 / 8 / 13 %. Empty heatmap dots are 7 %, future days 3.5 %. All are `color-mix` of the theme's own text colour, so custom themes keep their contrast.
- **Activity colour appears only in data:** dots, bars, heatmap cells, fill rows, the reading ribbon and the repeat tab. Buttons, borders and headings are never coloured.
- **Primary buttons are ink** (text colour fill). The theme accent (`--interactive-accent`, `--text-accent`) is used only for focus rings and link hover.
- **Heatmap ramp mixes toward the page:** `color-mix(in oklab, base 28 / 52 / 78 / 100 %, --background-primary)`, so "least" is always closest to the paper in both themes. Today is an ink ring with a paper gap. Today the plugin uses fixed GitHub-style ramps and a fixed `#ebedf0` empty cell, which shows as a light-grey dot in dark mode.
- Eight curated defaults (one picker per activity, as now). Each one clears 3:1 against white and Obsidian's default dark background `#1e1e1e`:

| Name | Hex | vs #ffffff | vs #1e1e1e |
|---|---|---|---|
| Moss | `#4f8a3c` | 4.17 | 4.00 |
| Clay | `#c8643b` | 3.93 | 4.24 |
| Ink blue | `#4369c2` | 5.20 | 3.21 |
| Plum | `#9558ad` | 4.91 | 3.40 |
| Ochre | `#b07f1a` | 3.56 | 4.68 |
| Teal | `#2a8a85` | 4.14 | 4.03 |
| Rose | `#c4506e` | 4.45 | 3.75 |
| Graphite | `#6b6f76` | 5.05 | 3.30 |

Hard-coded hex in the stylesheet is limited to the cue card stock and ink (`#fffdf8`, `#2b2925`, `#6f695e`, `#e6e1d5`) and white text on the repeat tab.

## Radius, spacing, motion

- **Radius:** 3 px objects (cards, covers), 9 px controls (buttons, fields), 14 px wells (timer, gym log), fully round for dots, pills and heatmap cells.
- **Spacing:** 48 px between sections (36 on narrow panes), 24 px under the year bar, 20 px KPI column padding, 12–16 px between controls, 6 px inside a stack.
- **Motion:** one curve, `cubic-bezier(.32, .72, 0, 1)`. Press 120 ms, hover 240 ms, move 560 ms, stagger 30 ms. Digits roll only when a value changes (year switch, timer stop), never on first paint and never on the ticking clock.
- **Reduced motion:** one switch, the OS `prefers-reduced-motion` media query. All durations go to 0, digits jump, books stay flat with no sheen, the cue lightbox appears without flying, the timer pulse stops. The JS parts read the same query through `activeWindow.matchMedia`, so pop-out windows follow their own setting.

## Layout and breakpoints

Layout responds to the **pane width** (container queries), not the window width, so a narrow sidebar or split pane gets the narrow layout even on a big monitor.

| Where | Width | Change |
|---|---|---|
| Dashboard | ≥ 1500 px | Muscles, Golf focus and Recent sit in three columns. |
| Dashboard | ≤ 900 px | KPI row becomes 2 × 2 with a hairline cross; ledger rows stack (name, then count · time · detail, then month bars). Obsidian's default readable line length (~700 px) falls in this band, so this is the common case. |
| Dashboard | ≤ 760 px | Split sections go to one column, Recent goes to two lines, section gap 36 px. |
| Dashboard | ≤ 520 px | Section heads wrap, KPI numbers 30 px, chart 132 px tall, month initials. |
| Shelf, cues | ≤ 600 px | Phone layout: one cue card per row; 84 × 132 books (96 × 150 on desktop). |
| Gym log | ≤ 560 px | Fields go to two columns. |
| Pointer | `(hover: hover) and (pointer: fine)` | Only then do books tilt and cards lift on hover. |

## What each reference gave, and what was refused

| Reference | Taken | Refused, and why |
|---|---|---|
| Tobi's article | The process: three directions, real phone size (390 × 844 at 3×), a written critique, refine, re-render. One lead per screen. | The look: full-bleed saturated screens, poster-size condensed numbers, illustration, custom tab bars. Atomic renders inside a note and a theme it doesn't own; a full-bleed red block in a note stays loud forever. |
| DialKit | The value row (label left, value right, the value drawn as a tinted fill) for Muscles. Soft wells for controls. | The dark floating panel, a slider on every row, mono on every label, the spring editor. It's a tuning tool for designers; direction B shows it and why it lost (cold, ignores the theme, a grey box in a white note). |
| 3D shiny book | Tilt toward the pointer, a sheen that follows it, a lifted shadow. | The 6-face model (spine, page block, `preserve-3d`), the cover flip, chrome gloss. `preserve-3d` is unreliable on iOS WebKit, a spine strip painted over covers on phones, and a flip makes you wait before the note opens. Click opens the note; the read-out names the book. |
| Vaso | One glass material: blur plus a 1 px rim, for one floating thing at a time, with a solid fallback. | Refraction and displacement (SVG filters or WebGL), distorting the text behind, glass on cards or controls, a React dependency. Refraction over text hurts reading, and the plugin ships plain DOM and CSS. |
| NumberFlow | Per-digit roll when a value changes, rightmost digit first, 30 ms stagger, instant under reduced motion. | The library (a dependency), its mask fade edges (masks are banned in the plugin's CSS; the mock clips with `overflow`), rolling on first paint, rolling the ticking clock. |
| Hairline | The corner read-out that answers what you point at, hairline rules, grey on paper. | Uppercase letter-spaced mono captions, isometric illustration, a framed card around every figure, "Fig 0.1" numbering. Caps mono shouts and doesn't work for Chinese; boxes are what made the current UI feel generic. |
| timeless.co/type | The type logic: one grotesk for words and numbers, 1 px steps then one jump to the hero, big numbers light (34 / 400), units heavier than numbers, sentence case, 1.15 single-line leading, tracking that tightens as size grows. | The Timeless fonts (proprietary), a serif display role and mid-word italics, fractional variable weights, stylistic sets, pale grey values (#ccc on white is 1.6:1), text under 11 px, line-height under 1, accent-coloured labels, and dropping tabular figures (Atomic's timer ticks and its tables stack digits). |

## Obsidian and CSS constraints the mock follows

- Only Obsidian theme variables: `--font-interface`, `--font-monospace`, `--text-normal`, `--text-muted`, `--background-primary`, `--interactive-accent`, `--text-accent`, `--text-error`. Every rule is scoped under `.fitness-plugin`.
- No new web fonts and no CDN. Caveat and the CJK cue fallbacks (`Atomic Cue CJK`, `DFKai-SB`) are kept as the plugin has them.
- No `:has(`, `!important`, `scrollbar-width`, `-webkit-mask` or `mask` (the plugin's own CSS bans). The cue-card negatives in the selector tests also pass.
- Touch never depends on hover. Tilt and lift are gated on a fine pointer. Resting and lifted books are 2D transforms; `perspective()` sits on the book alone, with no `preserve-3d`.
- `backdrop-filter` ships with its `-webkit-` twin and a solid fallback.
- Root `data-testid` hooks are kept: `atomic-dashboard`, `atomic-heatmap`, `atomic-cues`, `atomic-cue-card`, `atomic-cue-lightbox`, `atomic-bookshelf`, `atomic-book`, `atomic-timer`, `atomic-gym-log`, `atomic-today`, `atomic-actions`.
- Only the original demo covers (invented titles) appear. No publisher covers.

## Evidence

Full output: `css-checks.log`.

- **Ban regexes:** all 12 banned patterns have 0 matches and all 18 required patterns are present ("ALL PASS").
- **Repo CSS tests run against the mock CSS**, using soft asserts so every assertion is counted:
  - `tests/e2e-selectors.test.mjs`: 432 passes, 0 failures.
  - `tests/e2e-mobile-layout.test.mjs` as written: 123 passes, 30 failures.
  - Same file with the cue block lookup pointed at `@container`: 136 passes, 26 failures.
  - The 26 failures are pinned values from today's design (cover flip, spine, 11 px squares, 80 px books, `#000` today ring, scrollbar rules). They are listed under "Constraint conflicts".
- **Interaction test** in headless Chrome with a fine pointer: 49 of 49 pass. It covers every tab in Desktop and Phone views, light and dark, 中英 labels, the year roll, chart and heatmap read-outs, book tilt, cue flight (centred within 0 px), phone two-tap, timer Stop rolling to 53, Add set, reduced motion, the 2 × 2 container query, and no console errors.
- **Width sweep** of the dashboard at 12 pane widths from 360 to 1124 px, in English and 中英: no element overflows anywhere.
- **Video:** checked frame by frame (see "Constraint conflicts", item 15).

## Critique log

Pass 1 checked the first renders against the timeless.co type study:

- Captions were 11 px uppercase mono at +0.07em; they became 12 / 500 sentence case in the interface font.
- Hero numbers were 600 at −0.03em; they became 400 at −0.02em. Ledger stats went from 600 to 500.
- Cue card meta was 10.5 px mono caps; it became 11 / 500 sentence case. The Chinese label line went from 11 to 12 px.
- Three `font-feature-settings: "tnum"` rules became `font-variant-numeric`. The timer's idle state lost its 600 → 500 weight swap and now dims to ink-2 instead.

Pass 2 put everything in the interactive mock at real pane widths and clicked through it:

- "214h 58m" collided at about 630 px, and the ledger's Last column overflowed between 761 and 905 px. Fix: the 900 px medium-pane block.
- Heatmap cells showed slivers beside the sticky day labels at fractional zoom. Fix: the day labels moved outside the scroll area. That cut "Mar" at the edge, so narrow heatmaps now open on today, snapped to a month start.
- The phone shelf showed a sliver of the previous book. Fix: snap padding is now one gap.
- In a scaled phone frame the cue card flew to the wrong spot. Fix: the flight origin is now scale-aware.
- The timer read-out always said "+13 min". Fix: it now reports the minutes actually added.
- The phone lightbox offered an "esc" key. Fix: touch shows "tap to close", and the mock's toolbar hints switch to touch wording in Phone view.

## Approve or change

Reply with, for example, "yes to all except 9 and 17". Each item gives the recommended default first, then the alternative.

1. **Concept.** Default: the ledger, "your notes are the desk" (direction A). Alternative: Instrument (B) or Scrapbook (C) from board 00.
2. **Ledger, not boxed cards.** Default: dashboard sections are ruled rows on the page, with no card boxes or shadows. Alternative: a faint fill behind each section, still with no border or shadow.
3. **Activity colour only in data.** Default: colour appears only in dots, bars, cells and fills; chrome is never coloured. Alternative: also tint activity names (this risks unreadable text with light colours like yellow).
4. **Heatmap.** Default: 10 px round dots on a 13 px pitch, a ramp that mixes toward the page, an ink ring for today. Alternative: keep today's 11 px squares with 1 px gaps, but adopt the new ramp mixing.
5. **Palette.** Default: the eight curated colours in the table, each at least 3:1 in both themes. Alternative: keep today's green, orange and blue, ramped with the new mixing.
6. **Primary buttons.** Default: ink, with the accent only for focus rings and link hover. Alternative: the theme accent (`--interactive-accent`), like Obsidian's own call-to-action buttons.
7. **Mono.** Default: only for raw read-outs (times, dates, durations), at 11 px, never uppercase. Alternative: remove mono entirely and use one font for everything.
8. **Labels.** Default: sentence case, 12 / 500. Alternative: uppercase only on section titles, at +0.04em.
9. **Hero numbers.** Default: regular weight (34 / 400). Alternative: light (300), which looks closer to the reference but thins out in dark mode and on Windows.
10. **Hover answers in the read-out.** Default: no floating tooltips; on touch the first tap reads and the second opens. Alternative: keep desktop tooltips as well (aria labels stay either way).
11. **Book shelf.** Default: tilt, sheen and a read-out under the plank; a click opens the note. Alternative: keep today's 3D cover flip (it conflicts with the 2D-only rule on iOS).
12. **Reading marker.** Default: a ribbon in the Reading colour hangs over the plank edge. Alternative: a small coloured dot under the book.
13. **Cue cards.** Default: one paper stock for every card, plus a coloured "×3" repeat tab only when a cue repeats. Alternative: keep pastel card colours per tag.
14. **Timer.** Default: idle shows the total ("40 min") with the last session as a read-out; running shows a live clock and "since 21:40"; actions are Stop and a quiet Discard; Resume is dropped; no ISO strings. Alternative: keep Resume, shown disabled while running.
15. **Gym log.** Default: labels inside the fields (well style), a reps stepper (− 8 +), an ink Add set button and a read-out of the last set. Alternative: classic labels above each field.
16. **Bilingual labels.** Default: English stacked over Chinese; activity names stay inline. Alternative: one line ("Exercise sessions 運動次數") when there's room, stacking only when narrow.
17. **Monthly chart.** Default: stacked Gym and Golf columns. Alternative: grouped side-by-side columns.
18. **Recent sessions.** Default: no file paths, just date, activity, minutes and one fact. Alternative: show the path as a muted read-out on hover.
19. **Emoji.** Default: none in labels; the colour dot is the icon. Alternative: an optional per-activity emoji in settings, off by default.
20. **Rolling numbers.** Default: digits roll when a value changes. Alternative: a plain cross-fade.
21. **Responsive rule.** Default: container queries on the pane width. Alternative: keep viewport `@media (max-width: 600px)` as today. That matches the current tests, but narrow sidebars and split panes then get the desktop layout.
22. **Reduced motion.** Default: follow the OS setting only. Alternative: also add a "Reduce motion" plugin setting.
23. **Medium panes.** Default: below 900 px of pane width, the KPI row goes 2 × 2 and ledger rows stack. Alternative: let the dashboard note opt out of readable line length (a `cssclasses` property), so it keeps four across in most panes and stacks only when truly narrow.

## Constraint conflicts (decide before implementation)

1. **`color-mix` support.** Rules, fills and the heatmap ramp need iOS 16.2+ / Chromium 111+. Desktop Electron is fine. Older iPads would need precomputed `rgba` fallbacks behind `@supports`.
2. **Container queries.** These need `container-type: inline-size` on each Atomic root, so a root can't shrink-wrap its content. The cue lightbox is appended to `body`, so no container query reaches it. It has to measure its pane in JS, as the mock does (phone-like below 600 px).
3. **Pinned `@media (max-width: 600px)` cue tests** fail against container queries (4 assertions). Pointed at `@container`, they pass.
4. **Tilt + sheen vs the pinned cover flip and spine tests** (8 assertions: spine `display`, `rotateY(90deg)`, `is-cover-open`, `rotateY(-155deg)`, absolute cover image).
5. **Heatmap geometry vs pinned values:** 10 px cells with 3 px gaps vs the pinned 11 px cell, 1 px pad, `--atomic-heatmap-week-col`, and the `fitness-month-*`, `fitness-week`, `fitness-heatmap-body` / `-scroll` and `fitness-weeks-end-pad` rules.
6. **Book size:** 96 × 150 (desktop) and 84 × 132 (phone) vs the pinned `--atomic-book-width: 80px`.
7. **Today ring:** ink via theme variables vs the pinned `#000` plus a `.theme-dark` override.
8. **Scrollbar rules:** the mock doesn't reproduce `--scrollbar-size: 0px`, `.atomic-scrollport::-webkit-scrollbar` or `pre.atomic-block-host { overflow-x: hidden }`. This isn't a design disagreement; keep those rules when implementing.
9. **Markup.** The mock uses simplified class names (`atomic-heat-*`, `atomic-shelf-*`). Implementation has to map onto the plugin's DOM and keep the sub-hooks Selenium uses (`atomic-timer-*`, `atomic-gym-log-*`, `atomic-setting-*`, `atomic-property-select`, `atomic-update-note-*`).
10. **Bilingual strings.** Stacked labels need English and Chinese as separate strings. Splitting today's joined `zh-Hant-en` strings at runtime has edge cases, so structured en/zh pairs in the i18n catalog are recommended.
11. **Font stand-in.** Renders use Inter as the interface font (it is in Obsidian's default stack). On Windows Segoe UI, 500 renders as 400, so labels lean more on colour.
12. **Before/after data.** Board 10's "before" is the current plugin with its own demo data, so its numbers don't match the "after".
13. **The mock's Reduced toggle** is mock-only: it mirrors the 7 reduced-motion rules under a class. The plugin uses only the media query.
14. **Pointer emulation.** The headless and VNC browsers reported no hover or fine pointer, so renders and the video emulated one. In the static PNGs, hover states are forced with preview classes.
15. **Video check.** No videoReview subagent was available. The MP4 was checked by extracting frames with ffmpeg and inspecting each interaction; the montages are `video-check-frames-a.png` and `video-check-frames-b.png`.

## Using the HTML mock

Open `atomic-redesign-mock.html` in any desktop browser. It is one self-contained file, with no network access needed.

- **Tabs:** Dashboard, Daily note, Cues, Book shelf, Timer & gym log, System.
- **Toggles:** Theme (Light / Dark), Motion (Full / Reduced), Labels (EN / 中英), View (Desktop / Phone). Phone view switches to touch behaviour (tap to read, tap again to open).
- **Links:** state lives in the URL hash, so views can be shared, e.g. `atomic-redesign-mock.html#tab=shelf&theme=dark&motion=full&lang=en&view=phone`.
- **Container queries:** on the Dashboard tab in Desktop view, resize the browser window to watch the 900 / 760 / 520 px layouts.
- **Hover** needs a mouse or trackpad. If your OS already has Reduce motion on, Full will still look reduced; that is the real media query working.
