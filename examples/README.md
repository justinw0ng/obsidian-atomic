# Example notes

Copy these into a vault with Atomic enabled, or create them from the command palette.

**Daily note (filled).** `daily-notes/2026-08-11.md` is the README hero note: book shelf, action buttons, a 2×2 heatmap grid, and today’s sessions. On a wide pane the heatmaps sit two-up and the shelf is a single row.

**Daily note template.** `templates/Atomic daily note.md` is the same layout with Obsidian `{{date}}` tokens, so each new daily note gets today’s heading. Heatmap year is left off on purpose. Atomic reads it from the `YYYY-MM-DD` filename.

**Dashboard.** `dashboard/Dashboard.md` belongs at `atomics/Dashboard.md` (the default **Open dashboard** path).

Each UI block lists every option as a comment. Uncomment a line to use it; lines that start with `#` are ignored at render time.

The blocks read session and hobby notes already in the vault. Empty heatmaps and today lists mean those notes are missing, not that the fences are wrong.

## Use the daily note template

1. Settings → Core plugins: turn on **Templates** and **Daily notes** if you use them.
2. Settings → Daily notes: set **Date format**, **New file location**, and **Template file location**, or leave them empty for Obsidian defaults (`YYYY-MM-DD`, vault root, no template).
3. Settings → Templates: set **Template folder location** if you use core Templates (empty = vault root).
4. Command palette → **Create daily note template**. Atomic writes the Daily Notes template path if set; otherwise `Atomic daily note.md` in the Templates folder, or the vault root. It does not overwrite an existing note.
5. Open today’s daily note (ribbon calendar, **Open today's daily note**, or Atomic’s **Create today's daily note**).

**Create today's daily note** writes today’s note at the Daily Notes new-file location using that date format, then opens it. Timer, gym set log, and cues live on the session notes those habit buttons create — not on the daily note itself.

The heading becomes something like `Tuesday, August 11, 2026`. Bookshelf, actions, heatmaps, and today render from whatever Atomic notes you already have.

If you use Templater instead of core Templates, swap `{{date:dddd, MMMM D, YYYY}}` for `<% tp.date.now("dddd, MMMM D, YYYY") %>` and point Periodic Notes / Daily notes at the same file.
