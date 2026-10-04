# Obsidian API hygiene

Directory review flagged these on Atomic **1.4.7** (fixed in #101) and again on the 1.5.0 design branch (#108). The same class of finding fails review again. Keep the source locks green when you touch these surfaces.

`manifest.json` `minAppVersion` stays **1.5.0**. Do not bump the plugin `version` field to satisfy a review lint. Call anything newer only behind `requireApiVersion`, with a fallback that still works on 1.5.0.

## Window APIs

Read browser / window APIs from Obsidian’s **`activeWindow`** (preferred: popout-safe) or `window`.

Do not use `globalThis` in plugin source (`src/**`). Node tests may use `globalThis`; that is not plugin source.

Atomic pattern: `src/commands/create-daily-note.ts` reads `moment` from `activeWindow`, and treats a missing `activeWindow` as “no moment” so Node tests still throw.

## Notice DOM (`obsidianmd/no-unsupported-api`)

`Notice.messageEl` is Obsidian **1.8.7**. An unguarded read fails `obsidianmd/no-unsupported-api` while `minAppVersion` is 1.5.0.

Call it only inside `if (requireApiVersion("1.8.7"))`. The string passed to `new Notice` is the 1.5.0 path, so the text still shows when `messageEl` does not exist.

Do not use `noticeEl`. It is deprecated, and `@typescript-eslint/no-deprecated` warns on every read. That warning is a review finding.

```ts
const notice = new Notice(message, timeout);
if (requireApiVersion("1.8.7")) {
  notice.messageEl.addClass("atomic-update-note-notice");
  notice.messageEl.setAttr("data-testid", "atomic-update-note-notice");
}
```

Atomic pattern: `src/commands/update-note.ts`.

The same rule applies to every other Obsidian API whose `@since` is above `minAppVersion`. `requireApiVersion("x.y.z")` in an `if`, a `&&` test, or a ternary consequent is the guard review accepts. A guard version lower than `@since` still fails.

## Core-plugin `any` (`@typescript-eslint/no-unsafe-assignment`)

When reading Obsidian core-plugin options or similar `any` surfaces, do not assign the raw `any` / `error` value.

Use the typed-cast pattern already in `src/util/core-plugin-options.ts`: cast to a callable that returns `unknown`, then narrow.

```ts
(method as (this: object, pluginId: string) => unknown).call(self, id);
(getFormat as (this: object) => unknown).call(instance);
```

## Static styles (`obsidianmd/no-static-styles-assignment`)

Do not write a style literal through the DOM:

- `element.style.color = "red"`
- `element.style.setProperty("--px", "0")`
- `element.setAttribute("style", "...")`
- `setCssProps({ color: "red" })` or `setCssStyles({ color: "red" })` (a key that is not a custom property)

Put static defaults in `styles.css`. Book tilt starts at `--px: 0` and `--py: 0` on `.atomic-book`; `createBook` does not set those literals again.

When a **custom property** must change at runtime (`--atomic-c`, pointer `--px`), `setCssProps({ "--atomic-c": color })` is the review-preferred write. A non-literal `style.setProperty` is not the error this rule reports. Do not use either API for a constant.

## Partial CSS on the Obsidian 1.4.5 review target

Review still scores CSS against Obsidian **1.4.5**, even when `minAppVersion` is newer. These features are only partial there. Do not add them to `styles.css` unless a skills note records why no replacement works.

| Feature | Avoid | Use |
| --- | --- | --- |
| multicolumn | `column-gap`, `column-count`, `columns` | `gap` on grid or flex (`gap: 0 20px` when only the column axis was set) |
| `css-clip-path` | `clip-path` | A border notch. The reading ribbon swallowtail is `border-width: 0 4px 6px` with a transparent bottom |
| `css-masks` | `mask`, `-webkit-mask`, `mask-image` | A `::after` paper wash (`.atomic-cue-body`) |

`:has(`, `!important`, and `scrollbar-width` stay banned too. See [plugin-review.md](plugin-review.md).

## Unused compile-time aliases

Do not leave unused `*Covered` (or similar) type aliases. Use them, or delete them.

`src/core/dashboard.ts` deleted unused `SessionInputCovered` / `HobbyItemInputCovered` / `DashboardInputCovered`. Do not add them back unless a live type position references them.

## Tests that lock this

| Ban | Lock |
| --- | --- |
| `globalThis` in `src/**` | `tests/e2e-selectors.test.mjs` (tree walk + cited files) |
| `noticeEl` anywhere in `src/**`; `messageEl` outside `requireApiVersion("1.8.7")` | same file / `update-note.ts` |
| static `style` literals (`setProperty` second arg, `style.prop = "…"`, `setAttribute("style")`) | same file |
| `column-gap` / `column-count` / `columns` / `clip-path` / masks in `styles.css` | same file |
| `activeWindow` at the moment call site | same file / `create-daily-note.ts` |
| typed `getFormat` cast | same file / `core-plugin-options.ts` |
| unused `*Covered` aliases | `tests/dashboard-paint-state.test.mjs` |

When review invents another API ban, add a `doesNotMatch` (or a `match` for the replacement) in the same PR as the fix.
