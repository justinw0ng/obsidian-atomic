# Skill adoption (quarantine)

**Status:** docs-only proposals. Nothing here is enabled.

This folder holds security reviews and optional draft stubs for third-party agent skills. It is **not** on the agent auto-run path.

## Hard rules

- Do **not** copy reviewed skills into `.cursor/skills/` or `.agents/skills/` from this folder.
- Do **not** add these paths to `AGENTS.md`.
- Do **not** run `npx skills add …` against this repo until an owner approves a pinned, hashed vendor step.
- Do **not** treat a file under `proposals/` as a live skill. Those files are marked `PROPOSAL / NOT ENABLED`.

## Contents

| Path | What it is |
| --- | --- |
| [emilkowalski-skills-security-review.md](./emilkowalski-skills-security-review.md) | Security-first review of [emilkowalski/skills](https://github.com/emilkowalski/skills) for Atomic Tracker |
| [proposals/atomic-motion-guidance.PROPOSAL.md](./proposals/atomic-motion-guidance.PROPOSAL.md) | Draft overlay notes only. Not a skill. Not enabled. |

Owner approval is required before any skill is vendored, hashed in `skills-lock.json`, or mentioned from `AGENTS.md`.
