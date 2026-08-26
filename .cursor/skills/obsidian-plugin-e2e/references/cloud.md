# Cloud agents and local Obsidian

Atomic Tracker's `AGENTS.md` is the Cloud-VM contract. If that file exists, follow it. This page is the portable version for a new plugin or a VM that has no `AGENTS.md` yet.

## This is not a web app

There is no `npm start` server. The UI is the Obsidian desktop client loading `main.js` from a vault's `.obsidian/plugins/<id>/`.

## Install Obsidian on Linux

If `obsidian` is missing:

1. Take the latest **amd64 `.deb`** from [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) (asset name like `obsidian_*_amd64.deb`).
2. `sudo apt-get install -y ./obsidian_*_amd64.deb` or `sudo dpkg -i` plus `apt-get -f install`.
3. Launch with `--no-sandbox` on Cloud VMs. The e2e harness already passes that flag.

Skip GUI E2E only after that install and a launch attempt fail. Write the failure in the PR. Do not skip because Selenium is inconvenient.

Need a display: `DISPLAY` or an X11 socket (`/tmp/.X11-unix/X1` then `X0`). Headless Cloud images that lack X will skip the suite via `e2eSkipReason()`.

## Deploy into a demo vault

```bash
export OBSIDIAN_PLUGIN_OUT=/workspace/obsidian-demo/.obsidian/plugins/atomic-tracker
npm run build
```

Atomic also copies into `../obsidian-lab/.obsidian/plugins/atomic-tracker/` when that path exists. `obsidian-demo/` is gitignored.

Enable the plugin by writing `.obsidian/community-plugins.json` as `["atomic-tracker"]` (the `id`, not the repo name).

## Commands Cloud agents must run

Before claiming done:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e    # when Obsidian is installed or you just installed it
```

Do not use the computer-use agent for that standard path.

## `main.js`

`npm run build` and `npm run dev` overwrite repo-root `main.js`. Restore it when the change is not a release:

```bash
git checkout -- main.js
```

## Seed data for humans vs e2e

- Selenium vault: `/tmp/…e2e…`, English, UTC, small fixtures in `e2e/lib/vault.mjs`
- README / user-guide vaults: `scripts/seed-readme-demo-vault.mjs`, `scripts/prepare-user-guide-vault.mjs`, invented covers in `docs/demo-covers/`

Do not point e2e at the user's real vault. `assertSafeE2eVaultPath` will throw if you try to wipe the repo or `$HOME`.

## Copy this into a new plugin's AGENTS.md

Keep a short Cloud section that names:

- Node 22+ / strip-types
- `npm test`, `typecheck`, `build`, `test:e2e`
- Where to install the Obsidian `.deb`
- `--no-sandbox`
- `OBSIDIAN_PLUGIN_OUT`
- `git checkout -- main.js` policy
- Selenium as the GUI health check, computer-use as debug-only
- `data-testid` prefixes for that plugin
