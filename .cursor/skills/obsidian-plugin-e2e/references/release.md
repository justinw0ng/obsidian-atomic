# Release and directory

Obsidian installs from a GitHub Release whose **tag equals** `manifest.json` `version`. It does not install from the git tree. A `v` prefix on the tag will not load in Community plugins.

## Version files

Keep these in lockstep on a release commit:

| File | Field |
| --- | --- |
| `package.json` | `version` |
| `package-lock.json` | root `version` and `packages[""].version` |
| `manifest.json` | `version`, and `minAppVersion` if you raised the floor |
| `versions.json` | `{ "<plugin version>": "<minAppVersion>" }` |
| `src/core/update-notes.json` | `version` (in-app What's new; must equal the shipped plugin version) |

Atomic's helper:

```bash
node scripts/bump-version.mjs          # print
node scripts/bump-version.mjs patch    # also minor|major|none
```

`none` keeps the current version (first release of whatever is already in the files). The script refuses to bump if `package.json` and `manifest.json` disagree. It also writes `src/core/update-notes.json` `version` to the same semver (bodies unchanged) so What's new cannot lag the plugin.

Do not bump on every feature PR. Atomic's CI no longer auto-bumps. Humans pick the bump when cutting the release.

If two PRs both ship, the merged version must be **greater than** `main`. `scripts/ensure-pr-version.mjs` and `scripts/check-version-conflict.mjs` exist for that conflict; CI itself must not push version commits (`tests/ci-paths.test.mjs` asserts `ci.yml` has no `contents: write`).

## CI

`.github/workflows/ci.yml` runs on every pull request. Path filters skip the expensive job for docs-only changes, but a job named exactly `Test and build` still reports. Branch rulesets require that name; a skipped workflow blocks merge.

When you add a source path, add it to `.github/plugin-source-paths.txt`. `tests/ci-paths.test.mjs` checks the wiring.

Required local/CI commands for plugin changes: `npm run typecheck`, `npm test`, `npm run build`. Upload `main.js`, `manifest.json`, `styles.css` as CI artifacts so a reviewer can sideload the PR build.

`.github/workflows/release.yml` is **manual** `workflow_dispatch` only. Inputs: `bump` (patch/minor/major), `branch` (default `main`), optional `release_notes` (English in-app + GitHub note) and optional `release_notes_zh_hant` (Cantonese zh-Hant in-app note). One note may cover multiple PRs. Provide both languages or omit both. It must not run on `push`.

## In-app update note

After users update, Atomic shows the **latest update note** once as a short live Notice (toast) when the catalog `version` equals the installed plugin version. The body follows **Settings → Language**: `en` → English; `zh-Hant-en` / `zh-Hant` / any `zh-Hant*` → Cantonese Traditional Chinese; unknown → English. The title comes from the i18n catalogs. Last-seen version is stored in plugin `data.json` (`lastSeenUpdateNoteVersion`) so the prompt does not nag on every open.

The catalog is `src/core/update-notes.json` (`body.en` and `body.zh-Hant`):

```json
{
  "version": "1.1.9",
  "body": { "en": "…", "zh-Hant": "…" }
}
```

Catalog `version` **must equal the plugin version being shipped** (latest GitHub Release / `manifest.json` after bump). Do **not** leave staged notes on an older semver while cutting a newer Release. A lagging catalog `version` does not show a What's new prompt.

`scripts/bump-version.mjs` keeps catalog `version` in lockstep (existing bodies). If you pass both Release inputs, the workflow then overwrites the bodies (`version` already matches the new semver). If you omit both, the bumped catalog keeps the previous bodies — never ship with catalog behind manifest.

Optional notes when cutting Release:

1. Pass English and Cantonese (zh-Hant), or omit both. You may draft both covering all PRs since the last release if you want a What's new for this version.
2. Or edit `src/core/update-notes.json` in git (`node scripts/set-update-note.mjs <version> --en "…" --zh-Hant "…"`). Use `\n` for line breaks in workflow_dispatch strings.

The GitHub Release body uses the English `release_notes` input when set (auto-generated notes are still appended). In-app uses both.

### 1.1.9 note (optional paste into Release)

English (`release_notes`):

```
Gym, golf, and other exercise day notes now have Start / Stop. Stop fills the duration for you — you can still type it if you prefer.
```

Cantonese / zh-Hant (`release_notes_zh_hant`):

```
健身、高爾夫等運動當日筆記而家有「開始／停止」計時。停止之後會自動填寫時長；你都可以繼續手動輸入。
```

## Cut a GitHub Release

Atomic's release job:

1. Checkout the chosen branch
2. `node scripts/bump-version.mjs <bump>` (also sets catalog `version` to the new semver, keeping bodies)
3. If both optional note inputs are set, overwrite bilingual bodies for the new version (`node scripts/set-update-note.mjs <version>`). If both are omitted, keep the bodies already stamped under the new version.
4. `npm run typecheck`, `npm test`, `npm run build`
5. Refuse if tag `VERSION` already exists
6. Commit version files and `src/core/update-notes.json` when it changed, tag `VERSION` (no `v`), push branch and tag
7. Attest the three plugin files with `actions/attest` (OIDC). Do not attest locally — invalid provenance is worse than none.
8. `softprops/action-gh-release` with assets **exactly**: `main.js`, `manifest.json`, `styles.css`

Do not attach `atomic-tracker-*.zip` (or any other extra file) to the GitHub Release. Release assets are only `main.js`, `manifest.json`, and `styles.css`. Manual install copies those three files into `.obsidian/plugins/atomic-tracker/`. Obsidian’s Community plugins download the same three files and flag unsupported extras. Tag format: `1.1.3`, not `v1.1.3`. Plugin id stays in `manifest.json` (`atomic-tracker`).

You can run the same steps locally if Actions is unavailable. Skip attestation unless you have a valid Actions/OIDC path. The directory only cares that the tag exists and the three binaries are attached.

### Cursor Cloud Agents

Prefer `gh workflow run Release ...` when the agent token can write Actions (`workflow_dispatch` needs `actions: write`):

```bash
gh workflow run Release --ref main -f bump=patch \
  -f release_notes="What's new…" \
  -f release_notes_zh_hant="更新說明…"
```

Notes are optional. Omit both to keep current in-app bodies under the new version (`bump-version.mjs` still sets catalog `version`). Pass both `release_notes` and `release_notes_zh_hant` to replace bodies. Never ship with catalog behind manifest.

If that returns `HTTP 403: Resource not accessible by integration`, it is expected with the default Cursor GitHub App installation token, which is scoped to `actions: read` only. Reconfiguring the Cursor GitHub App install does not raise that per-run token.

Workaround: create a [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) scoped to this repo with **Actions: Read and write** (and Contents as needed for `gh`), then add it under [Cursor Cloud Agents → Secrets](https://cursor.com/dashboard?tab=cloud-agents) as exactly `GH_TOKEN` or `GITHUB_TOKEN` and re-run. Contents write on the default token still works (push, tag, release).

If no PAT is available, fall back to the local bump / tag / release path above.

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

Users who are not on the directory open the latest GitHub Release and copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/<id>/` (`atomic-tracker` here). Do not use “Source code (zip)” or any zip asset. Document that path in the user guide. Atomic's esbuild can deploy with `OBSIDIAN_PLUGIN_OUT`.
