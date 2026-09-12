/**
 * Deterministic Obsidian UI health check (Selenium + CDP).
 *
 * Keep this suite in sync with plugin UI. After any UI or breaking change,
 * update these tests and the data-testid hooks they use. Do not replace this
 * suite with computer-use; that is only for troubleshooting a failure.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { E2E_FILES, seedE2eVault } from "./lib/vault.mjs";
import {
  ARTIFACT_DIR,
  attachSelenium,
  closeSettings,
  e2eSkipReason,
  fillPrompt,
  launchObsidian,
  openAtomicSettings,
  openVaultFile,
  queryBooks,
  runCommandViaPalette,
  saveScreenshot,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForNotice,
  waitForPlugin,
} from "./lib/obsidian.mjs";

const skipReason = e2eSkipReason();

async function shot(driver, name) {
  try {
    await saveScreenshot(driver, name);
  } catch {
    // ignore screenshot failures
  }
}

async function check(driver, name, fn) {
  try {
    await fn();
  } catch (error) {
    await shot(driver, name);
    throw error;
  }
}

describe("Obsidian Selenium health check", { skip: skipReason || undefined }, () => {
  let driver;
  let vaultPath;
  let today;

  before(
    async () => {
      const seeded = seedE2eVault();
      vaultPath = seeded.vault;
      today = seeded.today;
      const launched = await launchObsidian(vaultPath, E2E_FILES.heatmapAll);
      driver = await attachSelenium(undefined, launched.version);
      await switchToObsidianWindow(driver);
      await waitForPlugin(driver);
    },
    { timeout: 120000 },
  );

  after(async () => {
    await stopSession({ driver });
  });

  it("loads the enabled plugin", async () => {
    await check(driver, "plugin-enabled", async () => {
      const id = await driver.executeScript(
        `return app.plugins.plugins["atomic-tracker"]?.manifest?.id || null`,
      );
      assert.equal(id, "atomic-tracker");
    });
  });

  it("renders golf, gym, generic cues, timer, and bookshelf blocks", async () => {
    await check(driver, "codeblocks", async () => {
      await openVaultFile(driver, E2E_FILES.golfCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]');

      await openVaultFile(driver, E2E_FILES.gymCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="gym"]');

      await openVaultFile(driver, E2E_FILES.cues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]');

      await openVaultFile(driver, E2E_FILES.readingCurrent);
      await waitCss(driver, '[data-testid="atomic-timer"]');
      await waitCss(driver, '[data-testid="atomic-timer-start"]');

      await openVaultFile(driver, E2E_FILES.gymSession(today.slice(0, 4), today));
      await waitCss(driver, '[data-testid="atomic-gym-log"]');
      await waitCss(driver, '[data-testid="atomic-gym-log-add"]');
      await waitCss(driver, '[data-testid="atomic-timer"]');
      await waitCss(driver, '[data-testid="atomic-timer-start"]');

      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      const books = await driver.findElements(By.css('[data-testid="atomic-book"]'));
      assert.equal(books.length, 2);
    });
  });

  it("filters heatmaps by activity", async () => {
    await check(driver, "heatmap-filters", async () => {
      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="reading"]');
      const reading = await driver.findElements(By.css('[data-testid="atomic-heatmap"]'));
      assert.equal(reading.length, 1);
      const readingToday = await waitCss(
        driver,
        '[data-testid="atomic-heatmap"][data-activity="reading"] [data-testid="atomic-heatmap-today"]',
      );
      assert.equal(await readingToday.getAttribute("data-minutes"), "25");

      await openVaultFile(driver, E2E_FILES.heatmapGymGolf);
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="gym"]');
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="golf"]');
      const gymGolf = await driver.findElements(By.css('[data-testid="atomic-heatmap"]'));
      assert.equal(gymGolf.length, 2);
      const readingOnGymGolf = await driver.findElements(
        By.css('[data-testid="atomic-heatmap"][data-activity="reading"]'),
      );
      assert.equal(readingOnGymGolf.length, 0);
    });
  });

  it("renders the dashboard KPIs, activity cards, and detail sections", async () => {
    await check(driver, "dashboard-cards", async () => {
      const year = today.slice(0, 4);
      await openVaultFile(driver, E2E_FILES.dashboard);
      await waitCss(driver, `[data-testid="atomic-dashboard"][data-year="${year}"]`);

      const kpis = await driver.findElements(By.css('[data-testid="atomic-dashboard-kpi"]'));
      assert.deepEqual(
        await Promise.all(kpis.map((kpi) => kpi.getAttribute("data-kpi"))),
        ["sessions", "exercise-time", "volume", "habit-time"],
      );
      const sessionsKpi = await driver.executeScript(
        `return document.querySelector('[data-testid="atomic-dashboard-kpi"][data-kpi="sessions"] .atomic-dash-kpi-value')?.textContent || ""`,
      );
      assert.equal(String(sessionsKpi).trim(), "2");

      const cards = await driver.findElements(
        By.css('[data-testid="atomic-dashboard-activity"]'),
      );
      const cardCounts = await Promise.all(
        cards.map(async (card) => [
          await card.getAttribute("data-activity"),
          await card.getAttribute("data-count"),
        ]),
      );
      assert.deepEqual(cardCounts, [
        ["gym", "1"],
        ["golf", "1"],
        ["reading", "2"],
      ]);

      const focusMonth = today.slice(0, 7);
      const day = String(Number(today.slice(8, 10)));
      await waitCss(
        driver,
        `[data-testid="atomic-dashboard-activity"][data-activity="gym"][data-focus-month="${focusMonth}"] [data-testid="atomic-dashboard-activity-bars"]`,
      );
      const gymDayValue = await driver.executeScript(`
        return document.querySelector(
          '[data-testid="atomic-dashboard-activity"][data-activity="gym"] [data-testid="atomic-dashboard-day"][data-day="${day}"]'
        )?.getAttribute("data-value") || "";
      `);
      assert.equal(gymDayValue, "1");

      await waitCss(driver, '[data-testid="atomic-dashboard-monthly"] details');
      const musclesText = await driver.executeScript(
        `return document.querySelector('[data-testid="atomic-dashboard-muscles"]')?.textContent || ""`,
      );
      assert.match(String(musclesText), /Quads/);
      assert.match(String(musclesText), /400 kg · 1/);
      await waitCss(driver, '[data-testid="atomic-dashboard-golf-focus"]');

      const recentPaths = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-dashboard-recent-row"]')]
          .map((row) => row.getAttribute("data-path"));
      `);
      assert.deepEqual(recentPaths, [
        E2E_FILES.golfSession(year, today),
        E2E_FILES.gymSession(year, today),
      ]);
    });
  });

  it("switches the dashboard year in place", async () => {
    await check(driver, "dashboard-year", async () => {
      const year = today.slice(0, 4);
      await openVaultFile(driver, E2E_FILES.dashboard);
      await waitCss(driver, `[data-testid="atomic-dashboard"][data-year="${year}"]`);

      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-dashboard-year-prev"]').click()`,
      );
      await waitCss(
        driver,
        `[data-testid="atomic-dashboard"][data-year="${Number(year) - 1}"] [data-testid="atomic-dashboard-activity"][data-activity="gym"][data-count="0"]`,
      );
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-dashboard-year-next"]').click()`,
      );
      await waitCss(
        driver,
        `[data-testid="atomic-dashboard"][data-year="${year}"] [data-testid="atomic-dashboard-activity"][data-activity="gym"][data-count="1"]`,
      );
    });
  });

  it("drops a disabled habit from the dashboard", async () => {
    await check(driver, "dashboard-disabled-habit", async () => {
      const setReadingEnabled = (enabled) =>
        driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.activityTypes.find((a) => a.id === "reading").enabled = ${enabled};
        `);
      await setReadingEnabled(false);
      try {
        await openVaultFile(driver, E2E_FILES.heatmapGymGolf);
        await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="gym"]');
        await openVaultFile(driver, E2E_FILES.dashboard);
        await waitCss(driver, '[data-testid="atomic-dashboard-activity"][data-activity="golf"]');
        const readingCards = await driver.findElements(
          By.css('[data-testid="atomic-dashboard-activity"][data-activity="reading"]'),
        );
        assert.equal(readingCards.length, 0);
        const habitKpis = await driver.findElements(
          By.css('[data-testid="atomic-dashboard-kpi"][data-kpi="habit-time"]'),
        );
        assert.equal(habitKpis.length, 0);
      } finally {
        await setReadingEnabled(true);
      }
    });
  });

  it("opens a session note from the dashboard recent list", async () => {
    await check(driver, "dashboard-open-recent", async () => {
      const gymPath = E2E_FILES.gymSession(today.slice(0, 4), today);
      await openVaultFile(driver, E2E_FILES.dashboard);
      await waitCss(driver, '[data-testid="atomic-dashboard-recent-row"]');
      await driver.executeScript(`
        document.querySelector(
          '[data-testid="atomic-dashboard-recent-row"][data-path=${JSON.stringify(gymPath)}] a'
        ).click();
      `);
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === gymPath;
      }, 8000);
    });
  });

  it("aligns heatmap month labels with the today column", async () => {
    await check(driver, "heatmap-month-align", async () => {
      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await waitCss(driver, '[data-testid="atomic-heatmap-today"]');
      await waitCss(driver, '[data-testid="atomic-heatmap-month"]');
      const result = await driver.executeScript(`
        const heatmap = document.querySelector(
          '[data-testid="atomic-heatmap"][data-activity="reading"]',
        );
        const today = heatmap.querySelector('[data-testid="atomic-heatmap-today"]');
        const week = today.closest('.fitness-week');
        const weeks = [...heatmap.querySelectorAll('.fitness-week')];
        const index = weeks.indexOf(week);
        const slot = heatmap.querySelector('.fitness-month-row').children[index];
        const weekLeft = week.getBoundingClientRect().left;
        const slotLeft = slot.getBoundingClientRect().left;
        return {
          ymd: today.getAttribute('data-ymd'),
          slotMonth: slot.getAttribute('data-month'),
          dx: Math.abs(weekLeft - slotLeft),
        };
      `);
      assert.ok(result.ymd, "today cell is missing data-ymd");
      const todayMonth = Number(result.ymd.slice(5, 7));
      const slotMonth = Number(result.slotMonth);
      assert.ok(
        Number.isFinite(slotMonth) && slotMonth > 0,
        `today column is missing data-month (ymd=${result.ymd})`,
      );
      assert.ok(
        slotMonth === todayMonth ||
          slotMonth === todayMonth - 1 ||
          (todayMonth === 1 && slotMonth === 12),
        `today ${result.ymd} sits under month ${slotMonth}`,
      );
      assert.ok(
        result.dx < 2,
        `month slot and today week differ by ${result.dx}px`,
      );
    });
  });

  it("shows property dropdowns on reading, golf, and gym notes", async () => {
    await check(driver, "property-dropdowns", async () => {
      await openVaultFile(driver, E2E_FILES.readingCurrent);
      const status = await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="status"]',
      );
      assert.equal(await status.getAttribute("value"), "reading");

      await openVaultFile(driver, E2E_FILES.golfSession(today.slice(0, 4), today));
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="felt"]',
      );
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="location"]',
      );

      await openVaultFile(driver, E2E_FILES.gymSession(today.slice(0, 4), today));
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="location"]',
      );
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="weight_unit"]',
      );
    });
  });

  it("logs a gym set from the in-note dropdown and adds a new exercise", async () => {
    await check(driver, "gym-set-log", async () => {
      await openVaultFile(driver, E2E_FILES.gymSession(today.slice(0, 4), today));
      await waitCss(driver, '[data-testid="atomic-gym-log"]');

      const squatValue = JSON.stringify(["Squat", "Quads"]);
      const deadliftValue = JSON.stringify(["Deadlift", "Hamstrings"]);
      await driver.wait(async () => {
        const value = await driver.executeScript(`
          const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
          return select ? select.value : "";
        `);
        return value === squatValue;
      }, 8000);

      const weight = await waitCss(driver, '[data-testid="atomic-gym-log-weight"]');
      await weight.clear();
      await weight.sendKeys("100");
      const reps = await waitCss(driver, '[data-testid="atomic-gym-log-reps"]');
      await reps.clear();
      await reps.sendKeys("3");
      const notes = await waitCss(driver, '[data-testid="atomic-gym-log-notes"]');
      await notes.clear();
      await notes.sendKeys("e2e squat");
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-gym-log-add"]').click()`,
      );
      await waitForNotice(driver, "Logged");

      const afterSquat = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(E2E_FILES.gymSession(today.slice(0, 4), today))});
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.match(String(afterSquat), /\| Squat \| Quads \| 100 \| 3 \| e2e squat \|/);
      await driver.wait(async () => {
        const value = await driver.executeScript(`
          const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
          return select ? select.value : "";
        `);
        return value === squatValue;
      }, 8000);

      await driver.executeScript(`
        const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
        select.value = "__atomic_new_exercise__";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      `);
      const name = await waitCss(driver, '[data-testid="atomic-gym-new-exercise-name"]');
      await name.click();
      await name.clear();
      await name.sendKeys("Deadlift");
      await driver.executeScript(`
        const muscle = document.querySelector('[data-testid="atomic-gym-new-exercise-muscle"]');
        muscle.value = "Hamstrings";
        muscle.dispatchEvent(new Event("change", { bubbles: true }));
      `);
      await driver.executeScript(`
        const modal = document.querySelector('[data-testid="atomic-gym-new-exercise-modal"]');
        const ok = modal && modal.querySelector("button.mod-cta");
        if (ok) ok.click();
      `);
      await waitForNotice(driver, "Saved Deadlift");
      await driver.wait(async () => {
        return driver.executeScript(`
          const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
          return !!(select && select.value === ${JSON.stringify(deadliftValue)});
        `);
      }, 8000);

      const nextWeight = await waitCss(driver, '[data-testid="atomic-gym-log-weight"]');
      await nextWeight.clear();
      await nextWeight.sendKeys("140");
      const nextReps = await waitCss(driver, '[data-testid="atomic-gym-log-reps"]');
      await nextReps.clear();
      await nextReps.sendKeys("5");
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-gym-log-add"]').click()`,
      );
      await waitForNotice(driver, "Logged");

      const afterDeadlift = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(E2E_FILES.gymSession(today.slice(0, 4), today))});
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.match(String(afterDeadlift), /\| Deadlift \| Hamstrings \| 140 \| 5 \|/);
      await driver.wait(async () => {
        const value = await driver.executeScript(`
          const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
          return select ? select.value : "";
        `);
        return value === deadliftValue;
      }, 8000);
    });
  });

  it("start/stops a gym session timer and writes duration_min", async () => {
    await check(driver, "gym-session-timer", async () => {
      const gymPath = E2E_FILES.gymSession(today.slice(0, 4), today);
      await openVaultFile(driver, gymPath);
      await waitCss(driver, '[data-testid="atomic-timer-start"]');
      await waitCss(driver, '[data-testid="atomic-gym-log"]');

      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-timer-start"]').click()`,
      );
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');

      await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.workspace.getActiveFile();
        const started = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        app.fileManager.processFrontMatter(file, (fm) => {
          fm.timer_started_at = started;
        }).then(() => done(true), (err) => done(String(err)));
      `);
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-timer-stop"]').click()`,
      );

      await driver.wait(async () => {
        const markdown = await driver.executeAsyncScript(`
          const done = arguments[0];
          const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymPath)});
          app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
        `);
        const match = String(markdown).match(/duration_min:\s*(\d+)/);
        return !!(match && Number(match[1]) >= 49);
      }, 8000);

      const afterStop = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymPath)});
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      const markdown = String(afterStop);
      assert.match(markdown, /duration_min: \d+\n/);
      const duration = Number(markdown.match(/duration_min:\s*(\d+)/)?.[1]);
      assert.ok(duration >= 49, `expected duration_min >= 49, got ${duration}`);
      assert.doesNotMatch(markdown, /## Time log/);
      assert.doesNotMatch(markdown, /total_min:/);
      assert.match(markdown, /\| Squat \| Quads \|/);
      const promptModals = await driver.findElements(
        By.css('[data-testid="atomic-prompt-modal"]'),
      );
      assert.equal(promptModals.length, 0);

      await openVaultFile(driver, E2E_FILES.heatmapGymGolf);
      await driver.wait(async () => {
        const minutes = await driver.executeScript(`
          const cell = document.querySelector(
            '[data-testid="atomic-heatmap"][data-activity="gym"] [data-testid="atomic-heatmap-today"]',
          );
          return cell ? Number(cell.getAttribute("data-minutes")) : -1;
        `);
        return minutes >= 49;
      }, 8000);
    });
  });

  it("prompts gym log setup when pending and dismisses it with Later", async () => {
    await check(driver, "gym-log-setup", async () => {
      await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        plugin.settings.gymLogSetup = "pending";
        plugin.promptGymLogSetupIfPending();
      `);
      await waitCss(driver, '[data-testid="atomic-gym-log-setup-modal"]');
      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-gym-log-setup-later"]').click();
      `);
      await waitForNotice(driver, "You can import gym exercises later");
      await driver.wait(async () => {
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-gym-log-setup-modal"]'),
        );
        return leftover.length === 0;
      }, 8000);
      const status = await driver.executeScript(
        `return app.plugins.getPlugin("atomic-tracker").settings.gymLogSetup`,
      );
      assert.equal(status, "skipped");
    });
  });

  it("prompts the latest update note after a version change and acks it once", async () => {
    await check(driver, "update-note", async () => {
      await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        plugin.settings.language = "en";
        plugin.settings.lastSeenUpdateNoteVersion = "0.0.0";
        plugin.promptUpdateNoteIfNeeded();
      `);
      await waitCss(driver, '[data-testid="atomic-update-note-modal"]');
      const englishBody = await driver.executeScript(
        `return document.querySelector('[data-testid="atomic-update-note-body"]')?.textContent || ""`,
      );
      assert.match(String(englishBody), /Performance improvements/);
      assert.match(String(englishBody), /fewer vault reads/);
      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-update-note-ack"]').click();
      `);
      await driver.wait(async () => {
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-update-note-modal"]'),
        );
        return leftover.length === 0;
      }, 8000);

      await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        plugin.settings.language = "zh-Hant-en";
        plugin.settings.lastSeenUpdateNoteVersion = "0.0.0";
        plugin.promptUpdateNoteIfNeeded();
      `);
      await waitCss(driver, '[data-testid="atomic-update-note-modal"]');
      const cantoneseBody = await driver.executeScript(
        `return document.querySelector('[data-testid="atomic-update-note-body"]')?.textContent || ""`,
      );
      assert.match(String(cantoneseBody), /用起嚟更順咗/);
      assert.match(String(cantoneseBody), /大筆記庫/);
      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-update-note-ack"]').click();
      `);
      await driver.wait(async () => {
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-update-note-modal"]'),
        );
        return leftover.length === 0;
      }, 8000);

      await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        plugin.settings.language = "en";
      `);
      const seen = await driver.executeScript(
        `return app.plugins.getPlugin("atomic-tracker").settings.lastSeenUpdateNoteVersion`,
      );
      const current = await driver.executeScript(
        `return app.plugins.getPlugin("atomic-tracker").manifest.version`,
      );
      assert.equal(seen, current);
      await driver.executeScript(`
        app.plugins.getPlugin("atomic-tracker").promptUpdateNoteIfNeeded();
      `);
      const leftover = await driver.findElements(
        By.css('[data-testid="atomic-update-note-modal"]'),
      );
      assert.equal(leftover.length, 0);
    });
  });

  it("filters the book shelf by reading status", async () => {
    await check(driver, "bookshelf-status", async () => {
      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      await driver.wait(async () => (await queryBooks(driver)).length === 2, 8000);
      const all = await queryBooks(driver);
      assert.equal(all.length, 2);
      assert.ok(all.some((book) => book.title === "Currently Reading"));
      assert.ok(all.some((book) => book.title === "Finished Book"));

      await openVaultFile(driver, E2E_FILES.bookshelfReading);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      await driver.wait(async () => (await queryBooks(driver)).length === 1, 8000);
      const filtered = await queryBooks(driver);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].title, "Currently Reading");
      assert.equal(filtered[0].status, "reading");

      await openVaultFile(driver, E2E_FILES.bookshelfScaled);
      await waitCss(driver, '[data-testid="atomic-bookshelf"][data-scale="1.5"]');
      const scaledWidth = await driver.executeScript(`
        const frame = document.querySelector(
          '[data-testid="atomic-bookshelf"][data-scale="1.5"] .atomic-book-shelf-frame',
        );
        return frame && getComputedStyle(frame).getPropertyValue('--atomic-book-width').trim();
      `);
      assert.equal(scaledWidth, "120px");
    });
  });

  it("creates a reading item and start/stops its timer", async () => {
    await check(driver, "reading-timer", async () => {
      await runCommandViaPalette(driver, "New reading item");
      await fillPrompt(driver, "E2E Timer Book");
      await waitCss(driver, '[data-testid="atomic-timer-start"]');

      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-timer-start"]').click()`,
      );
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');

      await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.workspace.getActiveFile();
        const started = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        app.fileManager.processFrontMatter(file, (fm) => {
          fm.timer_started_at = started;
        }).then(() => done(true), (err) => done(String(err)));
      `);
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-timer-stop"]').click()`,
      );
      await fillPrompt(driver, "selenium session");
      await waitForNotice(driver, "Logged");

      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await driver.wait(async () => {
        const minutes = await driver.executeScript(`
          const cell = document.querySelector(
            '[data-testid="atomic-heatmap"][data-activity="reading"] [data-testid="atomic-heatmap-today"]',
          );
          return cell ? Number(cell.getAttribute("data-minutes")) : -1;
        `);
        return minutes >= 25;
      }, 8000);
    });
  });

  it("shows settings color picker, swatches, add, enable/disable, and delete", async () => {
    await check(driver, "settings", async () => {
      try {
        await openAtomicSettings(driver);

      for (const id of ["gym", "golf", "reading"]) {
        const row = await waitCss(
          driver,
          `[data-testid="atomic-setting-activity"][data-activity-id="${id}"]`,
        );
        assert.ok(row);
        const colors = await waitCss(
          driver,
          `[data-testid="atomic-setting-colors"][data-activity-id="${id}"]`,
        );
        const picker = await colors.findElement(By.css('input[type="color"]'));
        assert.ok(await picker.isDisplayed());
        const swatches = await colors.findElements(
          By.css('[data-testid="atomic-color-swatch"]'),
        );
        assert.equal(swatches.length, 4);
      }

      await waitCss(driver, '[data-testid="atomic-setting-gym-exercises"]');
      await waitCss(driver, '[data-testid="atomic-setting-gym-import"]');

      const add = await waitCss(driver, '[data-testid="atomic-setting-add-hobby"]');
      const nameInput = await add.findElement(By.css("input"));
      await nameInput.clear();
      await nameInput.sendKeys("Chess");
      const addBtn = await add.findElement(By.css("button"));
      await addBtn.click();
      await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="chess"]',
      );

      const readingRow = await driver.findElement(
        By.css('[data-testid="atomic-setting-activity"][data-activity-id="reading"]'),
      );
      const enabledToggle = await readingRow.findElement(By.css(".checkbox-container"));
      await enabledToggle.click();
      await closeSettings(driver);

      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await waitCss(driver, '[data-testid="atomic-heatmap-invalid"]');

      await openAtomicSettings(driver);
      const readingOff = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingOff.findElement(By.css(".checkbox-container")).click();

      const chessRow = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="chess"]',
      );
      const deleteBtn = await chessRow.findElement(
        By.xpath('.//button[contains(normalize-space(.), "Delete")]'),
      );
      await deleteBtn.click();
      const confirm = await waitCss(driver, '[data-testid="atomic-confirm-delete-modal"]');
      await confirm.findElement(
        By.xpath('.//button[contains(normalize-space(.), "Delete")]'),
      ).click();

      await driver.wait(async () => {
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-setting-activity"][data-activity-id="chess"]'),
        );
        return leftover.length === 0;
      }, 8000);
      } finally {
        try {
          await closeSettings(driver);
        } catch {
          // keep going so later tests can recover
        }
      }
    });
  });

  it("opens reading Bases and shows a Notice when Reading is disabled", async () => {
    await check(driver, "reading-bases", async () => {
      await runCommandViaPalette(driver, "Open reading Bases");
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path.includes("Bookshelf.base");
      }, 10000);

      await openAtomicSettings(driver);
      const readingRow = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingRow.findElement(By.css(".checkbox-container")).click();
      await closeSettings(driver);

      await runCommandViaPalette(driver, "Open reading Bases");
      await waitForNotice(driver, "No Reading hobby configured");

      await openAtomicSettings(driver);
      const readingOn = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingOn.findElement(By.css(".checkbox-container")).click();
      await closeSettings(driver);

      await driver.executeScript(`
        const bases = app.internalPlugins?.getPluginById?.("bases");
        if (bases && bases.disable) bases.disable();
        else if (app.internalPlugins?.plugins?.bases) {
          app.internalPlugins.plugins.bases.enabled = false;
        }
      `);
      await runCommandViaPalette(driver, "Open reading Bases");
      await waitForNotice(driver, "Enable the Bases core plugin");
    });
  });
});

if (skipReason) {
  console.log(`Skipping Selenium E2E: ${skipReason}`);
} else {
  console.log(`Selenium artifacts directory: ${ARTIFACT_DIR}`);
}
