# Atomic Tracker — EPUB/PDF reader journey (1.6.0)

**1.6.0 design.** Spec for the next minor. Visual language follows the shipped **1.5.0 revamp**: hairlines, object/control/well radii (3 / 9 / 14), Timeless Type, liquid glass, plank bookshelf. No purple gradients or mismatched radii. This PR does not bump `manifest.json`.

## Flow

```
Library (shelf)
    → Book note (bookshelf block)
        → Tap cover
            → Chooser sheet
                ├─ Open Notes (primary / default) → existing book note (no theater)
                └─ Open Book (only if EPUB/PDF) → continuous camera flight
                        → Theater (theme-matched: light linen / dark museum)
                            → Settled reader
                                → Ask AI (BYO secret storage)
                                → Canvas (.canvas per book)
Settings: secret storage saved / empty / error
```

## Frame list

| # | Step | Desktop 1020×720 | Phone 390×844 |
|---|------|------------------|---------------|
| 01 | Library / bookshelf | ✓ | ✓ equal side margins |
| 02 | Reading note · tap cover | ✓ | ✓ |
| 03 | Chooser · Notes vs Book | ✓ + no-file state | ✓ |
| 04 | Open Notes → book note | ✓ | ✓ |
| 05a–e | Open Book flight keyframes | 5 continuous frames | — |
| 06 | Theater · light + dark | ✓ pair (light desk + dark Obsidian desk) | — |
| 07 | Settled reader | two-page + margins + toolbar | single column + expand dots |
| 07b | Book size · M vs XL | ✓ pair | phone reading sheet |
| 08 | Ask AI panel | ✓ | ✓ |
| 09 | Canvas book notes | ✓ | ✓ |
| 10 | Settings secret storage | saved / empty / error | ✓ |

## Open Book motion (05)

Continuous camera on the **same leaf** — no hard cut, no separate Action pop-then-jump:

1. **05a** Cover lifts above the plank  
2. **05b** Hinge opens (cover rotates, paper stack revealed)  
3. **05c** Pages flip while zooming  
4. **05d** Spread forms  
5. **05e** Lands on reader p.47  

Premium cues: spring-like ease in the staging, soft contact shadows, paper tooth/thickness at the gutter, warm side key light.

## Chooser rules

- **Open Notes** — primary, default (↵), always available  
- **Open Book** — shown only when an EPUB/PDF is linked  
- **No-file** — Open Book row hidden  

## Files

| Path | Role |
|------|------|
| `journey.html` | Journey board (import source) |
| `atomic-reader-journey.fig` | OpenPencil document |
| `export/01-library.png` … | PNG per major step |
| `covers/` | Shelf cover art |

## Tokens (light)

| Token | Value |
|-------|-------|
| Paper / ink / muted | `#ffffff` / `#222222` / `#5c5c5c` |
| Border / fills | `#e0e0e0` / 4.5–13% ink |
| Accent (progress / Ask) | `#5b7cfa` |
| Radii | object 3 · control 9 · well 14 |
| UI / book / mono | Inter · Literata · IBM Plex Mono |


## PNG exports (`export/`)

| File | Step |
|------|------|
| `01-library.png` | Library / bookshelf (desktop + phone) |
| `02-note-tap.png` | Reading note · tap cover |
| `03-chooser.png` | Chooser + no-file state |
| `04-open-notes.png` | Open Notes → book note |
| `05-open-book-flight.png` | Full flight strip (05a–e) |
| `05a-cover-lifts.png` … `05e-lands-p47.png` | Individual flight keyframes |
| `06-theater.png` | Theater · light + dark pair |
| `06-theater-light.png` | Theater · light theme (linen curtains, soft key) |
| `06-theater-dark.png` | Theater · dark Obsidian (museum key on paper) |
| `07-reader.png` | Settled reader |
| `07b-book-size.png` | Book size · M vs XL + phone sheet |
| `refs/theater_desk_xl_exit.png` | HTML mock ref · desktop XL, Exit Esc |
| `refs/theater_phone_xl_exit.png` | HTML mock ref · phone XL, Exit Esc |
| `08-ask.png` | Ask AI panel |
| `09-canvas.png` | Canvas book notes |
| `10-settings.png` | Settings · secret storage states |

Open `atomic-reader-journey.fig` in OpenPencil to browse the whole journey board.

## Import pipeline & caveats (fixed 2026-10-17)

The `.fig` used to show stacked, overlapping body text. That happened because OpenPencil's HTML import doesn't run real line layout: wrapped paragraphs, inline `<span>` highlights, `inset`, `bottom/right`, flex, gradients and emoji all came through wrong.

`journey.html` (the file that gets imported) is now a **pre-flattened** board. Chrome lays out `journey.source.html` (the editable source), then `tools/flatten.js` turns it into absolute pixels:

- **One text node per line.** Every line of text, including book pages, flight papers, theater, the reader on desktop and phone, margin remarks, toolbars, labels and covers, is its own `white-space:nowrap` div. Each has an absolute top and a fixed px line-height, so nothing can reflow.
- **Highlights** are separate rectangles behind the lines, not inline spans.
- **Every box** gets an absolute left/top/width/height. `inset` is expanded, and computed colour, radius, shadow and border are inlined. Siblings are reordered by z-index.
- **Gradients** (warm key light, paper, curtains, lamps) are rasterised to 2× PNGs, and emoji or symbol glyphs to 3× PNGs. The importer drops both otherwise.
- **Paper pages** clip at the last full line inside the bottom padding, so no line ends mid-word with "…".

Book typography: Literata at 12.5/19px (about 1.52 leading) on desktop pages and 15/23px on phone. Text is ragged-right throughout, at roughly 55–60 characters per line on desktop pages.

Design fixes made along the way:
- Margin notes are 112px wide and fit beside the 340px pages.
- The selection toolbar sits just below the selected passage on desktop and phone, so it covers no text.
- The 05c turning leaf is an opaque blank verso, not a see-through page.
- The Ask panel is opaque.
- The `.sheet.phone` class clash that blanked the phone chooser is fixed.
- The Ask send button no longer stretches.
- The violet highlight is now the blue accent tint.

To rebuild: edit `journey.source.html`, run `bash tools/build.sh`, copy `/tmp/rx/journey.flat.html` to `journey.html`, then run `openpencil import journey.html -o atomic-reader-journey.fig`. After that, `openpencil tree … > /tmp/rx/tree.txt`, `bash tools/export.sh` and `python3 tools/crop.py`. Exports are 2× and cropped to content on the board background.

Caveat: because the text is flattened, editing copy in OpenPencil means editing individual line nodes. Re-flow from the source instead. `openpencil fonts` reports Literata and IBM Plex Mono as "substituted" for the app, but the PNG export renders both correctly.

## Theater (06) — light + dark (redesigned 2026-10-17; size lock approved same day)

Theme follows the app chrome. **Do not** put light theater into a dark shell or vice versa.
Book is locked to **XL**; chrome pill is **Exit Esc only** (see Theater chrome below).

### Light (`06-theater-light.png`)
- Obsidian / Atomic 1.5.0 **light** chrome stays light (cream / `#F5F5F5` family); chrome dims slightly (opacity) while theater is on — mouse restores, Esc exits.
- Room is warm linen / taupe, not a black stage void.
- Curtains: soft fabric folds in warm neutrals parting left/right — **not** black velvet + neon orange bars.
- Book is the lit hero: cream paper (`#f0eee6` / `#f0e8d2` family), soft warm key from upper-left, soft fill on the shaded page, gentle contact shadow under the spread, warm rim on paper edges.
- Side lighting = soft radial **pools** on book edges, not vertical orange gradient strips.

### Dark (`06-theater-dark.png`)
- Full **dark Obsidian** desk chrome (`#1e1e1e` / `#262626`).
- Museum-grade room: deep warm dark (`#0e0c0a`), one soft warm key on cream paper (tokengremlin lighting craft), contact shadow, warm side pools.
- Same curtain metaphor in charcoal / taupe folds — still no fake orange bars.

### What changed vs old `06-theater.png`
| Old (rejected) | New |
|---|---|
| Dark brown / black void inside light chrome | Light theater stays light; dark theater uses dark chrome |
| Fake orange gradient side bars (`.sidew`) | Soft radial lamp pools only |
| Flat white page rectangles | Cream paper with directional key / fill gradients + contact shadow |
| Toy lamp props + heavy velvet curtains | Linen/taupe fabric folds; no hard lamp fixtures |
| Rough “AI stage” feel | Theme-matched museum craft |

Pipeline: edit `journey.source.html` → `bash tools/build.sh` → `openpencil import journey.html -o atomic-reader-journey.fig` → `bash tools/export.sh` → `python3 tools/crop.py`.

## Theater chrome (06) — locked XL · Exit Esc only (approved 2026-10-17)

Theater is **not** a place to change book size. Product rule:

- Locked to **XL**: page 340×500, ~22–23 lines, Literata 12.5/19 (same type as the settled reader).
- Chrome pill is **Exit Esc only** — no `S · M · L · XL`, no `⌘ − / +`.
- Light theater = light linen; dark theater = dark museum. No purple. No fake orange bars.
- Curtains part wider for XL (168 → 108px) so the locked book fits.
- Chrome auto-hides after 2 s idle; mouse move / tap restores it; Esc exits.

Supersedes older notes that put Book size in the theater pill or that used frames `06c` / `06d` / `06cd` to demonstrate theater resizing. Those frames are **removed** from the board and from `export/`.

## Book size (07, 07b) — settled reader + phone sheet only

**Control.** Segmented `S · M · L · XL`. Each segment has a book glyph that grows with the size, plus a letter. It's 28px tall with a hairline border, a 9px outer radius, and the active segment raised on paper. `⌘ −` / `⌘ +` (Ctrl on Windows/Linux) steps the size, shown as a mono hint.
- **Reader (07):** right end of the reader toolbar, on the same row as the Shelf/Book/Canvas/Note pills.
- **Theater (06):** **none** — size is locked to XL; pill is Exit Esc only (see above).
- **Phone:** the reading sheet has a "Book size" row with a full-width segmented control (36px tall, 13px labels). Not shown in phone theater if that mode is entered.

**What size does.** It scales the **book**, not the type. Type stays Literata 12.5/19 on desktop. A bigger page holds more lines and more words per line:
| Size | Normal reader page | Lines/page | Theater (locked) |
|---|---|---|---|
| M | 270×340 | 15 | — |
| XL | 340×488 | 22 | 340×500 · ~23 lines (only size in theater) |
S and L sit between the reader steps.

**Persistence.** Saved per book in the book note frontmatter (`reader.size: xl`), next to the last-read page. A new book starts at the vault default (M). Entering theater uses XL regardless of the settled size control shown in 07 / 07b.

**Motion.** On the settled reader, resizing animates page width/height and re-flows the text over 200 ms `cubic-bezier(0.2, 0, 0, 1)`, anchored on the first visible line so you keep your place. With `prefers-reduced-motion: reduce` the change is instant.

Frames: `export/07b-book-size.png` (M vs XL side by side + phone sheet). Theater PNGs (`06-theater-light.png`, `06-theater-dark.png`, `06-theater.png`) show Exit-only chrome + XL book — not a size control.
Build note: `tools/flatten.js` also clips line nodes at `.lc` containers, so pages show whole lines only.
