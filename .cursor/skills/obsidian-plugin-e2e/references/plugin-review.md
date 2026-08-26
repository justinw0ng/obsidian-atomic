# Plugin-review lint

Obsidian's community directory runs an automated review on your GitHub repo and release assets. Atomic failed this once on heatmap DOM, settings APIs, and CSS. Those fixes are now tests. Treat a new review comment the same way: fix the code, add a source assertion, cut a new release.

Canonical text: [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).

## DOM

Do not assign `innerHTML`, `outerHTML`, or `insertAdjacentHTML` on live plugin UI.

Paint with `createDiv` / `createEl` and `el.empty()`. Atomic's heatmap keeps a string builder `heatmapWeeksHtml` for Node tests that have no DOM, and paints the real grid with `appendHeatmapWeeks` → `createDiv`. Review looks at shipped `main.js`. If the live path still assigns `innerHTML`, the string helper does not save you.

Prefer Obsidian helpers over `document.createElement`. `tests/e2e-selectors.test.mjs` asserts heatmap paint uses `createDiv` and does not call `createElement`.

Escape any value that still lands in an HTML attribute helper (`escapeHtmlAttr` in `src/util/heatmap-model.ts`).

## Settings

- Sentence case. No heading that is just the plugin name. No "settings" in section headings.
- `new Setting(el).setName("…").setHeading()` instead of `<h2>`.
- Obsidian 1.13+ settings search reads `getSettingDefinitions()`. Keep `display()` as the pre-1.13 fallback. Do not recurse into `display()` to redraw; call `update()` when it exists.
- Do not call `setWarning()`. Atomic styles destructive actions with `mod-warning` rather than `setDestructive()`, which is newer than `minAppVersion` `1.5.0`.
- `authorUrl` is the GitHub **profile**, not the plugin repository URL (`tests/ci-paths.test.mjs`).

## CSS

Atomic bans these in `styles.css` because review flagged them:

| Ban | Why / replacement |
| --- | --- |
| `:has(` | Use a class on the host (`atomic-block-host`) or JS (`unclipBookShelfAncestors`) |
| `!important` | Raise specificity (`button.atomic-book`, `img.atomic-book-cover-image`) |
| `scrollbar-width` | Keep `::-webkit-scrollbar` / `-ms-overflow-style` if you must style scrollbars |

Use Obsidian CSS variables (`--text-normal`, `--background-modifier-border`, …). Do not hardcode `element.style.color` for theme-facing chrome.

Do not use lookbehind regexes if `isDesktopOnly` is false.

## APIs review and minAppVersion both care about

| Avoid | Use |
| --- | --- |
| Global `app` / `window.app` in plugin source | `this.app` (the e2e harness may use `window.app`) |
| `workspace.activeLeaf` | `getActiveViewOfType`, `activeEditor` |
| `vault.modify` on a background file | `vault.process` |
| Hand-rolled YAML | `fileManager.processFrontMatter` |
| `vault.getFiles().find(path === …)` | `getFileByPath` / `getAbstractFileByPath` |
| Default command hotkeys | Let the user bind them |
| `console.log` in production | `Notice` for the user, nothing for debug |
| Detach leaves in `onunload` | Leave custom views where the user put them |

Register events with `this.registerEvent` so disable/unload drops them.

## Encode each ban as a test

`tests/e2e-selectors.test.mjs` is the checklist:

- Required `data-testid` strings still exist in view source
- `innerHTML` absent from heatmap, gym log
- `setWarning` / `setDestructive` / recursive `display()` absent from settings
- `getSettingDefinitions` present
- `:has(`, `!important`, `scrollbar-width` absent from `styles.css`

When review invents a new ban, add a `doesNotMatch` (or a `match` for the replacement) in that file in the same PR as the fix.

## After a review failure

1. Reproduce from the directory message; do not guess.
2. Fix source, not the listing copy.
3. Run `npm test && npm run typecheck && npm run build && npm run test:e2e`.
4. Bump patch, cut a new GitHub Release. The directory re-reads default-branch `manifest.json` and the matching tag assets.
