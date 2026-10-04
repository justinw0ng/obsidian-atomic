# Redesign assumptions

The redesign-director skill is interactive: at each fork it would stop and ask
the repo owner. This run cannot pause, so each fork below records the question,
the conservative pick, and why.

| # | Fork I would have asked | Conservative pick | Why |
|---|-------------------------|-------------------|-----|
| 1 | Existing UI or greenfield Frame branch? | **Redesign** (Map, not Frame) | The plugin already ships Settings, commands, codeblock views, and modals. |
| 2 | What is the immutable core? | **Vault notes + frontmatter are the store.** Settings hold paths, colors, enabled flags, and catalogs. No telemetry, accounts, or network except user-set `http(s)` cover images. | Read from `README.md`, `AGENTS.md`, and `src/`. |
| 3 | Which screen is highest friction? | **Settings → activity editor** (one habit = unlabeled toggle + label + folder + optional cues toggle + Delete, then a disconnected color row) | Dual identical toggles and two text fields are distinguishable only by tooltip/placeholder. Gym log, timer, and cues already have visible labels or a dedicated visual language. |
| 4 | Visible field labels, or keep tooltip-only density? | **Visible labels** (`Enabled`, `Label`, `Folder`, `Cues`, `Heatmap shades`) | Norman: knowledge in the world. Settings is infrequent (Cooper supporting surface), so memory of “left toggle vs right toggle” is a gulf of execution. |
| 5 | Merge activity + color into one Setting row (API/DOM rewrite) or only group them visually? | **Visual card grouping only** | Keep `atomic-setting-activity` and `atomic-setting-colors` as separate setting items so Selenium and Obsidian 1.13 `getSettingDefinitions()` stay the same. |
| 6 | Dim a disabled habit with opacity, or mark it without reducing contrast? | **Inset rail: accent when on, faint when off.** Do not fade the card. | Disabled habits stay editable (label, folder, color, delete). Opacity would drop body text below 4.5:1. State is also the labeled, unchecked Enabled toggle. |
| 7 | Phone-first mockups or a desktop settings pane? | **Phone frame of the Settings pane** (skill contract) plus CSS that also helps the wide desktop tab | Settings is used on both; the contract requires a ~290×600 frame so proportions stay honest. |
| 8 | Light, dark, or both? | **Foundations document both.** Mockups commit to **light** (repo screenshot policy). Plugin CSS uses Obsidian theme tokens so dark follows automatically. | Avoid inventing a second visual language. |
| 9 | Run opt-in deep-research? | **Skip** | User instruction, and the skill marks it expensive/opt-in. Choices below are principle-grounded, marked as design judgment where not cited evidence. |
| 10 | Rewrite Settings IA (tabs, search, delete elsewhere) or a small shell change? | **Small shell change** | User asked for one highest-friction screen, same behavior, Obsidian CSS/classes — not a rewrite. |

These assumptions are the product-brief for this pass. ADR-0001 records the
shipped decision.
