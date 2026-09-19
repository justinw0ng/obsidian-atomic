# Obsidian API hygiene

Directory review flagged these on Atomic **1.4.7** (fixed in #101). The same class of finding fails review again. Keep the source locks green when you touch these surfaces.

## Window APIs

Read browser / window APIs from Obsidian’s **`activeWindow`** (preferred: popout-safe) or `window`.

Do not use `globalThis` in plugin source (`src/**`). Node tests may use `globalThis`; that is not plugin source.

Atomic pattern: `src/commands/create-daily-note.ts` reads `moment` from `activeWindow`, and treats a missing `activeWindow` as “no moment” so Node tests still throw.

## Notice DOM

Hook and style a `Notice` with **`messageEl`**.

`noticeEl` is deprecated. Do not use it.

Atomic pattern: `src/commands/update-note.ts` puts `atomic-update-note-notice` / `data-testid` on `messageEl`.

## Core-plugin `any` (`@typescript-eslint/no-unsafe-assignment`)

When reading Obsidian core-plugin options or similar `any` surfaces, do not assign the raw `any` / `error` value.

Use the typed-cast pattern already in `src/util/core-plugin-options.ts`: cast to a callable that returns `unknown`, then narrow.

```ts
(method as (this: object, pluginId: string) => unknown).call(self, id);
(getFormat as (this: object) => unknown).call(instance);
```

## Unused compile-time aliases

Do not leave unused `*Covered` (or similar) type aliases. Use them, or delete them.

`src/core/dashboard.ts` deleted unused `SessionInputCovered` / `HobbyItemInputCovered` / `DashboardInputCovered`. Do not add them back unless a live type position references them.

## Tests that lock this

| Ban | Lock |
| --- | --- |
| `globalThis` / `noticeEl` in `src/**` | `tests/e2e-selectors.test.mjs` (tree walk + cited files) |
| `activeWindow` at the moment call site | same file / `create-daily-note.ts` |
| `messageEl` on What’s new Notice | same file / `update-note.ts` |
| typed `getFormat` cast | same file / `core-plugin-options.ts` |
| unused `*Covered` aliases | `tests/dashboard-paint-state.test.mjs` |

When review invents another API ban, add a `doesNotMatch` (or a `match` for the replacement) in the same PR as the fix.
