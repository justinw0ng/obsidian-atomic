# Reader mockup — notes

This folder is a **design review only**. `reader-mock.html` is not plugin code. Do not merge it as a feature.

The live mock sits desktop and phone side by side. Theme and motion toggles match the 1.5.0 revamp board. Copy is short and plain.

## What this proposes

A new **reader** for EPUB and PDF files that already live in the vault. It is separate from the existing book note, and linked to it.

- Open a file from the book shelf, including a shelf **block inside a note in reading mode**. The book comes toward you and opens on the last page you read. The open lands in **theater**: Obsidian chrome fades, the page sits in a warm vignette.
- Open from a canvas card. You land on that card’s page.
- Highlight, remark, or ask. Each one writes a card on **one canvas per book**.
- Remarks sit in the page margin, lined up with the highlight. On a phone they start as dots.
- Ask uses a key the user keeps in **Obsidian secret storage**. Scope is this page, this selection, or the whole book.
- Minutes spent reading feed the existing Reading sessions and heatmap.
- Desktop and phone have the same actions. The layout changes; the product does not.

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

The mock **Reading view** scene is a note in reading mode with an `atomic-bookshelf` block. Tap Pride and Prejudice. The open starts from that cover’s on-screen rect on desktop and on the phone.

## Theater mode (decided)

Reading should feel like a cinema. When the open-book motion finishes, the surrounding Obsidian chrome (ribbon, tabs, view header, status bar, phone nav) dims and fades. The page sits centred at a comfortable measure (~28em per leaf, one column on a phone) on a soft dark vignette with a warm light on the paper. Margin remarks and Ask stay. Chrome comes back on mouse-to-edge (desktop) or an edge tap (phone), then auto-hides after idle. **Esc** or the Exit control leaves theater. Light and dark each have their own void/glow. `prefers-reduced-motion` (and the board Reduced toggle) is an instant fade, no delayed chrome hide.

**Mount in Obsidian.** Same window rule as the open overlay. Do **not** `requestFullscreen` as the only path (popouts, iOS WKWebView). Do **not** clip the workspace with `clip-path` or CSS masks (directory review). Two honest shapes:

1. **Preferred.** Paint the reader into a `position: fixed; inset: 0` host on `activeDocument.body` (read `activeWindow` / `activeDocument`, not `globalThis`). One host per window, including a popout. The original workspace leaf stays in the tree for restore on exit. Vignette is stacked `radial-gradient`s on that host. Page warm light is `box-shadow` (outer + inset), not a mask.
2. **Fallback.** Keep the leaf, collapse left/right splits, and dim other leaves. Still put the vignette on `activeDocument.body` so it covers the ribbon and status bar the leaf cannot own.

The mock’s `.ob-window.is-theater` / `.ob-phone-screen.is-theater` is (1): chrome is taken out of flow and faded; the reader fills the window. `[data-overlay-host=window]` already lives on that same frame, so the flying book and the vignette share a surface. During the flight the window gets `is-entering-theater` so chrome starts fading mid-open; `done` then renders theater. No second jump.

**Phone.** Full-bleed immersive. The hardware island and home indicator stay. Obsidian chrome (status, view header, tab bar) fades. Safe-area insets (`env(safe-area-inset-*)`) pad the page so it does not sit under the notch. The Ask sheet is a glass panel on the vignette, not a second theme.

**Idle and restore.** Pointer in a 32px edge, or a tap that is not on the page / a remark / Ask, reveals chrome for ~2.2s. Esc exits theater and puts the leaf back in the normal reader chrome. A command “Toggle theater” matches the in-reader control.

The mock **Replay open** (library or reading view) lands in theater. Reader / Select / Ask on the board open theater. Reduced motion skips the 3D and still lands there instantly.

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

### Phase 6 — Motion and theater

Open-book animation 1.2–1.6s from a shelf cover **and** from a reading-view block, tap to skip, reduced-motion cut. Overlay on `activeDocument.body`. The flight fades chrome and lands in theater (vignette, centred page, edge-reveal chrome). 2D fallback on phone if Phase 2 frames are not stable.

### Phase 7 — Whole-book Ask

Confirm + size warning. Retrieval over a full paste. Stay optional forever.

## Out of scope for v1

- Buying or downloading books
- A built-in model or a proxy we run
- Sharing a canvas or an answer off-device
- Handwriting / stylus layers
- Continuous scroll as the only PDF mode (page mode first)
- Translating the whole book
