/**
 * Optional Obsidian probe: first open of a default daily note on a large vault.
 * Skipped unless ATOMIC_E2E_SCALE=1 so it does not fight the health-check CDP port.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  E2E_DAILY_NOTE_SCALE,
  SCALE_DAILY_NOTE,
  SCALE_IDLE_NOTE,
  seedScaleE2eVault,
} from "./lib/scale-vault.mjs";
import {
  ARTIFACT_DIR,
  attachSelenium,
  e2eSkipReason,
  launchObsidian,
  openVaultFile,
  saveScreenshot,
  stopSession,
  switchToObsidianWindow,
  waitForPlugin,
} from "./lib/obsidian.mjs";

const skipReason =
  e2eSkipReason() ||
  (process.env.ATOMIC_E2E_SCALE === "1" ? "" : "set ATOMIC_E2E_SCALE=1 to run");

const SCALE_VAULT = "/tmp/atomic-tracker-e2e-scale-vault";

async function waitForDailyNoteBlocks(driver, timeoutMs = 30000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await driver.executeScript(`
      return {
        heatmaps: document.querySelectorAll('[data-testid="atomic-heatmap"]').length,
        books: document.querySelectorAll('[data-testid="atomic-book"]').length,
        pending: document.querySelectorAll('.atomic-block-pending').length,
        today: !!document.querySelector(".fitness-plugin ul"),
        mode: document.querySelector(".markdown-preview-view")
          ? "preview"
          : document.querySelector(".markdown-source-view")
            ? "source"
            : "unknown",
      };
    `);
    if (last.heatmaps >= 3 && last.books >= 1) return last;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`daily note blocks never settled: ${JSON.stringify(last)}`);
}

describe("daily note first-open scale", { skip: skipReason || undefined }, () => {
  let driver;

  before(
    async () => {
      seedScaleE2eVault({
        vaultPath: SCALE_VAULT,
        scale: E2E_DAILY_NOTE_SCALE,
      });
      const launched = await launchObsidian(SCALE_VAULT, SCALE_IDLE_NOTE);
      driver = await attachSelenium(undefined, launched.version);
      await switchToObsidianWindow(driver);
      await waitForPlugin(driver);
    },
    { timeout: 120000 },
  );

  after(async () => {
    await stopSession({ driver });
  });

  it("reads every reading item once on first daily-note open, then reuses caches", async () => {
    await driver.executeScript(`
      const vault = app.vault;
      if (!window.__atomicIo) {
        window.__atomicIo = { cachedRead: 0, read: 0 };
        const cached = vault.cachedRead.bind(vault);
        vault.cachedRead = async function (file) {
          window.__atomicIo.cachedRead += 1;
          return cached(file);
        };
        const read = vault.read.bind(vault);
        vault.read = async function (file) {
          window.__atomicIo.read += 1;
          return read(file);
        };
      } else {
        window.__atomicIo.cachedRead = 0;
        window.__atomicIo.read = 0;
      }
    `);

    const opened = await driver.executeAsyncScript(
      `
      const path = arguments[0];
      const done = arguments[1];
      const t0 = performance.now();
      const file = app.vault.getAbstractFileByPath(path);
      if (!file) {
        done({ ok: false, error: "missing " + path });
        return;
      }
      app.workspace.openLinkText(path, "", false).then(
        () => done({ ok: true, openMs: performance.now() - t0 }),
        (err) => done({ ok: false, error: String(err) }),
      );
      `,
      SCALE_DAILY_NOTE,
    );
    assert.equal(opened?.ok, true, opened?.error);
    await driver.executeAsyncScript(`
      const done = arguments[0];
      const leaf = app.workspace.getMostRecentLeaf?.();
      const view = leaf && leaf.view;
      if (!view || typeof view.setState !== "function") {
        done({ ok: false, error: "no markdown view" });
        return;
      }
      const state = typeof view.getState === "function" ? view.getState() : {};
      Promise.resolve(view.setState({ ...state, mode: "preview" }, { history: false })).then(
        () => done({ ok: true }),
        (err) => done({ ok: false, error: String(err) }),
      );
    `);
    const painted = await waitForDailyNoteBlocks(driver);
    const io = await driver.executeScript(`return window.__atomicIo`);
    const report = {
      scale: E2E_DAILY_NOTE_SCALE,
      openMs: opened.openMs,
      heatmaps: painted.heatmaps,
      books: painted.books,
      cachedRead: io.cachedRead,
      read: io.read,
    };
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    writeFileSync(
      `${ARTIFACT_DIR}/daily-note-scale-first-open.json`,
      JSON.stringify(report, null, 2),
    );
    process.stdout.write(`daily-note scale first open ${JSON.stringify(report)}\n`);

    assert.equal(painted.heatmaps, 3);
    assert.ok(
      painted.books >= 1,
      `expected books on the shelf, got ${painted.books}`,
    );
    assert.ok(
      io.cachedRead >= E2E_DAILY_NOTE_SCALE.readingItems,
      `expected at least ${E2E_DAILY_NOTE_SCALE.readingItems} cachedReads for reading Time logs, got ${io.cachedRead}`,
    );
    assert.ok(
      io.cachedRead < E2E_DAILY_NOTE_SCALE.readingItems * 2,
      `reading bodies should not be read twice on first open after layout ready, got ${io.cachedRead}`,
    );

    await driver.executeScript(`
      window.__atomicIo.cachedRead = 0;
      window.__atomicIo.read = 0;
    `);
    await openVaultFile(driver, SCALE_IDLE_NOTE);
    await driver.executeScript(`
      window.__atomicIo.cachedRead = 0;
      window.__atomicIo.read = 0;
    `);
    const second = await driver.executeAsyncScript(
      `
      const path = arguments[0];
      const done = arguments[1];
      const t0 = performance.now();
      app.workspace.openLinkText(path, "", false).then(
        () => done({ ok: true, openMs: performance.now() - t0 }),
        (err) => done({ ok: false, error: String(err) }),
      );
      `,
      SCALE_DAILY_NOTE,
    );
    assert.equal(second?.ok, true, second?.error);
    await driver.executeAsyncScript(`
      const done = arguments[0];
      const leaf = app.workspace.getMostRecentLeaf?.();
      const view = leaf && leaf.view;
      if (!view || typeof view.setState !== "function") {
        done({ ok: false, error: "no markdown view" });
        return;
      }
      const state = typeof view.getState === "function" ? view.getState() : {};
      Promise.resolve(view.setState({ ...state, mode: "preview" }, { history: false })).then(
        () => done({ ok: true }),
        (err) => done({ ok: false, error: String(err) }),
      );
    `);
    const paintedAgain = await waitForDailyNoteBlocks(driver);
    const ioAgain = await driver.executeScript(`return window.__atomicIo`);
    process.stdout.write(
      `daily-note scale second open ${JSON.stringify({
        openMs: second.openMs,
        heatmaps: paintedAgain.heatmaps,
        cachedRead: ioAgain.cachedRead,
      })}\n`,
    );
    assert.equal(paintedAgain.heatmaps, 3);
    assert.ok(
      ioAgain.cachedRead < E2E_DAILY_NOTE_SCALE.readingItems,
      `second open should reuse Time-log cache, got ${ioAgain.cachedRead} cachedReads`,
    );
    await saveScreenshot(driver, "daily-note-scale-open");
  });
});
