# Reader mockup — notes

This folder is a **design review only**. `reader-mock.html` is not plugin code. Do not merge it as a feature.

The live mock sits desktop and phone side by side. Theme and motion toggles match the 1.5.0 revamp board. Copy is short and plain.

## What this proposes

A new **reader** for EPUB and PDF files that already live in the vault. It is separate from the existing book note, and linked to it.

- Open a file from the book shelf. The book comes toward you and opens on the last page you read.
- Open from a canvas card. You land on that card’s page.
- Highlight, remark, or ask. Each one writes a card on **one canvas per book**.
- Remarks sit in the page margin, lined up with the highlight. On a phone they start as dots.
- Ask uses a key you paste in settings. Scope is this page, this selection, or the whole book.
- Minutes spent reading feed the existing Reading sessions and heatmap.
- Desktop and phone have the same actions. The layout changes; the product does not.

The book note stays the ledger (`atomics/hobbies/Reading/Items/<Book>.md`). Frontmatter already has `related_canvas`. The canvas is the map. The reader is the place you read.

## Open questions

1. **Where does the file live?** Frontmatter on the book note (`source: …epub`), a sibling file in `Items/`, or any vault path the user picks?
2. **What is the reader in Obsidian?** A custom view, a leaf in the current tab, or a markdown host note with a codeblock?
3. **One canvas path.** Confirm `related_canvas` points at `Items/<Book>.canvas`. Who creates it — first highlight, first remark, or first open?
4. **Highlights: canvas only, or also the book note?** The note already has a Remarks heading. Duplicate, migrate, or leave the heading for free text?
5. **PDF vs EPUB selection.** PDF pages are fixed. EPUB text reflows. Do remarks store page + quad (PDF) and CFI / chapter + offset (EPUB)?
6. **Two-page spread.** Desktop mock shows a spread. Phone is one column. Does a narrow desktop pane also drop to one page?
7. **Which providers first?** OpenAI-compatible HTTP only, or a short list (OpenAI, Anthropic, local)? Model field: free text or a menu per provider?
8. **Whole-book ask.** Hard cap (tokens or pages), extractive map-reduce, or refuse with a line of copy? Who pays is the user — we still owe a cost warning.
9. **Progress.** One session per open (start / stop like the timer), or a quiet heartbeat while the reader is frontmost?
10. **DRM and copyright.** User-owned files only. No store, no fetch of books. Do we refuse encrypted EPUB?
11. **Offline.** Reader and canvas work with no network. Ask does not. Is that the rule to print in settings?
12. **Jump target.** Canvas card opens the reader in this leaf, or splits a new one?
13. **Unsupported types.** EPUB + PDF only for v1, or also plain `.txt` / `.md`?
14. **Phone dots.** One dot per remark, or one dot per cluster when two remarks share a line?
15. **Animation budget.** Ship the 1.4s open on desktop first, with a flat fade on phone, or both from day one?

## Tech risks

**EPUB renderer license.** The renderer we vendor must be permissively licensed (MIT, BSD, or Apache-2.0) and compatible with this plugin’s Apache-2.0 license. Do **not** vendor an AGPL reader. An AGPL dependency would force the plugin’s license and the community-plugin review. Treat license review as a gate before any renderer is chosen, not a cleanup step.

**PDF.** Use Obsidian’s built-in PDF engine. Do not bundle a second PDF stack. Selection and page jumps must go through that engine’s public surface, or a thin wrapper we own.

**Open-book animation on a phone.** A 1.4s 3D pop + cover swing + rapid page flips will drop frames on older phones and in the Android WebView. Required: tap to skip, `prefers-reduced-motion` jumps straight to the page, and a 2D fallback (scale + fade, no page storm) when the device reports coarse pointer or a reduced frame budget. Measure on a mid-range phone before calling the motion done.

**Whole-book Ask.** Sending a novel exceeds common context windows and costs real money on the user’s key. Risks: truncated answers, surprise bills, and book text leaving the vault. Mitigations: default scope is **this page**; whole-book is a confirm with a size/cost line; chunk and retrieve rather than paste the file; never send the file until the user presses Ask.

**Key storage.** A BYO key in `data.json` is local and not encrypted. Settings copy must say that. Do not log the key. Do not send it anywhere except the provider the user picked.

**Canvas file size.** Every Q&A creates cards. A heavy reader will grow a `.canvas` into a slow graph. Cap auto-cards, or fold old answers into a chapter group rather than one card per turn forever.

**Highlight alignment after reflow.** EPUB font/size/width changes move the line a remark was tied to. Store a locator that can be re-resolved, and show a “line moved” state instead of a silent miss.

**Mobile memory.** Large PDF + animation + canvas preview in one webview can OOM. Keep the animation overlay off-DOM when idle. Do not rasterize the whole book for the flip.

## Proposed phases

Ship in this order. Each phase is usable alone.

### Phase 1 — Link and resume

Attach an EPUB/PDF path to the existing book note. Open the file. Remember last page. Opening from the shelf resumes. Minutes write a Reading session so the heatmap already moves. No AI. No canvas yet.

### Phase 2 — Reader chrome

A reader view with desktop spread and phone column. Page next/prev. Progress readout. Link back to the book note. PDF through Obsidian. EPUB through a license-cleared renderer.

### Phase 3 — Highlight and remark

Select text. Highlight. Remark. Desktop margins; phone dots that expand. Locators jump back to the line. Remarks do not yet require a canvas (buffer in the book note or a sidecar if the canvas is not created).

### Phase 4 — One canvas per book

Create `related_canvas` on first save. Book in the centre. Chapter groups. Highlight / remark cards. Click a card to open that page. Link on the canvas to the book note.

### Phase 5 — Ask, BYO key

Settings: provider, model, key. Ask on **this page** and **this selection**. Each answer is a canvas card. Phone uses the same Ask as a bottom sheet. No whole-book yet.

### Phase 6 — Motion

Open-book animation 1.2–1.6s, tap to skip, reduced-motion cut. 2D fallback on phone if Phase 2 frames are not stable.

### Phase 7 — Whole-book Ask

Confirm + size warning. Retrieval over a full paste. Stay optional forever.

## Out of scope for v1

- Buying or downloading books
- A built-in model or a proxy we run
- Sharing a canvas or an answer off-device
- Handwriting / stylus layers
- Continuous scroll as the only PDF mode (page mode first)
- Translating the whole book
