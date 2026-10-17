# Reader mockup — notes

This folder is a **design review only**. `reader-mock.html` is not plugin code. Do not merge it as a feature.

The approved design is the OpenPencil journey in `design/reader-journey/` (`JOURNEY.md`, `journey.source.html`, `atomic-reader-journey.fig`, PNGs in `export/`). This HTML mock is kept in sync with that journey so reviewers can click through chooser, flight, theme-matched theater, and book size. Theme and motion toggles match the 1.5.0 revamp board. Copy is short and plain.

## What this proposes

A new **reader** for EPUB and PDF files that already live in the vault. It is separate from the existing book note, and linked to it.

- Tap a cover on the shelf or on a shelf **block inside a note in reading mode**. A **chooser** appears: **Open Notes** is the default (always there). **Open Book** shows only when an EPUB/PDF is linked; otherwise that row is hidden.
- Open Notes stays on the book note. No theater.
- Open Book is a **continuous in-place flight** on the same leaf: cover lifts → hinge opens → pages flip → spread forms → lands on last-read p. 47. No second layout jump. Overlay on `activeDocument.body` so a reading-view re-render cannot kill it.
- **Theater follows the theme.** Light theme → light theater (linen curtains, soft warm key on cream paper, contact shadow). Dark theme → dark theater. No black stage, no orange side bars. Chrome auto-hides after 2s; mouse or tap restores it. **Exit** and **Esc** leave theater.
- **Book size S · M · L · XL** (`⌘−` / `⌘+`) lives in the reader toolbar, the theater chrome pill, and the phone sheet. It enlarges the **page**, not the type (M 15 lines, XL 22–23). Saved per book as `reader.size` frontmatter. 200ms resize; instant under reduced motion.
- Open from a canvas card. You land on that card’s page.
- Highlight, remark, or ask. Each one writes a card on **one canvas per book**. Remarks sit in the page margin, lined up with the highlight. On a phone they start as dots.
- Ask uses a key the user keeps in **Obsidian secret storage** (`requireApiVersion("1.11.4")`). Older Obsidian: Ask off. Scope is this page, this selection, or the whole book.
- Minutes spent reading feed the existing Reading sessions and heatmap.
- Desktop and phone have the same actions. The layout changes; the product does not. Typography is Literata 12.5/19 desktop, 15/23 phone. 1.5.0 tokens (hairlines, radii 3 / 9 / 14, Inter + Literata). No purple.

The book note stays the ledger (`atomics/hobbies/Reading/Items/<Book>.md`). Frontmatter already has `related_canvas`. The canvas is the map. The reader is the place you read.

## Secret storage (decided)

Verified against `obsidian@1.13.1` typings (`node_modules/obsidian/obsidian.d.ts`) and the official guide [Store secrets](https://docs.obsidian.md/plugins/guides/secret-storage). Desktop changelog for [1.11.4 (2026-01-12)](https://obsidian.md/changelog/2026-01-12-desktop-v1.11.4/) shipped Keychain settings plus the plugin API.

| Symbol | What it is | `@since` |
| --- | --- | --- |
| `App.secretStorage` | Vault Keychain on `app` | 1.11.4 |
| `SecretStorage` | `setSecret(id, secret)`, `getSecret(id): string \| null`, `listSecrets(): string[]` | 1.11.4 |
| `SecretComponent` | Settings picker: existing secret or create one | class 1.11.1; `setValue` / `onChange` 1.11.4 |
| `requireApiVersion(version)` | `true` when the running app API is that version or newer | long-standing |

`SecretComponent` is constructed as `new SecretComponent(app, el)` inside `Setting.addComponent`, because it needs `App`. The plugin setting stores the secret **name** (id), never the value. Ids are lowercase alphanumeric with optional dashes (`atomic-ask`). Public `SecretStorage` has no `deleteSecret`. Remove in our settings unlinks the name. Replace opens `SecretComponent` again. The user can delete the Keychain entry in Obsidian → Settings → Keychain.

**Gate.** `manifest.json` `minAppVersion` stays **1.5.0**. Do not raise it for Ask. Wrap Ask, the key row, and any `app.secretStorage` / `SecretComponent` call in `if (requireApiVersion("1.11.4"))`.

**Older than 1.11.4.** Ask is **off**. Settings show one line: update Obsidian. No password field. No key in `data.json`. Read, highlight, and remark still work. This is the only fallback.

**What `data.json` may hold.** Provider, model, and the secret **name**. Never the secret value.

**Sync.** The official guide: the value lives in local storage keyed to this vault. It does **not** travel with vault sync. A synced `data.json` can carry the name `atomic-ask` to another device. That device returns `null` from `getSecret` until the user creates or picks the same name in that app’s Keychain. Settings copy should say the key is per device.

**Never leak the value.** Do not log it. Do not write it to a canvas card, a book note, a notice, or a filename. `getSecret` is only for the outbound Ask request to the provider the user picked. Mock toasts say “Saved in Obsidian secrets” / “Provider answered” — never the key.

The mock Settings screen (desktop + phone) shows the stored state: masked value, **Stored in Obsidian secrets**, Replace / Remove. Replace uses the native picker. The board toggle **Older** is the pre-1.11.4 state.

## Open from reading view (decided)

The open-book motion must run when the user taps a cover in **Obsidian reading mode** — a post-processed `atomic-bookshelf` / `atomic-book` block inside a markdown note — not only from Live Preview or a custom view. Desktop and phone. PR #120 fixed blocks that hung on a pending bar in reading mode; this motion has to live with that lifecycle, not fight it.

**Why the overlay cannot live in the block.** Reading view paints through `registerMarkdownPostProcessor` + `MarkdownRenderChild`. Obsidian unloads the child and builds a new one when the note re-renders (edit, refresh, width change, `scheduleRefresh`). A `MarkdownRenderChild.onunload` tears down everything it owns. If the flying book is a child of that host, the animation dies mid-flight and can leak timers. #120 already taught us not to treat `el.isConnected` as “this block is dead” — Live Preview detaches and reattaches the same node — and not to keep a pending shell on a detached reading-view host. `AtomicBlockChild.onload` / `onunload` is the only live list. The overlay is **not** a child of that host.

**Mount.** Append the overlay to `activeDocument.body` (read `activeWindow` / `activeDocument`, not `globalThis`). That is the window that owns the tap, including a popout. `position: fixed; inset: 0; z-index` above the leaf. One overlay per window. Do not parent it under `.markdown-preview-view`, `.markdown-reading-view`, or the codeblock host. The mock’s `[data-overlay-host=window]` on `.ob-window` / `.ob-phone-screen` is that body, not the note.

**Source rect.** On tap, read `cover.getBoundingClientRect()` in that same window **before** opening the reader and **before** any refresh. Store `{ x, y, width, height }` (and the cover color) on the overlay. Convert to overlay-local `--from-x` / `--from-y` / `--from-s` against the body (or the leaf frame). Do not keep a live reference to the cover node as the animation source; the child may unload on the next frame.

**Handoff.** After the rect is copied: open the reader leaf or phone modal; play 1.2–1.6s from that rect into the reader frame; tap skips; `prefers-reduced-motion` (and the board Reduced toggle) skips the flight and opens the reader on the last page. The reader does not wait on the post-processor. Minutes still write a Reading session.

**Cleanup when the note re-renders mid-animation.**

1. `MarkdownRenderChild.onunload` unregisters the block (`untrackLiveBlock`) and invalidates that host’s paint generation. It must **not** remove the window overlay or cancel the flight.
2. A new child may mount and paint a new shelf while the overlay is still flying. That is fine. The overlay already has the snapshot rect.
3. Abort the overlay only when the user leaves the window, the plugin unloads, or the reader finishes / is skipped. Clear the timeout, remove the body node, drop the token. Do not leave a `setTimeout` that calls into an unloaded child.
4. The mock **Re-render block** button replaces `[data-block-host]` and leaves `[data-open]` in place so reviewers can see (3).

**Reduced motion.** No 3D, no page storm. Instant reader. Same on phone.

The mock **Reading view** scene is a note in reading mode with an `atomic-bookshelf` block. Tap Pride and Prejudice. The chooser opens from that cover. Open Book then flies from that cover’s on-screen rect, on the window, not inside the note.

## Chooser (decided)

Tap a cover → chooser sheet, not an instant open.

- **Open Notes** — primary, default (`↵`), always available. Stays on the existing book note. No theater.
- **Open Book** — only when an EPUB or PDF is linked. Hidden in the no-file state.
- **Cancel** dismisses the sheet.

The mock **Chooser** scene is Pride and Prejudice with a file. Leaves of Grass on the shelf has no file, so Open Book is hidden.

## Theater mode (decided)

Theater is the Open Book landing, not a black void around an unchanged reader. **Theme follows the app chrome.** Do not put light theater in a dark shell or the reverse.

**Light.** Obsidian / Atomic 1.5.0 light chrome stays light (cream / `#F5F5F5`). Room is warm linen / taupe. Curtains are soft fabric folds in warm neutrals — **not** black velvet and **not** neon orange bars. The book is the lit hero: cream paper (`#f0eee6` / `#f0e8d2`), soft warm key from upper-left, soft fill on the shaded page, contact shadow under the spread, warm rim on paper edges. Side lighting is soft radial **pools**, not vertical orange strips.

**Dark.** Full dark Obsidian desk (`#1e1e1e` / `#262626`). Room is deep warm dark (`#0e0c0a`). Same curtain metaphor in charcoal / taupe. Cream paper still, with a museum key, contact shadow, and warm side pools.

**Chrome.** Obsidian chrome (ribbon, tabs, view header, status) dims, then auto-hides after **2s**. Mouse move or tap restores it. A theater pill at top center holds **Book size** and **Exit Esc**. **Esc** or Exit leaves theater. Phone keeps island, status, home indicator, and bottom nav. `prefers-reduced-motion` is an instant fade, no 3D.

**Open lands on the reader.** Snapshot the cover rect, then paint the reader under the overlay. Measure `.atomic-page` (desktop: both leaves; phone: the column). The flying book’s `--to-x` / `--to-y` / `--to-s` map the opened spread onto those rects (p. 47, same text). Overlay lifts with no second layout and no crossfade. Replay Open Book (library or reading view) flies onto that spread, then theater.

**Mount in Obsidian.** Same window rule as the open overlay. Do **not** `requestFullscreen` as the only path (popouts, iOS WKWebView). Do **not** clip the workspace with `clip-path` or CSS masks (directory review). Keep the reader leaf. Fade ribbon / tabs / view header / status in place on `activeDocument` (read `activeWindow` / `activeDocument`, not `globalThis`).

The mock `.ob-window.is-theater` / `.ob-phone-screen.is-theater` is theme-matched linen or museum, with curtains, key light, and the size/Exit pill. `[data-overlay-host=window]` shares that frame, so the flight can target the live page rects.

## Book size (decided)

Segmented **S · M · L · XL**. Each segment has a book glyph that grows with the size. `⌘ −` / `⌘ +` (Ctrl on Windows/Linux) steps it.

- **Reader:** right end of the toolbar, same row as Shelf / Canvas / Note.
- **Theater:** in the auto-hiding chrome pill (`Book size · Exit Esc`).
- **Phone:** a "Book size" row with a full-width segmented control.

**What size does.** It scales the **book**, not the type. Type stays Literata 12.5/19 desktop, 15/23 phone. M page 270×340, 15 lines. XL page 340×488 (theater 340×500), 22–23 lines. In theater, XL parts the curtains wider.

**Persistence.** Saved per book in the book note frontmatter (`reader.size: xl`), next to last-read page. New books start at M.

**Motion.** 200ms `cubic-bezier(0.2, 0, 0, 1)`, anchored on the first visible line. Reduced motion is instant.

The mock **Replay open** (library or reading view) skips the chooser and plays Open Book onto p. 47, then theater. Reduced motion skips the 3D and still lands there.

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

**Key storage.** See [Secret storage (decided)](#secret-storage-decided). The key is never written to `data.json`. A plaintext fallback is out.

**Canvas file size.** Every Q&A creates cards. A heavy reader will grow a `.canvas` into a slow graph. Cap auto-cards, or fold old answers into a chapter group rather than one card per turn forever.

**Highlight alignment after reflow.** EPUB font/size/width changes move the line a remark was tied to. Store a locator that can be re-resolved, and show a “line moved” state instead of a silent miss.

**Mobile memory.** Large PDF + animation + canvas preview in one webview can OOM. Keep the animation overlay off-DOM when idle. Do not rasterize the whole book for the flip.

**Reading-view open.** See [Open from reading view (decided)](#open-from-reading-view-decided). The overlay is a window-body layer. A post-processor re-render must not own it or the motion dies the way blocks used to hang in #120.

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

### Phase 5 — Ask, BYO key in Obsidian secrets

Settings: provider, model, and a `SecretComponent` that picks or creates a Keychain secret. Gate the whole Ask surface with `requireApiVersion("1.11.4")`. Ask on **this page** and **this selection**. Each answer is a canvas card. Phone uses the same Ask as a bottom sheet. No whole-book yet. No plaintext key field on any version.

### Phase 6 — Motion, chooser, theater, and book size

Chooser first (Open Notes default; Open Book only with a file). Open-book animation 1.2–1.6s from a shelf cover **and** from a reading-view block, tap to skip, reduced-motion cut. Overlay on `activeDocument.body`. The flight targets the live reader page rects and lands on that same spread (no jump), then theme-matched theater (linen in light, museum in dark; Exit + Esc; chrome hides after 2s). Book size S·M·L·XL in reader, theater, and phone sheet. 2D fallback on phone if Phase 2 frames are not stable.

### Phase 7 — Whole-book Ask

Confirm + size warning. Retrieval over a full paste. Stay optional forever.

## Out of scope for v1

- Buying or downloading books
- A built-in model or a proxy we run
- Sharing a canvas or an answer off-device
- Handwriting / stylus layers
- Continuous scroll as the only PDF mode (page mode first)
- Translating the whole book

## Source of truth

The approved OpenPencil reader journey in `design/reader-journey/` (`atomic-reader-journey.fig`, PNG exports in `export/`, `JOURNEY.md`) is the spec. This HTML mock matches that spec (chooser, flight, theme-matched theater, book size). Older HTML stills that showed a dark stage around an unchanged reader are superseded.
