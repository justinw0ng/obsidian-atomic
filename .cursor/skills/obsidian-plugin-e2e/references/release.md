# Release and directory

Obsidian installs from a GitHub Release whose **tag equals** `manifest.json` `version`. It does not install from the git tree. A zip in the repo or a `v` prefix on the tag will not load in Community plugins.

## Version files

Keep these in lockstep on a release commit:

| File | Field |
| --- | --- |
| `package.json` | `version` |
| `package-lock.json` | root `version` and `packages[""].version` |
| `manifest.json` | `version`, and `minAppVersion` if you raised the floor |
| `versions.json` | `{ "<plugin version>": "<minAppVersion>" }` |

Atomic's helper:

```bash
node scripts/bump-version.mjs          # print
node scripts/bump-version.mjs patch    # also minor|major|none
```

`none` keeps the current version (first release of whatever is already in the files). The script refuses to bump if `package.json` and `manifest.json` disagree.

Do not bump on every feature PR. Atomic's CI no longer auto-bumps. Humans pick the bump when cutting the release.

If two PRs both ship, the merged version must be **greater than** `main`. `scripts/ensure-pr-version.mjs` and `scripts/check-version-conflict.mjs` exist for that conflict; CI itself must not push version commits (`tests/ci-paths.test.mjs` asserts `ci.yml` has no `contents: write`).

## CI

`.github/workflows/ci.yml` runs on every pull request. Path filters skip the expensive job for docs-only changes, but a job named exactly `Test and build` still reports. Branch rulesets require that name; a skipped workflow blocks merge.

When you add a source path, add it to `.github/plugin-source-paths.txt`. `tests/ci-paths.test.mjs` checks the wiring.

Required local/CI commands for plugin changes: `npm run typecheck`, `npm test`, `npm run build`. Upload `main.js`, `manifest.json`, `styles.css` as CI artifacts so a reviewer can sideload the PR build.

`.github/workflows/release.yml` is **manual** `workflow_dispatch` only. Inputs: `bump` (patch/minor/major), `branch` (default `main`), optional `release_notes`. It must not run on `push`.

## Cut a GitHub Release

Atomic's release job:

1. Checkout the chosen branch
2. `node scripts/bump-version.mjs <bump>`
3. `npm run typecheck`, `npm test`, `npm run build`
4. Refuse if tag `VERSION` already exists
5. Commit version files, tag `VERSION` (no `v`), push branch and tag
6. Zip `PLUGIN_ID/main.js|manifest.json|styles.css`
7. Attest the three plugin files
8. `softprops/action-gh-release` with assets: `main.js`, `manifest.json`, `styles.css`, and the zip

Tag format: `1.1.3`, not `v1.1.3`. `PLUGIN_ID` in the workflow must equal `manifest.json` `id` (`atomic-tracker`).

You can run the same steps locally if Actions is unavailable. The directory only cares that the tag exists and the three binaries are attached.

## Community directory (first publish)

1. Default branch has `README.md`, `LICENSE`, and a correct `manifest.json`.
2. A GitHub Release exists for that `version` with the three assets.
3. Sign in at [community.obsidian.md](https://community.obsidian.md), link GitHub, add the plugin.
4. The directory reads `manifest.json` at HEAD of the default branch. `id` must be unique and must not contain `obsidian`.
5. Automated review comments are blocking. Fix, bump, release again. You can edit the public description anytime; that does not replace a new tag.

Older writeups say to PR `obsidianmd/obsidian-releases` `community-plugins.json`. Follow the live [submit guide](https://docs.obsidian.md/plugins/releasing/submit-plugin) if that process has changed again.

After the plugin is listed, new tags on GitHub are enough. Do not open a directory PR for each version.

## Manifest rules that block listing

- `id`: lowercase kebab-case, no `obsidian` substring, must not end with `plugin`, must match the install folder name
- `name`: unique, no `Obsidian` / `Plugin`, sentence-level English, no emoji
- `version`: `x.y.z` semver
- `minAppVersion`: real floor for unguarded APIs
- `isDesktopOnly`: `true` only if you need Node/Electron

## Sideload / source install

Users who are not on the directory copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/<id>/`. Document that path. Atomic's esbuild can deploy with `OBSIDIAN_PLUGIN_OUT`.
