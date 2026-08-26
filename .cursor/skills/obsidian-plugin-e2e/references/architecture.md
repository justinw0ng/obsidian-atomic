# Architecture

Obsidian loads one CJS file, `main.js`, plus `manifest.json` and optional `styles.css`. Everything else is a packaging choice. Atomic keeps TypeScript under `src/` and tests the parts that do not need the app.

## Layers

**Pure core.** `src/core.ts` and `src/core/*` parse markdown tables, cue lists, timer logs, and heatmap levels. They import nothing from `obsidian`. Node's test runner loads them with `--experimental-strip-types`. If a function needs `App`, `TFile`, or `Notice`, it does not belong here.

**Path and cache helpers.** `src/util/vault-path.ts` rejects `..`, absolute paths, and drive letters. Scan prefixes end in `/` so `Gym` does not match `Gymnastics`. List caches in `src/data/vault-source.ts` drop on vault events; they do not iterate `vault.getFiles()` to find a known path.

**Vault adapter.** `VaultDataSource` reads with `cachedRead` / `getFileCache`, writes with `vault.process`, and creates notes through the Vault API. Views never open `adapter` for plugin data.

**UI.** `src/codeblocks.ts` registers markdown post-processors. Each fence becomes a live block that re-renders on a debounced vault refresh. Views in `src/views/` paint DOM with `createDiv` / `createEl` and set `data-testid` on anything Selenium will click or assert.

**Plugin class.** `src/main.ts` loads settings, registers codeblocks, commands, settings tab, and property widgets, then refreshes on vault/metadata events. Commands that need a condition use `checkCallback`. Unconditional commands use `callback`.

## Vault as the database

Atomic's default tree:

```text
atomics/
├── Dashboard.md
├── exercise/<Activity>/Cues.md
├── exercise/<Activity>/YYYY/YYYY-MM-DD.md
└── hobbies/<Activity>/Items/<Item>.md
```

Session notes carry frontmatter (`type`, `date`, `activity`, `duration_min`, …) and markdown tables. Hobby items carry timer logs in the note body. Heatmaps derive minutes from those notes, not from `data.json`.

`data.json` (plugin settings) stores:

- language, timezone, dashboard/cue paths
- activity catalog (`id`, `domain`, `folder`, `enabled`, `baseColor` / four heatmap shades, capability flags)
- gym exercise catalog and setup state

If a value should survive a settings reset or be editable as text, it belongs in a note.

## Codeblocks are the product surface

Users paste fences, not custom views. Each language has a parser in `src/util/parse-block.ts` (comment lines starting with `#` are ignored). New options go in:

1. the parser / defaults
2. the view
3. the fence comments in newly created notes (`examples/` and command templates)
4. `docs/USER_GUIDE.md`
5. Selenium if the option is user-visible

Keep `fitness-*` aliases only while a migrate path still needs them.

## Bundle

`esbuild.config.mjs` builds `src/main.ts` → `main.js` as CJS, `target: es2020`. Production drops sourcemaps. Dev watches. `OBSIDIAN_PLUGIN_OUT` copies `main.js`, `manifest.json`, and `styles.css` into a vault plugin folder when that directory exists.

Do not bundle `obsidian` or CodeMirror. They are provided at runtime.

Typecheck is a separate `tsc --noEmit`. Production `npm run build` in Atomic is esbuild only; CI runs typecheck first. Keep that split so a type error is not hidden inside a bundle log.

## Mobile and minAppVersion

`isDesktopOnly: false` unless you call Node or Electron APIs. Avoid lookbehind in regexes if you claim mobile support.

Call APIs introduced after `minAppVersion` only behind a feature detect, and keep a fallback that still works on `minAppVersion`. Atomic's settings tab implements both `display()` (pre-1.13) and `getSettingDefinitions()` (1.13 settings search). It does not call `setWarning` or `setDestructive`.

## Privacy

Default to local-only. No telemetry, accounts, or ads. The only network fetch Atomic performs is a user-supplied `http(s):` cover URL, which Obsidian loads like any other remote image. Document that in the README.

## What not to copy from the sample plugin

- Class names `MyPlugin` / `SampleSettingTab`
- A single `main.ts` that mixes parse logic and DOM
- `var`, `innerHTML`, default hotkeys
- Logging with `console.log`
- `workspace.activeLeaf` (use `getActiveViewOfType` / `activeEditor`)
- Detaching leaves in `onunload`
