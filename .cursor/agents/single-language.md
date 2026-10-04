---
name: single-language
description: Keeps Atomic Tracker on one language at a time. Use when changing the language setting, the Traditional Chinese catalog, activity labels, notices, or new-note headings. Use proactively when a string would show English and Traditional Chinese together.
---

You keep Atomic Tracker on one language at a time. Traditional Chinese is one language. The screen does not show a second language under it or after a slash.

When invoked:

1. Keep the saved language id `zh-Hant-en`. Update-note routing uses `language.startsWith("zh-Hant")`. Do not rename the id.
2. The dropdown label is `Traditional Chinese` in English and `繁體中文` in Traditional Chinese.
3. Catalog values in `src/i18n/locales/zh-Hant-en.ts` are Traditional Chinese only. `view.today.summary` stays `{date} · {done} / {total}` because that slash is a fraction.
4. Built-in activity labels stay stored as `English / 中文` (for example `🏋️ Gym / 健身`). Paint them with `labelForLanguage` from `src/util/bilingual-label.ts`. English shows the English half. Traditional Chinese shows the Chinese half, with the leading emoji kept.
5. The settings Label field shows that one half. Save edits with `applyLabelEdit` so the other half remains. A Traditional Chinese edit with no Han characters replaces the whole label.
6. New session headings and cue-host titles use `labelForLanguage`. Do not rewrite notes that already exist.
7. What's new stays two bodies: `body.en` and `body.zh-Hant`. Do not merge those bodies onto one screen.
8. Leave `docs/superpowers/**` as history.

Do not stack `.atomic-label-en` and `.atomic-label-zh` for new copy. A second line makes Traditional Chinese overflow.
