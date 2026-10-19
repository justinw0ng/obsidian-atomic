# Atomic Tracker — user guide

1. Open today’s note.
2. Log the session from the blocks on that note.
3. Read the cue cards and the book shelf that day produced.
4. Open a book from the shelf when you want to read the file.

Atomic Tracker records gym, golf, and reading in your Obsidian vault. Everything stays as markdown. Habit tracking stays on this computer. Ask sends only the passage you choose, with your own key.

---

## Install Atomic Tracker

1. Download Obsidian from [obsidian.md/download](https://obsidian.md/download) and open a vault.
2. **Settings → Community plugins**. Turn off **Restricted mode** if you see it.
3. Install Atomic Tracker (community listing when available, or the three files below).
4. Find **Atomic Tracker** and toggle it on.

![Enable Atomic Tracker](./images/06-enable-atomic-plugin.gif)

### Manual install from a GitHub Release

1. Open the [latest GitHub Release](https://github.com/justinw0ng/obsidian-atomic/releases/latest).
2. Download **`main.js`**, **`manifest.json`**, and **`styles.css`**.
3. Copy those three files into `<vault>/.obsidian/plugins/atomic-tracker/`. Create the folder if it does not exist. Do not use **Source code (zip)**.

---

## Open today’s note

1. Command palette → **Create today's daily note**.
2. Check the book shelf, the habit buttons, the year of heatmaps, and today’s sessions.
3. Press a habit button to create **today’s session note** (gym or golf) or a **reading item**.

Atomic writes today’s note at the Daily Notes **New file location** (vault root if unset), using the Daily Notes date format (`YYYY-MM-DD` if unset).

To reuse that layout every day, run **Create daily note template**. That writes the Daily Notes **Template file location** if set; otherwise `Atomic daily note.md` in the Templates folder, or the vault root when that folder is unset (Obsidian `{{date}}` tokens). Setup is in [examples/README.md](../examples/README.md#use-the-daily-note-template). You can still copy [`examples/daily-notes/2026-08-11.md`](../examples/daily-notes/2026-08-11.md) if you want a filled sample.

Turn on **Gym**, **Golf**, and **Reading** under **Settings → Atomic Tracker** if those buttons are missing. One color picker per habit sets the four heatmap shades. Language is English or Traditional Chinese. Traditional Chinese shows one language. A stored activity name such as Gym / 健身 shows Gym in English and 健身 in Traditional Chinese.

![Atomic Tracker settings](./images/07-settings-atomic.gif)

The example note is this:

````markdown
# Tuesday, August 11, 2026

```atomic-bookshelf
activity: reading
```

## Track your activities today!

```atomic-actions
```

```atomic-heatmap
year: 2026
activity: gym, golf, reading
rows: 2
columns: 2
```

```atomic-today
```
````

![Quick actions](./images/atomic-actions.gif)

---

## Heatmap

1. Stop a timer. The year of dots on today’s note fills in.
2. Darker dots are more minutes. Point at a dot to read that day. Today is the ring.
3. Click a filled dot to open that session.

![Year heatmap](./images/atomic-heatmap.gif)

`atomic-today` lists each habit for this date. Click a row that has a session to open that note.

![Today’s sessions](./images/atomic-today.gif)

---

## Dashboard

1. Command palette → **Open dashboard**, or open `atomics/Dashboard.md`.
2. Step the year. Read the totals row, then the activities table: count, time, one detail, and hours for each month.
3. **Last** is that habit’s latest session. Click it to open the note. Reading uses the latest session too.
4. The links above the totals open cue pages, Bases, and the book shelf. Click a recent session to open that note. The monthly chart is under the rows.

![Year dashboard](./images/atomic-dashboard.gif)

---

## Timer

Gym, golf, and reading notes share one timer well.

1. Press **Start** when you begin.
2. While it runs, the well shows **Running · since** and a clock.
3. Press **Stop** to save the minutes. Press **Discard** to drop this run.

On a gym or golf session note, **Stop** writes `duration_min`. Those minutes show on the heatmap.

![Session timer](./images/atomic-session-timer.gif)

---

## Gym log

1. On the gym session note, open the exercise field and pick an exercise. Choose **New exercise…** if it is not listed.
2. Enter weight and reps. Notes are optional.
3. Click **Add set**. A row appears in the table. You do not type the table yourself.

![Gym set log](./images/atomic-gym-log.gif)

---

## Cues

1. On the same session note, type a short reminder.
2. Click **Add cue**. Atomic saves it on that note.
3. Open `{folder}/Cues.md` (for example `atomics/exercise/Gym/Cues.md`) to see the cards.

Atomic creates that host when it is missing — when the plugin loads, when you open a dashboard **Cues** link, or when you run **Atomic Tracker: Create cues notes**. Existing hosts are left unchanged. A new host uses `atomic-cues` with `activity:` set to the exercise id.

![Cue cards](./images/atomic-cue-log.gif)

On a gym session, a golf session, or a reading item, some properties are a dropdown.

1. Open the note. Properties are at the top.
2. Read location, felt, status, or weight unit. You see one value and a chevron.
3. For location, choose **Custom…** when the place is not in the list.

![Session properties](./images/atomic-property-select.gif)

---

## Reading

1. From today’s note, press **Reading**, or open a book from the shelf.
2. On the book note, press **Start**.
3. Press **Stop**. Stop asks for a short note. **Discard** drops the run.

Those minutes fill the reading heatmap. The idle well shows the saved total. Open Book starts this timer. It stops when the book is not the front note, or when you close the book. Start on the note still counts time you spend writing.

Open Book reads the file at one page size, XL (22 lines). The type stays Literata. There is no S·M·L·XL control and no size shortcut. A stored `reader.size` value is ignored. Theater uses that same XL page and leaves with Exit or Esc.

![Reading timer](./images/atomic-reading-timer.gif)

---

## Cue cards and the shelf

1. Hover a card on desktop to lift it and show the date.
2. Click it (or tap on a phone) to enlarge it in the center.
3. Click outside, press Esc, or click the large card again to put it back.

On a narrow pane the list shows four lines of each cue. The first line sits on the first rule. The card in the list does not grow. The large card grows with the writing and scrolls if it is taller than the window. The rest of the page blurs. The page does not dim.

![Cue card hover lift](./images/atomic-cues-hover.gif)

![Cue card center enlarge](./images/atomic-cue-popup.gif)

The shelf on today’s note is your books.

1. Hover a cover. The book pops up. The line under the shelf names the book.
2. Click the cover, or tap it on a phone. One tap opens a chooser.
3. **Open Notes** is the default. Press Enter, or choose it, to open the book note. There is no theater.
4. **Open Book** is listed only when that title has an EPUB or PDF. Choose it to read the file.

Cancel closes the chooser. A title with no file has no Open Book row.

A cover you add fills the book. If the picture is wider or narrower than the book, it scales until the book face is full.

![Book shelf](./images/atomic-book-shelf.gif)

---

## Read a book

Open Book stays on the same note. The cover opens in place. On a computer the pages open from the gutter onto the settled spread. On a phone one page opens. The flight lands on that XL page. The last frame is the settled reader. Reduced motion is a crossfade.

![Open book](./images/atomic-reader.gif)

Theater follows the app theme. Light mode uses a linen room. Dark mode uses a museum room. The page stays XL, and it is 500px tall. The control is **Exit**. It fades after 2 seconds. Move the pointer, or tap, and it comes back. **Exit** or Esc leaves theater.

On a phone the page is a card, and Exit sits at the top of the theater frame.

![Theater](./images/atomic-reader-theater.gif)

The page is fixed at XL (22 lines). There is no size control and no shortcut. There is no S·M·L·XL choice. The type stays Literata.

Ask is titled **Ask · BYO key**. The key stays in Obsidian SecretStorage. That needs Obsidian 1.11.4 or newer. The key is not written into `data.json`. Settings store the provider, the model, and the secret’s name only. The key stays on this device, so a synced vault does not bring the key with it. On an older Obsidian, Ask is off and settings tell you to update. Read, highlight, and remark still work. On a phone the thread fills the screen.

![Ask](./images/atomic-reader-ask.gif)

Each book has one `.canvas`, opened in Obsidian’s canvas view. The book note stores that path as `related_canvas`. The board is Opening, Quote, Ask thread, Characters, and Themes. The first highlight, remark, or Ask adds a card on that board. A book note with no canvas is still valid.

![Book canvas](./images/atomic-reader-canvas.gif)

Pages are set in Literata. On a computer that is 12.5px type on 19px lines. On a phone it is 15px type on 23px lines.

---

## If something looks wrong

| Problem | Fix |
|---------|-----|
| Plugin not listed | Confirm `main.js`, `manifest.json`, and `styles.css` are under `.obsidian/plugins/atomic-tracker/` and reload plugins. Do not use a source zip. |
| Restricted mode | Turn on community plugins in Settings |
| Empty heatmap or today list | Enable the habit in settings, then stop a session timer or a reading timer |
| Codeblock shows raw text | Enable the plugin and use Reading view |

---

## Privacy

- Sessions, cues, and book notes stay in your vault as markdown.
- The plugin does not call home. An `http(s):` book `cover` URL is loaded by Obsidian like any other remote image in a note.
- Ask sends the passage you choose to the provider you pick. The key stays in Obsidian SecretStorage on this device. It is not stored in `data.json`, the book note, or the canvas.
