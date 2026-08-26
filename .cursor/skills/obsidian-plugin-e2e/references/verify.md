# Verify

Prove behavior on three rungs: Node tests of pure modules, a production bundle, then a real Obsidian window. Atomic's commands:

```bash
npm test              # node --experimental-strip-types --test tests/*.mjs
npm run typecheck     # tsc --noEmit
npm run build         # esbuild production → main.js
npm run test:e2e      # build, then node --test e2e/*.test.mjs (180s timeout)
```

Node 22+ is required for strip-types. CI uses Node 22.

## Unit tests

Put cases in `tests/*.mjs`. Import `../src/....ts` directly. Do not mock `obsidian` to test parsing.

Cover:

- Parsers and markdown writers (`tests/core.test.mjs`, `tests/hobby-timer.test.mjs`, `tests/gym-log.test.mjs`)
- Path safety and injection (`tests/security.test.mjs`)
- Settings merge / migrate
- Source contracts Selenium depends on (`tests/e2e-selectors.test.mjs`)
- Workflow shape (`tests/ci-paths.test.mjs`) so CI cannot silently stop being a required check

When you add a `data-testid`, add a `assert.match` on the view source in `tests/e2e-selectors.test.mjs` in the same change. A renamed hook that only lives in Selenium will pass unit tests and fail in the vault.

## Production bundle

`npm run build` must write repo-root `main.js`. The e2e vault copier and the GitHub Release both read that path.

After a local build you do not intend to commit:

```bash
git checkout -- main.js
```

Atomic commits `main.js` as the artifact users who clone the repo can drop into a vault. Do not gitignore it here. A new plugin may choose to gitignore `main.js` and attach it only on the GitHub Release; then document that in `AGENTS.md` so agents stop restoring a file that is not tracked.

## Selenium health check

`e2e/health-check.test.mjs` is the GUI suite. It launches Obsidian, attaches ChromeDriver to CDP, and drives the plugin through `data-testid` hooks.

Harness:

- `e2e/lib/vault.mjs` seeds an isolated vault (default `/tmp/atomic-tracker-e2e-vault`), writes `.obsidian/community-plugins.json`, deploys `main.js` / `manifest.json` / `styles.css`, and refuses to delete the repo, `$HOME`, or `/tmp` itself
- `e2e/lib/obsidian.mjs` finds `/usr/bin/obsidian` or `$OBSIDIAN`, launches with `--no-sandbox` and `--remote-debugging-port=9222`, waits for CDP, downloads a matching ChromeDriver, dismisses the trust-vault dialog, and waits until `app.plugins.plugins["atomic-tracker"]` exists

Stable handles Atomic already uses: `atomic-heatmap`, `atomic-heatmap-today`, `atomic-timer-*`, `atomic-gym-log-*`, `atomic-cues`, `atomic-bookshelf`, `atomic-book`, `atomic-setting-*`, `atomic-property-select`.

Drive notes by vault path (`openVaultFile`), commands by palette query or `app.commands.executeCommandById`, settings by `openTabById("<plugin-id>")`. Read notices in one `executeScript` over `.notice` nodes. Do not `findElements(By.css(".notice"))` and then read them; Obsidian recycles those nodes.

On assertion failure, screenshot to `$ATOMIC_E2E_ARTIFACTS` (default `/tmp/atomic-e2e-artifacts`). Inspect those files before reaching for computer-use.

### Skip vs fail

`e2eSkipReason()` returns a string when `SKIP_E2E=1`, Obsidian is missing, or there is no X display. The suite then **skips**. That is allowed only after you tried to install and launch Obsidian. Record the skip reason in the PR.

A skipped suite is not a pass. Do not treat HTML mockups under `docs/mockups/` as a substitute.

### What the health check must cover when you touch UI

If you change a user-visible path, add or update a test in `e2e/health-check.test.mjs` for that path. Atomic's current suite includes:

- Plugin enabled
- Cue / timer / gym-log / bookshelf blocks render
- Heatmap `activity:` filters
- Property dropdowns
- Settings color picker, enable/disable, delete, add habit
- Create reading item + start/stop timer (heatmap minutes)
- Gym set add (catalog + new exercise → markdown table)
- Bookshelf status filter
- Open reading Bases, plus Notices when Bases or Reading is off

Leaving that list stale after a UI change is a bug.

## Computer-use

Do not use the computer-use agent as the primary health check. It is slower and non-deterministic on a path Selenium already covers. Use it only to debug a failed `npm run test:e2e` after looking at `/tmp/atomic-e2e-artifacts/`.

## Docs screenshots (separate from e2e)

User-guide and README captures are not the health check. When you recapture them:

1. Disable Readable line length
2. Fullscreen Obsidian
3. Light mode
4. Invented demo covers from `docs/demo-covers/`, never publisher artwork or Open Library URLs

Scripts: `npm run docs:user-guide-screenshots`, `scripts/capture-readme-hero.sh`.
