---
name: obsidian-plugin-e2e
description: >-
  End-to-end develop, verify, and ship an Obsidian community plugin. Use for
  new plugins, Atomic Tracker work, Selenium Obsidian E2E, GitHub plugin
  releases, community directory submission, plugin-review lint, vault-as-markdown
  architecture, or /obsidian-plugin-e2e.
---

# Develop and deliver an Obsidian plugin

This skill is the pipeline Atomic Tracker uses to go from a change to a directory-ready GitHub release. Follow it in this repo. Copy the same shape when starting another plugin.

Read this file first, then the reference for the phase you are in. Do not skip phases that produce proof.

| Phase | Reference |
| --- | --- |
| Layering, vault data, codeblocks | [references/architecture.md](references/architecture.md) |
| Unit tests, typecheck, build, Selenium | [references/verify.md](references/verify.md) |
| Directory review lint that actually failed here | [references/plugin-review.md](references/plugin-review.md) |
| Version, GitHub Release, community directory | [references/release.md](references/release.md) |
| Cloud VM, Obsidian install, `AGENTS.md` | [references/cloud.md](references/cloud.md) |

Official docs stay canonical for API and directory rules:

- [Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin/)
- [Manifest](https://docs.obsidian.md/Reference/Manifest)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin)

Atomic is the working example, not a second sample plugin. Prefer its files over `obsidianmd/obsidian-sample-plugin` once you are past bootstrap.

## Hard stops

Stop and fix before the next phase if any of these fail.

1. Domain logic imports `obsidian`. Move it to a pure module.
2. A user-visible control has no stable `data-testid`. Add the hook and the Selenium assertion together.
3. Live DOM is built with `innerHTML`, `outerHTML`, or `insertAdjacentHTML`. Paint with `createDiv` / `createEl`.
4. `styles.css` uses `:has(`, `!important`, or `scrollbar-width`. Replace them.
5. A vault path from settings or user input is not validated. Run it through `normalizePath` and a folder-safety helper.
6. `npm test`, `npm run typecheck`, or `npm run build` fails.
7. Obsidian is installed and `npm run test:e2e` is skipped without recording why.
8. Release tag is `v1.2.3` or assets omit `main.js` / `manifest.json`.

Computer-use is not the health check. `npm run test:e2e` is. Use computer-use only after Selenium fails and you have screenshots under the e2e artifact dir.

## 0. Doctor the repo

Read `AGENTS.md`, `package.json`, `manifest.json`, and `esbuild.config.mjs` before editing.

Confirm:

- Plugin `id` in `manifest.json` is kebab-case, unique, and does **not** contain `obsidian`. Folder name under `.obsidian/plugins/` matches that `id`.
- `name` does not contain `Plugin` or `Obsidian`.
- `minAppVersion` matches the oldest API you call without a feature detect.
- `package.json` `version` equals `manifest.json` `version`.
- Scripts exist: `test`, `typecheck`, `build`, `dev`. Add `test:e2e` before any UI ships.

Atomic identity: `id` is `atomic-tracker`, repo is `obsidian-atomic`. Do not rename the id to match the repo.

## 1. Lock identity and data layout

Before writing features, write down:

- Plugin `id`, display `name`, `minAppVersion`, `isDesktopOnly`
- Vault paths the plugin creates (Atomic defaults live under `atomics/**`)
- Codeblock languages (`atomic-heatmap`, `atomic-timer`, …)
- Settings keys and the markdown note shape they point at

Do not invent a database. Notes and frontmatter are the store. Settings hold paths, colors, enabled flags, and catalogs. See [architecture.md](references/architecture.md).

Greenfield bootstrap:

1. Copy [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) or clone Atomic's layout.
2. Move code under `src/`, entry `src/main.ts`.
3. Bundle CJS to repo-root `main.js` with esbuild. Externalize `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`.
4. Keep `manifest.json` and `styles.css` at repo root.
5. Add Node tests that import `src/**/*.ts` with `--experimental-strip-types` (Node 22+).

Develop in a **throwaway vault**, never the user's main vault.

## 2. Implement in layers

```text
src/core.ts, src/core/*     pure parse / model / timer  (no obsidian)
src/util/*                  path safety, caches, layout
src/data/*                  Vault API adapter
src/views/*, src/codeblocks.ts   markdown post-processors
src/commands/*, src/settings.ts  palette + settings
src/main.ts                 Plugin subclass, register, refresh
```

Rules:

- Put parsing, timers, heatmap math, and markdown rewrites in pure modules. `tests/*.mjs` imports those files directly.
- Views call `el.createDiv` / `el.createEl`. They do not concatenate HTML into the live tree.
- Mutate notes with `vault.process` (background) or `fileManager.processFrontMatter` (YAML). Use the Editor API for the active file so cursor and folds survive.
- Register vault/metadata listeners with `this.registerEvent`. Debounce refresh. Do not scan the whole vault to find one path; use `getAbstractFileByPath`.
- Sanitize text that becomes a markdown bullet or table cell. Atomic's time-log append is the pattern (`tests/security.test.mjs`).
- Feature-detect APIs newer than `minAppVersion`. Atomic keeps `minAppVersion` at `1.5.0`, implements `display()` and `getSettingDefinitions()`, and does not call `setWarning` / `setDestructive`.

UI copy is sentence case. No default command hotkeys. No `console.log` in shipped code.

## 3. Prove it without Obsidian, then with Obsidian

Run this loop after every behavioral change:

```bash
npm test
npm run typecheck
npm run build
```

Then, if Obsidian is present or you can install it:

```bash
npm run test:e2e
```

`main.js` is a committed production bundle in Atomic. After a local `build` / `dev` you do not intend to ship, restore it:

```bash
git checkout -- main.js
```

Details, selectors, vault seeding, and skip rules: [verify.md](references/verify.md). Cloud install of the `.deb`: [cloud.md](references/cloud.md).

## 4. Keep the review linter green

Directory review is an automated gate, not a later cleanup. Encode the rules as tests the way Atomic does in `tests/e2e-selectors.test.mjs` (hooks present, `innerHTML` absent, CSS bans). See [plugin-review.md](references/plugin-review.md).

Re-read [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) when a review comment appears. Fix the root cause, bump a patch, cut a new GitHub release. Editing the listing description does not re-run asset checks.

## 5. Ship

Do not bump versions on every PR. Atomic's CI tests and builds; humans (or a `workflow_dispatch` job) cut the release.

Release proof:

- `package.json`, `manifest.json`, `versions.json`, and `package-lock.json` share the new semver
- Git tag equals that semver with **no** `v` prefix
- GitHub Release attaches `main.js`, `manifest.json`, `styles.css` as binaries (zip is extra)
- Default-branch `manifest.json` `version` matches that tag

First listing: [community.obsidian.md](https://community.obsidian.md) after a real GitHub release exists. Later versions are pulled from GitHub automatically. See [release.md](references/release.md).

## Definition of done

A change is done when:

1. `npm test`, `npm run typecheck`, and `npm run build` pass.
2. `npm run test:e2e` passed, or the summary states Obsidian could not be installed or launched after a real attempt.
3. New UI has `data-testid` hooks and Selenium coverage (or a source-level hook test if the flow is not yet in the health check).
4. Docs the user would hit are updated (`README.md`, `docs/USER_GUIDE.md`, examples). Mockups under `docs/mockups/` do not replace E2E.
5. You did not commit an accidental `main.js` rebuild unless the release is supposed to include it.

## Atomic map

| Need | Open |
| --- | --- |
| Plugin entry | `src/main.ts` |
| Pure domain | `src/core.ts`, `src/core/hobby.ts`, `src/core/gym-log.ts` |
| Codeblocks | `src/codeblocks.ts`, `src/util/codeblock-languages.ts` |
| Vault I/O | `src/data/vault-source.ts`, `src/util/vault-path.ts` |
| Settings | `src/settings.ts` |
| Bundle | `esbuild.config.mjs` |
| Unit tests | `tests/*.mjs` |
| Selenium | `e2e/health-check.test.mjs`, `e2e/lib/obsidian.mjs`, `e2e/lib/vault.mjs` |
| Hook / CSS bans | `tests/e2e-selectors.test.mjs` |
| CI / release | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |
| Version bump | `scripts/bump-version.mjs` |
| Cloud rules | `AGENTS.md` |
