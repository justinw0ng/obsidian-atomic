/**
 * Deterministic Obsidian UI health check (Selenium + CDP).
 *
 * Keep this suite in sync with plugin UI. After any UI or breaking change,
 * update these tests and the data-testid hooks they use. Do not replace this
 * suite with computer-use; that is only for troubleshooting a failure.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { By, Key } from "selenium-webdriver";
import {
  E2E_CUE_LOG_FENCE,
  E2E_DAILY_NOTES_FOLDER,
  E2E_DAILY_NOTE_TEMPLATE,
  E2E_FILES,
  E2E_TEMPLATES_FOLDER,
  E2E_TIMER_FENCE,
  seedE2eVault,
} from "./lib/vault.mjs";
import {
  ARTIFACT_DIR,
  assertRequiredE2eReady,
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
assertRequiredE2eReady(skipReason);

async function shot(driver, name) {
  try {
    await saveScreenshot(driver, name);
  } catch {
    // ignore screenshot failures
  }
}

/** Phone checks set mobile emulation. Put the pointer back before desktop clicks. */
async function restoreDesktopPointer(driver, viewport) {
  try {
    await driver.sendDevToolsCommand("Emulation.clearDeviceMetricsOverride", {});
  } catch {
    if (viewport) {
      await driver.executeScript(
        `window.resizeTo(arguments[0], arguments[1])`,
        viewport.width,
        viewport.height,
      );
    }
  }
  try {
    await driver.sendDevToolsCommand("Emulation.setTouchEmulationEnabled", {
      enabled: false,
    });
  } catch {
    // Older DevTools builds omit touch emulation.
  }
  try {
    await driver.sendDevToolsCommand("Emulation.setEmulatedMedia", {
      features: [
        { name: "hover", value: "hover" },
        { name: "pointer", value: "fine" },
      ],
    });
  } catch {
    // Older DevTools builds omit emulated media features.
  }
}

function setMarkdownMode(driver, mode) {
  return driver.executeAsyncScript(
    `
    const done = arguments[1];
    const mode = arguments[0];
    const view = app.workspace.getMostRecentLeaf?.()?.view;
    if (!view || typeof view.setState !== "function") {
      done({ ok: false, error: "no markdown view" });
      return;
    }
    const state = typeof view.getState === "function" ? view.getState() : {};
    Promise.resolve(view.setState({ ...state, mode }, { history: false })).then(
      () => done({ ok: true, mode }),
      (err) => done({ ok: false, error: String(err) }),
    );
    `,
    mode,
  );
}

function measureShelfRow(driver, scale) {
  return driver.executeScript(
    `
    const frame = document.querySelector(
      '[data-testid="atomic-bookshelf"][data-scale="' + arguments[0] + '"] .atomic-book-shelf-frame',
    );
    if (!frame) return null;
    const style = getComputedStyle(frame);
    const bookWidth = Number.parseFloat(style.getPropertyValue("--atomic-book-width"));
    const bookHeight = Number.parseFloat(style.getPropertyValue("--atomic-book-height"));
    const padding = 28;
    const gap = 12;
    const frameWidth = frame.clientWidth;
    const available = Math.max(0, frameWidth - padding);
    const fitted = Math.floor((available + gap) / (bookWidth + gap));
    const perRow = Math.max(3, fitted);
    const threeNeeded = padding + 3 * bookWidth + 2 * gap;
    return {
      bookWidth,
      bookHeight,
      frameWidth,
      perRow,
      threeNeeded,
    };
    `,
    scale,
  );
}

function measureCoverInset(driver, mode) {
  return driver.executeScript(
    `
    const scope = arguments[0] === "reading"
      ? ".workspace-leaf.mod-active .markdown-preview-view "
      : ".workspace-leaf.mod-active .markdown-source-view ";
    const book = document.querySelector(
      scope + '[data-testid="atomic-book"][data-title="Finished Book"]',
    );
    const img = book?.querySelector("img.atomic-book-cover");
    if (!book || !img) return { img: false, mode: arguments[0] };
    const bookBox = book.getBoundingClientRect();
    const imgBox = img.getBoundingClientRect();
    const face = book.querySelector(".atomic-book-face");
    return {
      img: true,
      preview: Boolean(book.closest(".markdown-preview-view")),
      filter: face ? getComputedStyle(face).filter : "",
      objectFit: getComputedStyle(img).objectFit,
      inset: {
        left: imgBox.left - bookBox.left,
        right: bookBox.right - imgBox.right,
        top: imgBox.top - bookBox.top,
        bottom: bookBox.bottom - imgBox.bottom,
      },
    };
    `,
    mode,
  );
}

function assertCoverFillsBook(cover, mode) {
  assert.ok(cover?.img, `${mode} mode should paint a cover image`);
  assert.equal(cover.objectFit, "cover", `${mode} cover should use object-fit: cover`);
  assert.doesNotMatch(String(cover.filter), /invert\(/, `${mode} cover keeps its colors`);
  for (const side of ["left", "right", "top", "bottom"]) {
    assert.ok(
      Math.abs(cover.inset[side]) <= 2,
      `${mode} cover should reach the ${side} edge ${JSON.stringify(cover.inset)}`,
    );
  }
}

function assertNoCssMask(metrics, label) {
  assert.match(String(metrics.maskImage), /^(none)?$/, `${label} must not set mask-image`);
  assert.match(
    String(metrics.webkitMaskImage),
    /^(none)?$/,
    `${label} must not set -webkit-mask-image`,
  );
}

/** Geometry of one cue card: how far it lifted and whether its cue is clipped. */
function cueCardMetrics(driver, index) {
  return driver.executeScript(`
    const card = document.querySelectorAll('[data-testid="atomic-cue-card"]')[${index}];
    if (!card) return null;
    const sheet = card.querySelector('.atomic-cue-sheet');
    const body = card.querySelector('.atomic-cue-body');
    const bodyStyle = getComputedStyle(body);
    const wash = getComputedStyle(body, '::after');
    return {
      isOpen: card.classList.contains('is-open'),
      ariaExpanded: card.getAttribute('aria-expanded'),
      lift: card.getBoundingClientRect().top - sheet.getBoundingClientRect().top,
      bodyHeight: body.clientHeight,
      clamped: body.scrollHeight > body.clientHeight + 1,
      metaOpacity: Number(getComputedStyle(card.querySelector('.atomic-cue-meta')).opacity),
      maskImage: String(bodyStyle.maskImage || ""),
      webkitMaskImage: String(bodyStyle.webkitMaskImage || ""),
      fadeHeight: wash.height,
      fadeOpacity: Number(wash.opacity),
    };
  `);
}

/**
 * Wait for a cue card's 420ms pop to settle, and report the last measurement
 * rather than a bare timeout when it never does.
 */
async function waitForCuePop(driver, index) {
  let last = null;
  try {
    await driver.wait(async () => {
      last = await cueCardMetrics(driver, index);
      return !last.clamped && last.lift > 8 && last.metaOpacity > 0.99 && last.fadeOpacity < 0.01;
    }, 8000);
  } catch {
    throw new Error(`cue card ${index} never popped: ${JSON.stringify(last)}`);
  }
  return last;
}

function isCssTransparent(color) {
  const value = String(color).trim().toLowerCase();
  if (!value || value === "transparent") return true;
  const match = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  return Boolean(match && match[4] !== undefined && Number(match[4]) === 0);
}

function cueLightboxMetrics(driver) {
  return driver.executeScript(`
    const overlay = document.querySelector('[data-testid="atomic-cue-lightbox"]');
    if (!overlay) return null;
    const card = overlay.querySelector('[data-testid="atomic-cue-lightbox-card"]');
    if (!card) return { present: true, placed: overlay.classList.contains("is-placed") };
    const body = card.querySelector(".atomic-cue-body");
    const sheet = card.querySelector(".atomic-cue-sheet");
    const text = card.querySelector(".atomic-cue-text");
    const backdrop = overlay.querySelector('[data-testid="atomic-cue-lightbox-backdrop"]');
    const source = document.querySelector('[data-testid="atomic-cue-card"][aria-expanded="true"]');
    const sourceSheet = source?.querySelector(".atomic-cue-sheet");
    const sourceText = source?.querySelector(".atomic-cue-text");
    const bodyStyle = body ? getComputedStyle(body) : null;
    const cardStyle = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    const textStyle = text ? getComputedStyle(text) : null;
    const sheetStyle = sheet ? getComputedStyle(sheet) : null;
    const sourceTextStyle = sourceText ? getComputedStyle(sourceText) : null;
    const sourceSheetStyle = sourceSheet ? getComputedStyle(sourceSheet) : null;
    const layoutWidth = parseFloat(
      cardStyle.getPropertyValue("--atomic-cue-lightbox-width") || card.style.getPropertyValue("--atomic-cue-lightbox-width"),
    );
    const flyScale = parseFloat(
      cardStyle.getPropertyValue("--atomic-cue-fly-scale") || card.style.getPropertyValue("--atomic-cue-fly-scale"),
    );
    const expectedWidth = (Number.isFinite(layoutWidth) ? layoutWidth : 0) * (Number.isFinite(flyScale) && flyScale > 0 ? flyScale : 1);
    return {
      present: true,
      placed: overlay.classList.contains("is-placed"),
      text: text?.textContent || "",
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      centerX: (rect.left + rect.right) / 2,
      centerY: (rect.top + rect.bottom) / 2,
      vw: window.innerWidth,
      vh: window.innerHeight,
      layoutWidth: Number.isFinite(layoutWidth) ? layoutWidth : 0,
      flyScale: Number.isFinite(flyScale) ? flyScale : 0,
      expectedWidth,
      widthSettled: expectedWidth > 0 && Math.abs(rect.width - expectedWidth) < 12,
      overflowY: getComputedStyle(overlay).overflowY,
      cardOverflowY: getComputedStyle(card).overflowY,
      bodyOverflowY: bodyStyle?.overflowY || "",
      bodyOverflowX: bodyStyle?.overflowX || "",
      scrollTop: body ? body.scrollTop : 0,
      scrollHeight: body ? body.scrollHeight : 0,
      clientHeight: body ? body.clientHeight : 0,
      scrollbarThumb: bodyStyle ? bodyStyle.getPropertyValue("--scrollbar-thumb-bg").trim() : "",
      scrollbarSize: bodyStyle ? bodyStyle.getPropertyValue("--scrollbar-size").trim() : "",
      hasScrollport: !!body?.classList.contains("atomic-scrollport"),
      maskImage: bodyStyle ? String(bodyStyle.maskImage || "") : "",
      webkitMaskImage: bodyStyle ? String(bodyStyle.webkitMaskImage || "") : "",
      clamped: !!(body && body.scrollHeight > body.clientHeight + 1),
      overlayBg: getComputedStyle(overlay).backgroundColor,
      backdropBg: backdrop ? getComputedStyle(backdrop).backgroundColor : "",
      backdropFilter: backdrop
        ? String(
            getComputedStyle(backdrop).backdropFilter
              || getComputedStyle(backdrop).webkitBackdropFilter
              || "",
          )
        : "",
      transform: getComputedStyle(card).transform,
      fontSize: textStyle?.fontSize || "",
      fontFamily: textStyle?.fontFamily || "",
      lineHeight: textStyle?.lineHeight || "",
      paddingLeft: sheetStyle?.paddingLeft || "",
      paddingTop: sheetStyle?.paddingTop || "",
      sheetBg: sheetStyle?.backgroundColor || "",
      sheetBgImage: sheetStyle?.backgroundImage || "",
      sourceFontSize: sourceTextStyle?.fontSize || "",
      sourceFontFamily: sourceTextStyle?.fontFamily || "",
      sourceLineHeight: sourceTextStyle?.lineHeight || "",
      sourcePaddingLeft: sourceSheetStyle?.paddingLeft || "",
      sourcePaddingTop: sourceSheetStyle?.paddingTop || "",
      sourceFlying: !!source?.classList.contains("is-flying"),
    };
  `);
}

async function waitForCueLightbox(driver, textNeedle) {
  let last = null;
  try {
    await driver.wait(async () => {
      last = await cueLightboxMetrics(driver);
      if (!last?.placed) return false;
      if (textNeedle && !String(last.text).includes(textNeedle)) return false;
      return (
        Math.abs(last.centerX - last.vw / 2) < 48
        && Math.abs(last.centerY - last.vh / 2) < 64
        && last.widthSettled
      );
    }, 8000);
  } catch {
    throw new Error(`cue lightbox never opened: ${JSON.stringify(last)}`);
  }
  return last;
}

async function waitForCueLightboxClosed(driver) {
  await driver.wait(async () => (await cueLightboxMetrics(driver)) === null, 8000);
}

async function check(driver, name, fn) {
  try {
    await fn();
  } catch (error) {
    await shot(driver, name);
    throw error;
  }
}

async function assertHiddenScrollports(driver, selector, minCount) {
  const reports = await driver.executeScript(
    `
    const selector = arguments[0];
    return [...document.querySelectorAll(selector)].map((el) => {
      const style = getComputedStyle(el);
      return {
        overflowX: style.overflowX,
        thumb: style.getPropertyValue("--scrollbar-thumb-bg").trim(),
        size: style.getPropertyValue("--scrollbar-size").trim(),
        gutter: el.offsetHeight - el.clientHeight,
      };
    });
    `,
    selector,
  );
  assert.ok(
    Array.isArray(reports) && reports.length >= minCount,
    `${selector} count ${Array.isArray(reports) ? reports.length : 0}`,
  );
  for (const report of reports) {
    assert.equal(report.overflowX, "auto");
    assert.equal(report.thumb, "transparent");
    assert.equal(report.size, "0px");
    assert.equal(report.gutter, 0);
  }
}

describe("Obsidian Selenium health check", { skip: skipReason || undefined, concurrency: false }, () => {
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

  it("shows every cue as an index card and pops one open", async () => {
    await check(driver, "cue-cards", async () => {
      await openVaultFile(driver, E2E_FILES.golfCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]');
      await waitCss(driver, '[data-testid="atomic-cue-card"]');

      const cards = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-cue-card"]')]
          .map((card) => card.querySelector('.atomic-cue-text')?.textContent || "");
      `);
      assert.deepEqual(cards, [
        "Smooth tempo",
        "Left wrist flat at the top",
        "Finish tall with the belt buckle facing the target, weight on the lead side",
        "Grip pressure at four out of ten, no tighter",
      ]);

      // The month and keeper sections are gone: cards are the only cue UI.
      const headings = await driver.executeScript(`
        return document.querySelector('[data-testid="atomic-cues"]').querySelectorAll('h2').length;
      `);
      assert.equal(headings, 0);

      // The fan layout (228px cards) is what clips a long cue. A short
      // window with the sidebar open is under the 600px stack breakpoint,
      // and the same sentence then fits in four lines.
      await driver.executeScript(`
        app.workspace.leftSplit?.collapse?.();
        app.workspace.rightSplit?.collapse?.();
      `);
      await driver.wait(async () => {
        const ready = await driver.executeScript(`
          const host = document.querySelector('[data-testid="atomic-cues"]');
          const meta = document.querySelector('[data-testid="atomic-cue-card"] .atomic-cue-meta');
          const width = host ? host.getBoundingClientRect().width : 0;
          const opacity = meta ? Number(getComputedStyle(meta).opacity) : 1;
          return width > 600 && opacity < 0.01;
        `);
        return ready;
      }, 8000);

      const before = await cueCardMetrics(driver, 2);
      assert.ok(before.clamped, "a long cue should be clipped at rest");
      assert.equal(before.metaOpacity, 0, "the meta row is hidden at rest");
      assert.equal(before.ariaExpanded, "false");
      assertNoCssMask(before, "resting cue body");
      assert.equal(before.fadeHeight, "14px");
      assert.equal(before.fadeOpacity, 1, "resting cue keeps the bottom wash");

      await driver.executeScript(`
        document.querySelectorAll('[data-testid="atomic-cue-card"]')[2].click();
      `);
      const afterClick = await cueCardMetrics(driver, 2);
      assert.equal(afterClick.isOpen, false, "click must not reuse the in-fan is-open expand");
      assert.equal(afterClick.ariaExpanded, "true");
      assert.ok(afterClick.clamped, "the fan card stays clipped; the lightbox shows the cue");
      const lightbox = await waitForCueLightbox(
        driver,
        "Finish tall with the belt buckle facing the target",
      );
      assert.ok(lightbox.width > 300, `lightbox card should be larger, width=${lightbox.width}`);
      assert.ok(
        lightbox.width <= lightbox.vw - 24,
        `lightbox must stay in the viewport: width=${lightbox.width} vw=${lightbox.vw}`,
      );
      assert.ok(
        lightbox.right <= lightbox.vw + 1 && lightbox.left >= -1,
        `lightbox must not overflow horizontally: ${lightbox.left}…${lightbox.right} vw=${lightbox.vw}`,
      );
      assert.ok(
        Math.abs(lightbox.centerY - lightbox.vh / 2) < 64,
        `lightbox should be vertically centered: ${lightbox.centerY} vs ${lightbox.vh / 2}`,
      );
      assert.equal(lightbox.overflowY, "hidden");
      assert.equal(lightbox.cardOverflowY, "hidden");
      assert.equal(lightbox.bodyOverflowY, "auto", "tall cues scroll inside the card body");
      assert.equal(lightbox.bodyOverflowX, "hidden");
      assert.equal(lightbox.hasScrollport, true);
      assert.equal(lightbox.scrollbarThumb, "transparent");
      assert.equal(lightbox.scrollbarSize, "0px");
      assertNoCssMask(lightbox, "lightbox cue body");
      assert.equal(lightbox.clamped, false, "this cue still fits without scrolling");
      await shot(driver, "cue-lightbox-wide");
      assert.ok(isCssTransparent(lightbox.overlayBg), `overlay must not dim: ${lightbox.overlayBg}`);
      assert.ok(
        isCssTransparent(lightbox.backdropBg),
        `backdrop must stay transparent: ${lightbox.backdropBg}`,
      );
      assert.match(
        String(lightbox.backdropFilter),
        /blur\(/,
        `backdrop must blur, not dim: ${lightbox.backdropFilter}`,
      );
      assert.match(String(lightbox.transform), /matrix/, "the card flies with a scale transform");
      assert.equal(lightbox.sourceFlying, true, "the fan sheet hides so the same card appears to fly");
      assert.equal(lightbox.fontSize, lightbox.sourceFontSize, "centered type matches the fan card");
      assert.equal(lightbox.lineHeight, lightbox.sourceLineHeight);
      assert.equal(lightbox.paddingLeft, lightbox.sourcePaddingLeft, "text stays on the same margin rule");
      assert.equal(lightbox.paddingTop, lightbox.sourcePaddingTop);
      assert.equal(lightbox.fontFamily, lightbox.sourceFontFamily);
      assert.match(String(lightbox.fontFamily), /Caveat/i);
      assert.match(String(lightbox.sheetBgImage), /linear-gradient/, "centered paper keeps the ruled card");
      assert.notEqual(lightbox.sheetBg, "rgb(255, 255, 255)", "centered paper stays pastel, not plain white");

      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-cue-lightbox-backdrop"]').click();
      `);
      await waitForCueLightboxClosed(driver);
      await driver.executeScript(`
        document.querySelectorAll('[data-testid="atomic-cue-card"]')[0].click();
      `);
      const shortLightbox = await waitForCueLightbox(driver, "Smooth tempo");
      assert.ok(
        lightbox.width > shortLightbox.width + 24,
        `long cue should grow wider than a short card: ${lightbox.width} vs ${shortLightbox.width}`,
      );
      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-cue-lightbox-backdrop"]').click();
      `);
      await waitForCueLightboxClosed(driver);
      await driver.wait(async () => {
        const closed = await cueCardMetrics(driver, 2);
        return !closed.isOpen && closed.ariaExpanded === "false" && closed.lift < 4;
      }, 8000);

      await driver.executeScript(`
        document.querySelectorAll('[data-testid="atomic-cue-card"]')[2].click();
      `);
      await waitForCueLightbox(driver, "belt buckle");
      await driver.executeScript(`
        document.querySelector('[data-testid="atomic-cue-lightbox-card"]').click();
      `);
      await waitForCueLightboxClosed(driver);

      await driver.executeScript(`
        document.querySelectorAll('[data-testid="atomic-cue-card"]')[2].click();
      `);
      await waitForCueLightbox(driver, "belt buckle");
      await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
      await waitForCueLightboxClosed(driver);

      // Hover pops the card without the is-open class, on any pointer type.
      const cardEls = await driver.findElements(By.css('[data-testid="atomic-cue-card"]'));
      await driver.actions({ async: false }).move({ origin: cardEls[0] }).perform();
      const hovered = await waitForCuePop(driver, 0);
      assert.equal(hovered.isOpen, false, "hover must not need the is-open class");
      assert.equal(await cueLightboxMetrics(driver), null, "hover must not open the lightbox");

      const desktopViewport = await driver.executeScript(
        `return { width: window.innerWidth, height: window.innerHeight }`,
      );
      try {
        try {
          await driver.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
          });
        } catch {
          await driver.executeScript(`window.resizeTo(390, 844)`);
        }
        await driver.wait(async () => {
          return driver.executeScript(
            `return window.matchMedia("(max-width: 600px)").matches`,
          );
        }, 8000);
        await driver.executeScript(`
          app.workspace.leftSplit?.collapse?.();
          app.workspace.rightSplit?.collapse?.();
          document.querySelector('[data-testid="atomic-cues"]')?.scrollIntoView({ block: "start" });
        `);
        await driver.wait(async () => {
          const rest = await cueCardMetrics(driver, 0);
          return rest && rest.bodyHeight >= 80 && rest.lift < 4 && !rest.isOpen;
        }, 8000);
        const phoneRest = await cueCardMetrics(driver, 0);
        const phoneCard = await driver.findElement(By.css('[data-testid="atomic-cue-card"]'));
        await driver.actions({ async: false }).move({ origin: phoneCard }).perform();
        const phoneHover = await cueCardMetrics(driver, 0);
        assert.ok(
          phoneHover.bodyHeight <= phoneRest.bodyHeight + 1,
          `phone hover must not expand a card: ${phoneRest.bodyHeight} -> ${phoneHover.bodyHeight}`,
        );
        assert.ok(
          phoneHover.bodyHeight >= 80,
          "the stacked cue list previews several lines",
        );
        assertNoCssMask(phoneHover, "phone hover cue body");
        assert.equal(phoneHover.fadeOpacity, 1, "phone hover keeps the bottom wash");
        await shot(driver, "cue-list-preview");

        await driver.executeScript(`
          document.querySelectorAll('[data-testid="atomic-cue-card"]')[0].click();
        `);
        const phoneSource = await cueCardMetrics(driver, 0);
        assert.equal(phoneSource.isOpen, false, "phone tap must not expand the in-flow card");
        assert.equal(phoneSource.ariaExpanded, "true");
        const phoneLightbox = await waitForCueLightbox(driver);
        assert.ok(phoneLightbox.width > 200, "phone lightbox is a larger card");
        assert.equal(phoneLightbox.clamped, false);
        assert.ok(isCssTransparent(phoneLightbox.backdropBg), "phone tap must not dim the fan");
        assert.match(String(phoneLightbox.backdropFilter), /blur\(/, "phone backdrop blurs without a wash");
        assert.equal(phoneLightbox.fontSize, phoneLightbox.sourceFontSize);
        assert.equal(phoneLightbox.paddingLeft, phoneLightbox.sourcePaddingLeft);
        assert.match(String(phoneLightbox.sheetBgImage), /linear-gradient/);
      } finally {
        await restoreDesktopPointer(driver, desktopViewport);
      }

      await openVaultFile(driver, E2E_FILES.gymCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="gym"]');
      const gymCues = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-cue-card"]')]
          .map((card) => card.querySelector('.atomic-cue-text')?.textContent || "");
      `);
      assert.deepEqual(gymCues, ["Brace the core"]);
    });
  });

  it("adds a cue from the in-note form and shows it as a new card", async () => {
    await check(driver, "cue-log", async () => {
      const gymPath = E2E_FILES.gymSession(today.slice(0, 4), today);
      await openVaultFile(driver, gymPath);
      await waitCss(driver, '[data-testid="atomic-cue-log"]');
      await waitCss(driver, '[data-testid="atomic-cue-log-existing"]');
      const cueLayout = await driver.executeScript(`
        const field = document.querySelector(".atomic-cue-log-field");
        const button = document.querySelector('[data-testid="atomic-cue-log-add"]');
        if (!field || !button) return null;
        const fr = field.getBoundingClientRect();
        const br = button.getBoundingClientRect();
        const overlap = fr.left < br.right - 1 && fr.right > br.left + 1
          && fr.top < br.bottom - 1 && fr.bottom > br.top + 1;
        const compose = field.closest(".atomic-cue-log-compose");
        const gym = document.querySelector('[data-testid="atomic-gym-log"]');
        const gymFields = gym?.querySelector(".atomic-gym-log-fields");
        const exercise = gymFields?.firstElementChild;
        const note = field.closest(".cm-sizer, .markdown-preview-sizer");
        const composeBox = compose?.getBoundingClientRect();
        const gymBox = gym?.getBoundingClientRect();
        const exerciseBox = exercise?.getBoundingClientRect();
        return {
          overlap,
          label: field.querySelector(".atomic-field-label")?.textContent || "",
          well: !!field.closest(".atomic-well"),
          noteW: note?.clientWidth || 0,
          composeW: composeBox ? composeBox.width : 0,
          gymW: gymBox ? gymBox.width : 0,
          exerciseW: exerciseBox ? exerciseBox.width : 0,
        };
      `);
      assert.ok(cueLayout, "cue field and add button should be measurable");
      assert.equal(cueLayout.overlap, false, "add cue must not cover the reminder field");
      assert.equal(cueLayout.label, "", "the reminder field has no title; Add cue names it");
      assert.equal(cueLayout.well, true);
      if (cueLayout.gymW > 0) {
        assert.ok(
          cueLayout.composeW > cueLayout.exerciseW + 48,
          `reminder composer should match the gym row, not one field: ${JSON.stringify(cueLayout)}`,
        );
      }

      await waitCss(driver, '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]');
      const input = await waitCss(driver, '[data-testid="atomic-cue-log-text"]');
      await driver.executeScript(
        `arguments[0].value = arguments[1];
         arguments[0].dispatchEvent(new Event("input", { bubbles: true }));`,
        input,
        "前臂放鬆\nKnees track over the **toes** — [notes](https://example.com/atomic-e2e)",
      );
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-cue-log-add"]').click()`,
      );
      await waitForNotice(driver, "Added cue");

      const markdown = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymPath)});
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.match(
        String(markdown),
        /\n- Brace the core\n- 前臂放鬆\n  Knees track over the \*\*toes\*\* — \[notes\]\(https:\/\/example\.com\/atomic-e2e\)\n/,
      );
      assert.doesNotMatch(String(markdown), /## Reminders[\s\S]*## Reminders/);
      // The cue must land past the cue form fence, never inside it.
      assert.doesNotMatch(String(markdown), /```atomic-cue-log\n- /);

      await driver.wait(async () => {
        const cards = await driver.executeScript(`
          return [...document.querySelectorAll(
            '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]'
          )].map((card) => ({
            text: card.querySelector('.atomic-cue-text')?.textContent || "",
            strong: card.querySelector('.atomic-cue-text strong, .atomic-cue-text b')?.textContent || "",
          }));
        `);
        return (
          Array.isArray(cards) &&
          cards.some((card) => card.text.includes("前臂放鬆") && card.strong.includes("toes"))
        );
      }, 8000);

      const linkToggle = await driver.executeScript(`
        const card = [...document.querySelectorAll(
          '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]'
        )].find((el) => el.querySelector("a[href]"));
        if (!card) return { found: false };
        const link = card.querySelector("a[href]");
        const lightboxOpen = () => !!document.querySelector('[data-testid="atomic-cue-lightbox"]');
        const before = {
          open: card.classList.contains("is-open"),
          aria: card.getAttribute("aria-expanded"),
          lightbox: lightboxOpen(),
        };
        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        const afterClick = {
          open: card.classList.contains("is-open"),
          lightbox: lightboxOpen(),
        };
        link.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }));
        const afterEnter = {
          open: card.classList.contains("is-open"),
          lightbox: lightboxOpen(),
        };
        card.click();
        return {
          found: true,
          href: link.getAttribute("href"),
          before,
          afterClick,
          afterEnter,
          afterCardClick: {
            open: card.classList.contains("is-open"),
            aria: card.getAttribute("aria-expanded"),
            lightbox: lightboxOpen(),
          },
        };
      `);
      assert.equal(linkToggle.found, true, "the new cue should render a markdown link");
      assert.equal(linkToggle.href, "https://example.com/atomic-e2e");
      assert.equal(linkToggle.before.open, false);
      assert.equal(linkToggle.before.aria, "false");
      assert.equal(linkToggle.before.lightbox, false);
      assert.equal(linkToggle.afterClick.open, false, "clicking a cue link must not toggle the card");
      assert.equal(linkToggle.afterClick.lightbox, false, "clicking a cue link must not open the lightbox");
      assert.equal(linkToggle.afterEnter.open, false, "Enter on a cue link must not toggle the card");
      assert.equal(linkToggle.afterEnter.lightbox, false);
      assert.equal(linkToggle.afterCardClick.open, false, "card click opens the lightbox, not is-open");
      assert.equal(linkToggle.afterCardClick.aria, "true");
      assert.equal(linkToggle.afterCardClick.lightbox, true);
      const logLightbox = await waitForCueLightbox(driver, "前臂放鬆");
      assert.match(logLightbox.text, /toes/);
      assert.equal(logLightbox.bodyOverflowY, "auto");
      assert.ok(
        logLightbox.width > 400,
        `CJK / markdown cue should grow with the longest line: width=${logLightbox.width}`,
      );
      assert.ok(logLightbox.width <= logLightbox.vw - 24);
      await shot(driver, "cue-lightbox-cjk");
      const lightboxLink = await driver.executeScript(`
        const overlay = document.querySelector('[data-testid="atomic-cue-lightbox"]');
        const link = overlay?.querySelector("a[href]");
        if (!link) return { found: false };
        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return {
          found: true,
          href: link.getAttribute("href"),
          stillOpen: !!document.querySelector('[data-testid="atomic-cue-lightbox"]'),
        };
      `);
      assert.equal(lightboxLink.found, true);
      assert.equal(lightboxLink.href, "https://example.com/atomic-e2e");
      assert.equal(lightboxLink.stillOpen, true, "a lightbox link click must not close the overlay");

      const tallCue = [
        `長句寬度測試：${"揮桿節奏要慢而且穩定".repeat(4)}`,
        ...Array.from({ length: 40 }, (_, index) => `Keep the lead wrist flat — line ${index + 1}`),
      ].join("\n");
      const tallInput = await waitCss(driver, '[data-testid="atomic-cue-log-text"]');
      await driver.executeScript(
        `arguments[0].value = arguments[1];
         arguments[0].dispatchEvent(new Event("input", { bubbles: true }));`,
        tallInput,
        tallCue,
      );
      await driver.executeScript(
        `document.querySelector('[data-testid="atomic-cue-log-add"]').click()`,
      );
      await waitForNotice(driver, "Added cue");
      await driver.wait(async () => {
        return driver.executeScript(`
          return [...document.querySelectorAll(
            '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]'
          )].some((card) => (card.querySelector('.atomic-cue-text')?.textContent || "").includes("長句寬度測試"));
        `);
      }, 8000);
      await driver.executeScript(`
        const card = [...document.querySelectorAll(
          '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]'
        )].find((el) => (el.querySelector('.atomic-cue-text')?.textContent || "").includes("長句寬度測試"));
        card?.click();
      `);
      const tallLightbox = await waitForCueLightbox(driver, "長句寬度測試");
      assert.equal(tallLightbox.bodyOverflowY, "auto");
      assert.equal(tallLightbox.hasScrollport, true);
      assert.equal(tallLightbox.scrollbarThumb, "transparent");
      assert.equal(tallLightbox.scrollbarSize, "0px");
      assert.ok(tallLightbox.clamped, "a cue taller than the window scrolls the card body");
      assert.ok(
        tallLightbox.height <= tallLightbox.vh - 24,
        `tall card must stay in the viewport: height=${tallLightbox.height} vh=${tallLightbox.vh}`,
      );
      assert.ok(
        tallLightbox.width <= tallLightbox.vw - 24,
        `wide CJK card must stay in the viewport: width=${tallLightbox.width} vw=${tallLightbox.vw}`,
      );
      assert.ok(
        tallLightbox.width >= logLightbox.width,
        `uncapped CJK line should be at least as wide as the shorter cue: ${tallLightbox.width} vs ${logLightbox.width}`,
      );
      assert.ok(
        tallLightbox.width > tallLightbox.vw * 0.55,
        `long CJK line should use most of the viewport: width=${tallLightbox.width} vw=${tallLightbox.vw}`,
      );
      await driver.executeScript(`
        const body = document.querySelector('[data-testid="atomic-cue-lightbox"] .atomic-cue-body');
        if (body) body.scrollTop = 120;
      `);
      const scrolled = await cueLightboxMetrics(driver);
      assert.ok(scrolled.scrollTop >= 80, `card body should scroll: scrollTop=${scrolled.scrollTop}`);
      assertNoCssMask(scrolled, "scrolling lightbox cue body");
      await shot(driver, "cue-lightbox-tall");

      await openVaultFile(driver, E2E_FILES.gymCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="gym"]');
      await driver.wait(async () => {
        const cues = await driver.executeScript(`
          return [...document.querySelectorAll('[data-testid="atomic-cue-card"]')]
            .map((card) => card.querySelector('.atomic-cue-text')?.textContent || "");
        `);
        return Array.isArray(cues) && cues.some((text) => text.includes("前臂放鬆"));
      }, 8000);
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

      const weekday = await driver.executeScript(`
        const heat = document.querySelector('[data-testid="atomic-heatmap"]');
        const labels = [...heat.querySelectorAll(".atomic-heat-days span")];
        const cells = [...heat.querySelectorAll(".atomic-heat-cells .atomic-heat-cell")].slice(0, 7);
        const language = app.plugins.getPlugin("atomic-tracker").settings.language;
        const centers = labels.map((span, index) => {
          const mark = span.getBoundingClientRect();
          const cell = cells[index]?.getBoundingClientRect();
          if (!cell) return 99;
          return Math.abs((mark.top + mark.height / 2) - (cell.top + cell.height / 2));
        });
        return {
          language,
          marks: labels.map((span) => span.textContent || ""),
          maxDelta: centers.length ? Math.max(...centers) : 99,
        };
      `);
      assert.equal(weekday.marks.length, 7, `expected 7 weekday labels ${JSON.stringify(weekday)}`);
      assert.ok(
        weekday.maxDelta < 3,
        `weekday labels should sit on their rows: ${JSON.stringify(weekday)}`,
      );
      if (weekday.language === "zh-Hant-en") {
        assert.deepEqual(weekday.marks, ["日", "一", "二", "三", "四", "五", "六"]);
      } else {
        assert.deepEqual(weekday.marks, ["S", "M", "T", "W", "T", "F", "S"]);
      }
    });
  });

  it("hides heatmap and bookshelf scrollbars in stacked and grid layouts", async () => {
    await check(driver, "heatmap-scrollbars", async () => {
      await openVaultFile(driver, E2E_FILES.heatmapAll);
      await waitCss(driver, '[data-testid="atomic-heatmap-scroll"]');
      await assertHiddenScrollports(driver, '[data-testid="atomic-heatmap-scroll"]', 3);

      await openVaultFile(driver, E2E_FILES.heatmapGrid);
      await waitCss(driver, ".fitness-heatmap-grid [data-testid=\"atomic-heatmap-scroll\"]");
      const gridGap = await driver.executeScript(`
        const grid = document.querySelector(".fitness-heatmap-grid");
        if (!grid) return "";
        const style = getComputedStyle(grid);
        return style.columnGap || style.gap || "";
      `);
      assert.equal(String(gridGap), "40px", `heatmap blocks need a visible gap: ${gridGap}`);
      await assertHiddenScrollports(
        driver,
        ".fitness-heatmap-grid [data-testid=\"atomic-heatmap-scroll\"]",
        3,
      );

      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '[data-testid="atomic-bookshelf-scroll"]');
      await assertHiddenScrollports(driver, '[data-testid="atomic-bookshelf-scroll"]', 1);
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

      const activitiesMeta = await driver.executeScript(`
        return document.querySelector('[data-testid="atomic-dashboard-activities"] .atomic-readout')?.textContent || "";
      `);
      assert.match(String(activitiesMeta), /Bars · hours per month/);

      const jumpLinks = await driver.executeScript(`
        return [...document.querySelectorAll(
          '.atomic-jumps [data-testid="atomic-dashboard-link"]'
        )].map((a) => [a.getAttribute("data-path"), (a.textContent || "").trim()]);
      `);
      assert.deepEqual(jumpLinks, [
        ["atomics/exercise/Gym/Cues.md", "Gym cues↗"],
        ["atomics/exercise/Golf/Cues.md", "Golf cues↗"],
        ["atomics/hobbies/Reading/Bookshelf.base", "Bases↗"],
        ["atomics/hobbies/Reading/Book Shelf.md", "Book shelf↗"],
      ]);

      const lastLinks = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-dashboard-last"]')].map((a) => [
          a.closest("[data-activity]")?.getAttribute("data-activity"),
          a.getAttribute("data-path"),
        ]);
      `);
      assert.deepEqual(lastLinks, [
        ["gym", E2E_FILES.gymSession(year, today)],
        ["golf", E2E_FILES.golfSession(year, today)],
        ["reading", E2E_FILES.readingCurrent],
      ]);
      const readingShelf = await driver.findElements(
        By.css(
          '[data-testid="atomic-dashboard-activity"][data-activity="reading"] [data-path="atomics/hobbies/Reading/Book Shelf.md"]',
        ),
      );
      assert.equal(readingShelf.length, 0);
      await saveScreenshot(driver, "dashboard-reading-links");

      const month = String(Number(today.slice(5, 7)));
      const gymMonthMinutes = await driver.executeScript(`
        return document.querySelector(
          '[data-testid="atomic-dashboard-activity"][data-activity="gym"] [data-testid="atomic-dashboard-month-bar"][data-month="${month}"]'
        )?.getAttribute("data-minutes") || "";
      `);
      // Minutes, not session count (a one-session month would be "1").
      assert.match(String(gymMonthMinutes), /^[1-9]\d+$/);

      await waitCss(
        driver,
        '[data-testid="atomic-dashboard-monthly"] + details.atomic-quiet-toggle',
      );
      const monthlyTables = await driver.findElements(
        By.css('[data-testid="atomic-dashboard-monthly"] + details.atomic-quiet-toggle table'),
      );
      assert.equal(monthlyTables.length, 1);
      const chartCols = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-dashboard-month-col"]')].map((col) => ({
          month: Number(col.getAttribute("data-month")),
          future: col.classList.contains("is-future"),
          segs: col.querySelectorAll(".atomic-chart-seg").length,
          sum: [...col.querySelectorAll(".atomic-chart-seg")].reduce(
            (total, seg) => total + (Number(seg.style.getPropertyValue("--v")) || 0),
            0,
          ),
        }));
      `);
      assert.equal(chartCols.length, 12);
      for (const col of chartCols) {
        assert.ok(col.sum <= 1.001, `month ${col.month} segments exceed the plot`);
        if (col.month > Number(month)) {
          assert.equal(col.future, true);
          assert.equal(col.segs, 0);
        } else {
          assert.equal(col.future, false);
          assert.equal(col.segs, 2);
        }
      }
      if (Number(month) < 12) {
        const futureBar = await waitCss(
          driver,
          `[data-testid="atomic-dashboard-activity"][data-activity="gym"] [data-testid="atomic-dashboard-month-bar"][data-month="${Number(month) + 1}"]`,
        );
        assert.match(await futureBar.getAttribute("class"), /is-future/);
      }
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

      await driver.executeScript(`
        document.querySelector(
          '[data-testid="atomic-dashboard-activity"][data-activity="reading"] [data-testid="atomic-dashboard-last"]'
        ).click();
      `);
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === E2E_FILES.readingCurrent;
      }, 8000);
    });
  });

  it("ensures missing exercise Cues.md hosts and does not overwrite existing ones", async () => {
    await check(driver, "cues-host", async () => {
      const gymHost = "atomics/exercise/Gym/Cues.md";
      const golfHost = "atomics/exercise/Golf/Cues.md";

      const before = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymHost)});
        if (!file) { done(null); return; }
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.equal(before, "# Gym Cues\n");

      await runCommandViaPalette(driver, "Create cues notes");
      await waitForNotice(driver, "Cues notes already exist");

      const afterCommand = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymHost)});
        if (!file) { done(null); return; }
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.equal(afterCommand, "# Gym Cues\n", "Create cues notes must not overwrite");

      const deleted = await driver.executeAsyncScript(`
        const done = arguments[0];
        const paths = ${JSON.stringify([gymHost, golfHost])};
        Promise.all(paths.map(async (path) => {
          const file = app.vault.getAbstractFileByPath(path);
          if (file) await app.vault.delete(file);
        })).then(() => done(true), (err) => done(String(err)));
      `);
      assert.equal(deleted, true);

      await runCommandViaPalette(driver, "Create cues notes");
      await waitForNotice(driver, "Created cues");

      const created = await driver.executeAsyncScript(`
        const done = arguments[0];
        const paths = ${JSON.stringify([gymHost, golfHost])};
        Promise.all(paths.map(async (path) => {
          const file = app.vault.getAbstractFileByPath(path);
          if (!file) return { path, missing: true };
          return { path, markdown: await app.vault.read(file) };
        })).then((rows) => done(rows), (err) => done(String(err)));
      `);
      assert.ok(Array.isArray(created), String(created));
      const gym = created.find((row) => row.path === gymHost);
      const golf = created.find((row) => row.path === golfHost);
      assert.match(String(gym?.markdown), /```atomic-cues/);
      assert.match(String(gym?.markdown), /^activity: gym /m);
      assert.match(String(golf?.markdown), /```atomic-cues/);
      assert.match(String(golf?.markdown), /^activity: golf /m);

      await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymHost)});
        app.vault.delete(file).then(() => done(true), (err) => done(String(err)));
      `);

      await openVaultFile(driver, E2E_FILES.dashboard);
      await waitCss(driver, '[data-testid="atomic-dashboard"]');
      await driver.executeScript(`
        document.querySelector(
          '[data-testid="atomic-dashboard-link"][data-path="${gymHost}"]'
        ).click();
      `);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="gym"]');
      const reopened = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(gymHost)});
        if (!file) { done(null); return; }
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.match(String(reopened), /```atomic-cues/);
      assert.match(String(reopened), /^activity: gym /m);
      await saveScreenshot(driver, "cues-host-ensured");
    });
  });

  it("creates the daily note template and today's daily note without overwriting", async () => {
    await check(driver, "daily-note-template", async () => {
      const templatePath = E2E_DAILY_NOTE_TEMPLATE;
      const todayPath = await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        const tz = plugin.settings.timezone || "UTC";
        const ymd = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        return ${JSON.stringify(E2E_DAILY_NOTES_FOLDER + "/")} + ymd + ".md";
      `);
      assert.notEqual(templatePath.split("/")[0], "Templates");
      assert.notEqual(String(todayPath).split("/")[0], "Daily notes");

      const corePaths = await driver.executeScript(`
        const daily = app.internalPlugins.getPluginById("daily-notes");
        const templates = app.internalPlugins.getPluginById("templates");
        const dailyOpts = daily?.instance?.options || daily?.options || {};
        const templateOpts = templates?.instance?.options || templates?.options || {};
        return {
          folder: dailyOpts.folder || "",
          template: dailyOpts.template || "",
          templatesFolder: templateOpts.folder || "",
        };
      `);
      assert.equal(corePaths.folder, E2E_DAILY_NOTES_FOLDER);
      assert.equal(corePaths.templatesFolder, E2E_TEMPLATES_FOLDER);
      assert.equal(
        String(corePaths.template).replace(/\.md$/, ""),
        E2E_DAILY_NOTE_TEMPLATE.replace(/\.md$/, ""),
      );

      await runCommandViaPalette(driver, "Create daily note template");
      await waitForNotice(driver, "Created daily note template");

      const templateCreated = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(templatePath)});
        if (!file) { done({ missing: true }); return; }
        app.vault.read(file).then(
          (md) => done({ markdown: md }),
          (err) => done({ error: String(err) }),
        );
      `);
      assert.equal(templateCreated.missing, undefined, String(templateCreated.error || "template missing"));
      const templateMd = String(templateCreated.markdown);
      assert.match(templateMd, /```atomic-bookshelf/);
      assert.match(templateMd, /```atomic-actions/);
      assert.match(templateMd, /```atomic-heatmap/);
      assert.match(templateMd, /```atomic-today/);
      assert.match(templateMd, /\{\{date:dddd, MMMM D, YYYY\}\}/);
      assert.doesNotMatch(templateMd, /^year:\s*\d{4}/m);

      const kept = "# keep daily template\n";
      await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(templatePath)});
        app.vault.modify(file, ${JSON.stringify(kept)}).then(
          () => done(true),
          (err) => done(String(err)),
        );
      `);

      await runCommandViaPalette(driver, "Create daily note template");
      await waitForNotice(driver, "Daily note template already exists");
      const afterSecond = await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.vault.getAbstractFileByPath(${JSON.stringify(templatePath)});
        app.vault.read(file).then((md) => done(md), (err) => done(String(err)));
      `);
      assert.equal(String(afterSecond), kept, "Create daily note template must not overwrite");

      await runCommandViaPalette(driver, "Create today's daily note");
      await waitForNotice(driver, "Created today's daily note");
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === todayPath;
      }, 10000);

      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      await waitCss(driver, '[data-testid="atomic-actions"]');
      await waitCss(driver, '[data-testid="atomic-heatmap"]');
      await waitCss(driver, '[data-testid="atomic-today"]');

      const buttons = await driver.executeScript(`
        return [...document.querySelectorAll('[data-testid="atomic-actions"] button')]
          .map((button) => button.textContent.trim());
      `);
      assert.ok(Array.isArray(buttons) && buttons.includes("Gym"), String(buttons));
      assert.ok(buttons.includes("Golf"));
      assert.ok(buttons.includes("Reading"));

      await runCommandViaPalette(driver, "Create today's daily note");
      await waitForNotice(driver, "Opened existing daily note");
      await saveScreenshot(driver, "daily-note-template");
    });
  });

  it("opens today's gym and golf notes from the today rows", async () => {
    await check(driver, "today-open-session", async () => {
      const gymPath = E2E_FILES.gymSession(today.slice(0, 4), today);
      const golfPath = E2E_FILES.golfSession(today.slice(0, 4), today);
      const todayPath = await driver.executeScript(`
        const plugin = app.plugins.getPlugin("atomic-tracker");
        const tz = plugin.settings.timezone || "UTC";
        const ymd = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        return ${JSON.stringify(E2E_DAILY_NOTES_FOLDER + "/")} + ymd + ".md";
      `);
      await openVaultFile(driver, String(todayPath));
      await waitCss(driver, `[data-testid="atomic-today-row"][data-path="${gymPath}"]`);
      await driver.executeScript(`
        document.querySelector(
          '[data-testid="atomic-today-row"][data-path=${JSON.stringify(gymPath)}]'
        ).click();
      `);
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === gymPath;
      }, 8000);
      await openVaultFile(driver, String(todayPath));
      await waitCss(driver, `[data-testid="atomic-today-row"][data-path="${golfPath}"]`);
      await driver.executeScript(`
        document.querySelector(
          '[data-testid="atomic-today-row"][data-path=${JSON.stringify(golfPath)}]'
        ).click();
      `);
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === golfPath;
      }, 8000);
    });
  });

  it("shows both name halves on the dashboard and one language elsewhere", async () => {
    await check(driver, "activity-label-one-language", async () => {
      await openVaultFile(driver, E2E_FILES.dashboard);
      await waitCss(
        driver,
        '[data-testid="atomic-dashboard-activity"][data-activity="gym"]',
      );
      try {
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          const gym = plugin.settings.activityTypes.find((activity) => activity.id === "gym");
          gym.label = "🏋️ Gym / 健身";
          plugin.settings.language = "zh-Hant-en";
          return plugin.refreshAll();
        `);
        let name = { text: "", zh: "" };
        try {
          await driver.wait(async () => {
            name = await driver.executeScript(`
              const row = document.querySelector(
                '[data-testid="atomic-dashboard-activity"][data-activity="gym"] .atomic-name'
              );
              const zh = row?.querySelector(".atomic-inline-zh");
              return {
                text: row ? row.textContent.trim() : "",
                zh: zh ? zh.textContent.trim() : "",
              };
            `);
            return name.text === "Gym健身" && name.zh === "健身";
          }, 8000);
        } catch (error) {
          throw new Error(`${error.message} last=${JSON.stringify(name)}`);
        }
        assert.equal(name.text.includes("/"), false);
        assert.equal(name.text.includes("🏋️"), false);

        await openVaultFile(driver, E2E_FILES.heatmapAll);
        await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="gym"] .atomic-name');
        const heatName = await driver.executeScript(`
          return document.querySelector(
            '[data-testid="atomic-heatmap"][data-activity="gym"] .atomic-name'
          )?.textContent.trim() || "";
        `);
        assert.equal(heatName, "🏋️ 健身");
      } finally {
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          const gym = plugin.settings.activityTypes.find((activity) => activity.id === "gym");
          if (gym) gym.label = "Gym";
          plugin.settings.language = "en";
          return plugin.refreshAll();
        `);
      }
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
          '[data-testid="atomic-dashboard-recent-row"][data-path=${JSON.stringify(gymPath)}]'
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
        const cells = [...heatmap.querySelectorAll('.atomic-heat-cells > .atomic-heat-cell')];
        const index = cells.indexOf(today);
        const todayWeek = Math.floor(index / 7) + 1;
        const ymd = today.getAttribute('data-ymd') || '';
        const month = Number(ymd.slice(5, 7));
        const labels = [...heatmap.querySelectorAll('[data-testid="atomic-heatmap-month"]')];
        const label = labels.find((node) => Number(node.getAttribute('data-month')) === month);
        const labelWeek = label ? Number(label.getAttribute('data-week')) : 0;
        const next = labels.find((node) => Number(node.getAttribute('data-week')) > labelWeek);
        const nextWeek = next ? Number(next.getAttribute('data-week')) : todayWeek + 1;
        const anchor = cells[(labelWeek - 1) * 7];
        const dx = label && anchor
          ? Math.abs(label.getBoundingClientRect().left - anchor.getBoundingClientRect().left)
          : 999;
        return { ymd, todayWeek, labelWeek, nextWeek, dx };
      `);
      assert.ok(result.ymd, "today cell is missing data-ymd");
      assert.ok(result.labelWeek >= 1, `today month label is missing (${result.ymd})`);
      assert.ok(
        result.labelWeek <= result.todayWeek && result.nextWeek > result.todayWeek,
        `today week ${result.todayWeek} is outside ${result.labelWeek}–${result.nextWeek} (${result.ymd})`,
      );
      assert.ok(
        result.dx < 2,
        `month label and its week differ by ${result.dx}px`,
      );
    });
  });

  it("keeps Traditional Chinese heatmap captions on one line in a narrow pane", async () => {
    await check(driver, "heatmap-foot-narrow", async () => {
      const desktopViewport = await driver.executeScript(
        `return { width: window.innerWidth, height: window.innerHeight }`,
      );
      try {
        try {
          await driver.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", {
            width: 480,
            height: 900,
            deviceScaleFactor: 1,
            mobile: true,
          });
        } catch {
          await driver.executeScript(`window.resizeTo(480, 900)`);
        }
        await openVaultFile(driver, E2E_FILES.heatmapReading);
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "zh-Hant-en";
          app.workspace.leftSplit?.collapse?.();
          app.workspace.rightSplit?.collapse?.();
          return plugin.refreshAll();
        `);
        let ready = {};
        try {
          await driver.wait(async () => {
            ready = await driver.executeScript(`
              const nodes = [...document.querySelectorAll('[data-testid="atomic-heatmap"]')];
              const heatmap = nodes.sort(
                (a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width,
              )[0];
              const caption = heatmap?.querySelector(".atomic-heat-foot > .atomic-caption");
              const scroll = heatmap?.querySelector('[data-testid="atomic-heatmap-scroll"]');
              return {
                text: caption ? caption.textContent : "",
                width: heatmap ? Math.round(heatmap.getBoundingClientRect().width) : 0,
                scrollLeft: scroll ? scroll.scrollLeft : 0,
                count: nodes.length,
              };
            `);
            return String(ready.text).includes("按時長") && ready.width >= 280 && ready.width <= 520 && ready.scrollLeft > 0;
          }, 8000);
        } catch (error) {
          throw new Error(`${error.message} last=${JSON.stringify(ready)}`);
        }
        await saveScreenshot(driver, "heatmap-foot-narrow-live");
        const report = await driver.executeScript(`
          const nodes = [...document.querySelectorAll('[data-testid="atomic-heatmap"]')];
          const heatmap = nodes.sort(
            (a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width,
          )[0];
          const foot = heatmap.querySelector(".atomic-heat-foot");
          const captions = [...foot.querySelectorAll(".atomic-caption")];
          const scroll = heatmap.querySelector('[data-testid="atomic-heatmap-scroll"]');
          const today = heatmap.querySelector('[data-testid="atomic-heatmap-today"]');
          const footBox = foot.getBoundingClientRect();
          const legend = foot.querySelector(".atomic-heat-legend").getBoundingClientRect();
          const duration = captions[0].getBoundingClientRect();
          const ring = 2.75;
          const scrollBox = scroll.getBoundingClientRect();
          const todayBox = today.getBoundingClientRect();
          return {
            heatWidth: Math.round(heatmap.getBoundingClientRect().width),
            overflow: Math.round(foot.scrollWidth - foot.clientWidth),
            fontSize: Number.parseFloat(getComputedStyle(captions[0]).fontSize),
            whiteSpace: getComputedStyle(captions[0]).whiteSpace,
            heights: captions.map((node) => Math.round(node.getBoundingClientRect().height)),
            overlap: duration.right > legend.left + 1,
            durationClipped: duration.left < footBox.left - 1 || duration.right > footBox.right + 1,
            legendClipped: legend.right > footBox.right + 1 || legend.left < footBox.left - 1,
            ringLeft: todayBox.left - ring - scrollBox.left,
            ringRight: scrollBox.right - (todayBox.right + ring),
            ringTop: todayBox.top - ring - scrollBox.top,
            ringBottom: scrollBox.bottom - (todayBox.bottom + ring),
          };
        `);
        assert.ok(
          report.heatWidth >= 280 && report.heatWidth <= 520,
          `heatmap should be a phone pane, was ${report.heatWidth}px ${JSON.stringify(report)}`,
        );
        assert.equal(report.whiteSpace, "nowrap");
        assert.ok(
          report.fontSize < 12,
          `narrow caption font should shrink, was ${report.fontSize}px ${JSON.stringify(report)}`,
        );
        assert.ok(report.overflow <= 1, `footer overflow ${JSON.stringify(report)}`);
        assert.ok(report.heights.every((height) => height <= 16), `caption wrapped: ${report.heights}`);
        assert.equal(report.overlap, false);
        assert.equal(report.durationClipped, false);
        assert.equal(report.legendClipped, false);
        assert.ok(report.ringLeft >= -0.5, `today ring clipped on the left (${report.ringLeft})`);
        assert.ok(report.ringRight >= -0.5, `today ring clipped on the right (${report.ringRight})`);
        assert.ok(report.ringTop >= -0.5, `today ring clipped on the top (${report.ringTop})`);
        assert.ok(report.ringBottom >= -0.5, `today ring clipped on the bottom (${report.ringBottom})`);
      } finally {
        await restoreDesktopPointer(driver, desktopViewport);
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "en";
          return plugin.refreshAll();
        `);
      }
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
      const propertyUi = await driver.executeScript(`
        const names = ["location", "weight_unit"];
        return names.map((name) => {
          const select = document.querySelector(
            'select[data-testid="atomic-property-select"][data-property="' + name + '"]',
          );
          const value = select && select.closest(".metadata-property-value");
          if (!select || !value) return { name, missing: true };
          const style = getComputedStyle(select);
          const natives = [...value.children].filter((el) => el !== select);
          const shown = natives.filter((el) => {
            const box = el.getBoundingClientRect();
            return getComputedStyle(el).display !== "none" && box.width > 1 && box.height > 1;
          }).map((el) => ({
            tag: el.tagName,
            className: el.className,
            display: getComputedStyle(el).display,
            text: (el.textContent || "").trim().slice(0, 40),
            width: Math.round(el.getBoundingClientRect().width),
          }));
          return {
            name,
            shown,
            background: style.backgroundColor,
            borderTop: style.borderTopWidth,
          };
        });
      `);
      for (const row of propertyUi) {
        assert.equal(row.missing, undefined, `${row.name} select is missing`);
        assert.deepEqual(row.shown, [], `${row.name} native value is still on screen`);
        assert.equal(row.borderTop, "0px", `${row.name} select has no box`);
        assert.match(
          String(row.background),
          /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|transparent/,
          `${row.name} select reads as the property value`,
        );
      }
      await driver.executeScript(`
        document.querySelector(
          'select[data-testid="atomic-property-select"][data-property="location"]',
        )?.scrollIntoView({ block: "center", inline: "nearest" });
      `);
      await shot(driver, "property-selects");
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
      const sessionLayout = await driver.executeScript(`
        const gym = document.querySelector('[data-testid="atomic-gym-log"]');
        const fields = gym?.querySelector(".atomic-gym-log-fields");
        const timer = document.querySelector('[data-testid="atomic-timer"]');
        const note = gym?.closest(".cm-sizer, .markdown-preview-sizer");
        if (!gym || !fields || !timer) return null;
        const cols = getComputedStyle(fields).gridTemplateColumns.split(" ").filter(Boolean);
        const gymBox = gym.getBoundingClientRect();
        const timerBox = timer.getBoundingClientRect();
        const select = document.querySelector('[data-testid="atomic-gym-log-exercise"]');
        let exerciseFits = false;
        if (select) {
          const previous = select.value;
          const probe = document.createElement("option");
          probe.value = "__layout_probe__";
          probe.text = "Cable front raise · Shoulder";
          select.add(probe);
          select.value = probe.value;
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          ctx.font = getComputedStyle(select).font;
          const textW = ctx.measureText(probe.text).width;
          exerciseFits = select.getBoundingClientRect().width + 1 >= textW;
          select.value = previous;
          probe.remove();
        }
        return {
          gymW: gym.clientWidth,
          timerW: timerBox.width,
          timerH: timerBox.height,
          gymH: gymBox.height,
          gap: gymBox.left - timerBox.right,
          cols: cols.length,
          noteW: note?.clientWidth || 0,
          sameRow: Math.abs(gymBox.top - timerBox.top) < 48,
          exerciseFits,
        };
      `);
      assert.ok(sessionLayout, "timer and gym log should be measurable");
      assert.equal(
        sessionLayout.exerciseFits,
        true,
        `exercise name should stay fully visible: ${JSON.stringify(sessionLayout)}`,
      );
      if (sessionLayout.gymW > 560) {
        assert.ok(
          sessionLayout.cols >= 4,
          `gym fields should share one row when the log is wide: ${JSON.stringify(sessionLayout)}`,
        );
      }
      if (sessionLayout.noteW >= 1280) {
        assert.equal(
          sessionLayout.sameRow,
          false,
          `timer and gym log should stay on separate rows: ${JSON.stringify(sessionLayout)}`,
        );
      }

      const desktopViewport = await driver.executeScript(
        `return { width: window.innerWidth, height: window.innerHeight }`,
      );
      try {
        try {
          await driver.sendDevToolsCommand("Emulation.setDeviceMetricsOverride", {
            width: 900,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false,
          });
        } catch {
          await driver.executeScript(`window.resizeTo(900, 900)`);
        }
        await driver.executeScript(`
          app.workspace.leftSplit?.collapse?.();
          app.workspace.rightSplit?.collapse?.();
        `);
        await driver.wait(async () => {
          const width = await driver.executeScript(`
            const timer = document.querySelector('[data-testid="atomic-timer"]');
            const note = timer?.closest(".cm-sizer, .markdown-preview-sizer");
            return note?.clientWidth || 0;
          `);
          return width > 0 && width < 1280;
        }, 8000);
        const stacked = await driver.executeScript(`
          const timer = document.querySelector('[data-testid="atomic-timer"]');
          const gym = document.querySelector('[data-testid="atomic-gym-log"]');
          const compose = document.querySelector(".atomic-cue-log-compose");
          const content = timer?.closest(".cm-content, .markdown-preview-section");
          if (!timer || !gym || !content) return null;
          const timerBox = timer.getBoundingClientRect();
          const gymBox = gym.getBoundingClientRect();
          const contentBox = content.getBoundingClientRect();
          const composeBox = compose?.getBoundingClientRect();
          return {
            timerW: timerBox.width,
            gymW: gymBox.width,
            timerLeft: timerBox.left,
            gymLeft: gymBox.left,
            timerRight: timerBox.right,
            gymRight: gymBox.right,
            contentLeft: contentBox.left,
            contentRight: contentBox.right,
            contentW: contentBox.width,
            composeW: composeBox ? composeBox.width : 0,
            sameRow: Math.abs(gymBox.top - timerBox.top) < 48,
          };
        `);
        assert.ok(stacked, "stacked timer and gym log should be measurable");
        assert.equal(stacked.sameRow, false, `timer and gym should stack: ${JSON.stringify(stacked)}`);
        assert.ok(
          Math.abs(stacked.timerW - stacked.gymW) <= 2,
          `stacked timer and gym row should share a width: ${JSON.stringify(stacked)}`,
        );
        assert.ok(
          Math.abs(stacked.timerLeft - stacked.gymLeft) <= 2 &&
            Math.abs(stacked.timerRight - stacked.gymRight) <= 2,
          `stacked timer and gym row should share left and right edges: ${JSON.stringify(stacked)}`,
        );
        assert.ok(
          Math.abs(stacked.timerLeft - stacked.contentLeft) <= 12 &&
            Math.abs(stacked.timerRight - stacked.contentRight) <= 12,
          `stacked cards should fill the note width: ${JSON.stringify(stacked)}`,
        );
        assert.ok(
          Math.abs(stacked.composeW - stacked.gymW) <= 8,
          `stacked reminder composer should match the gym row: ${JSON.stringify(stacked)}`,
        );
      } finally {
        await restoreDesktopPointer(driver, desktopViewport);
      }

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

  it("shows a short What's new notice after a version change and does not nag", async () => {
    await check(driver, "update-note", async () => {
      try {
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "en";
          plugin.settings.lastSeenUpdateNoteVersion = "0.0.0";
          plugin.promptUpdateNoteIfNeeded();
        `);
        await waitCss(driver, '[data-testid="atomic-update-note-notice"]');
        const englishNotice = await waitForNotice(driver, "What's new in");
        assert.match(String(englishNotice), /dashboard/i);
        assert.match(String(englishNotice), /book shelf/);
        const leftoverModals = await driver.findElements(
          By.css('[data-testid="atomic-update-note-modal"]'),
        );
        assert.equal(leftoverModals.length, 0);
        const current = await driver.executeScript(
          `return app.plugins.getPlugin("atomic-tracker").manifest.version`,
        );
        await driver.wait(async () => {
          const seen = await driver.executeScript(
            `return app.plugins.getPlugin("atomic-tracker").settings.lastSeenUpdateNoteVersion`,
          );
          return seen === current;
        }, 8000);

        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "zh-Hant-en";
          plugin.settings.lastSeenUpdateNoteVersion = "0.0.0";
          plugin.promptUpdateNoteIfNeeded();
        `);
        const cantoneseNotice = await waitForNotice(driver, "書架");
        assert.match(String(cantoneseNotice), /cue card/);
        assert.match(String(cantoneseNotice), /Dashboard/);
        assert.match(String(cantoneseNotice), /更新說明/);
        assert.doesNotMatch(String(cantoneseNotice), /What's new in/);

        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "en";
        `);
        await driver.wait(async () => {
          const seen = await driver.executeScript(
            `return app.plugins.getPlugin("atomic-tracker").settings.lastSeenUpdateNoteVersion`,
          );
          return seen === current;
        }, 8000);
        await driver.executeScript(`
          document.querySelectorAll('[data-testid="atomic-update-note-notice"]').forEach((el) => el.remove());
          app.plugins.getPlugin("atomic-tracker").promptUpdateNoteIfNeeded();
        `);
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-update-note-notice"]'),
        );
        assert.equal(leftover.length, 0);
      } finally {
        await driver.executeScript(`
          const plugin = app.plugins.getPlugin("atomic-tracker");
          plugin.settings.language = "en";
          return plugin.refreshAll();
        `);
      }
    });
  });

  it("opens a book cover on click, then the note", async () => {
    await check(driver, "book-cover-open", async () => {
      await restoreDesktopPointer(driver);
      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(
        driver,
        '.workspace-leaf.mod-active [data-testid="atomic-book"][data-title="Currently Reading"]',
      );
      const pointer = await driver.executeScript(`
        return {
          hover: window.matchMedia("(hover: hover) and (pointer: fine), (pointer: none)").matches,
          reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
      `);
      assert.equal(
        pointer.hover,
        true,
        `a desktop pointer opens the cover ${JSON.stringify(pointer)}`,
      );
      const ribbon = await driver.executeScript(`
        const book = document.querySelector(
          '.workspace-leaf.mod-active [data-testid="atomic-book"][data-title="Currently Reading"]'
        );
        const tab = book?.querySelector(".atomic-book-ribbon");
        if (!book || !tab) return null;
        const bookBox = book.getBoundingClientRect();
        const tabBox = tab.getBoundingClientRect();
        const scroll = book.closest('[data-testid="atomic-bookshelf-scroll"]');
        const scrollBox = scroll?.getBoundingClientRect();
        const style = getComputedStyle(tab);
        return {
          hang: tabBox.bottom - bookBox.bottom,
          opacity: style.opacity,
          height: tabBox.height,
          inside: scrollBox ? tabBox.bottom <= scrollBox.bottom + 1 : false,
        };
      `);
      assert.ok(ribbon, "a reading book should paint a bookmark");
      assert.ok(ribbon.height > 8, `bookmark should have a tail ${JSON.stringify(ribbon)}`);
      assert.notEqual(ribbon.opacity, "0");
      assert.ok(
        ribbon.hang > 8,
        `bookmark should stick out below a closed book ${JSON.stringify(ribbon)}`,
      );
      assert.equal(
        ribbon.inside,
        true,
        `bookmark tail should stay inside the shelf scroll ${JSON.stringify(ribbon)}`,
      );
      const clickBook = () => driver.executeScript(`
        document.querySelector(
          '.workspace-leaf.mod-active [data-testid="atomic-book"][data-title="Currently Reading"]'
        ).click();
      `);
      await clickBook();
      if (pointer.reduced) {
        await driver.wait(async () => {
          const path = await driver.executeScript(
            `return app.workspace.getActiveFile()?.path || ""`,
          );
          return path === E2E_FILES.readingCurrent;
        }, 8000);
        return;
      }
      const opened = await driver.executeScript(`
        const book = document.querySelector(
          '.workspace-leaf.mod-active [data-testid="atomic-book"][data-title="Currently Reading"]'
        );
        const face = book?.querySelector(".atomic-book-face");
        const cover = book?.querySelector(".atomic-book-cover");
        return {
          cover: book?.classList.contains("is-cover-open") === true,
          className: book?.className || "",
          path: app.workspace.getActiveFile()?.path || "",
          coverText: (cover?.textContent || "").trim(),
          coverClass: cover?.className || "",
          coverTag: cover?.tagName || "",
          coverOpacity: cover ? getComputedStyle(cover).opacity : "",
          filter: face ? getComputedStyle(face).filter : "",
          books: document.querySelectorAll('[data-testid="atomic-book"]').length,
        };
      `);
      assert.equal(
        opened.cover,
        true,
        `the first click opens the cover ${JSON.stringify({ pointer, opened })}`,
      );
      assert.doesNotMatch(
        String(opened.filter),
        /invert\(/,
        `opened cover keeps the original colors ${JSON.stringify(opened)}`,
      );
      assert.match(
        String(opened.filter),
        /blur\(/,
        `opened cover should blur the original face ${JSON.stringify(opened)}`,
      );
      assert.equal(opened.coverOpacity, "1", "the original cover stays visible when open");
      assert.match(
        opened.coverText,
        /Currently Reading/,
        `open cover should keep the title ${JSON.stringify(opened)}`,
      );
      assert.equal(opened.path, E2E_FILES.bookshelfAll);
      await clickBook();
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path === E2E_FILES.readingCurrent;
      }, 8000);
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
      const scaled = await measureShelfRow(driver, "1.5");
      assert.ok(scaled, "scaled shelf should report a row");
      assert.ok(scaled.perRow >= 3, `a row keeps at least three books ${JSON.stringify(scaled)}`);
      assert.ok(
        scaled.bookWidth <= 144,
        `scale 1.5 does not grow past 144px ${JSON.stringify(scaled)}`,
      );
      assert.ok(
        scaled.threeNeeded <= scaled.frameWidth,
        `three books stay on the row ${JSON.stringify(scaled)}`,
      );
      const fourAtScale = 28 + 4 * 144 + 3 * 12;
      if (scaled.frameWidth >= fourAtScale) {
        assert.equal(scaled.bookWidth, 144);
        assert.ok(
          scaled.perRow > 3,
          `a wide pane shows more than three books at scale 1.5 ${JSON.stringify(scaled)}`,
        );
      }
      assert.ok(
        Math.abs(scaled.bookHeight / scaled.bookWidth - 150 / 96) < 0.02,
        `cover aspect ratio stays 96:150 ${JSON.stringify(scaled)}`,
      );

      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '.workspace-leaf.mod-active .markdown-source-view img.atomic-book-cover');
      const editCover = await measureCoverInset(driver, "edit");
      assert.ok(editCover?.img, "edit mode should paint a cover image");
      assertCoverFillsBook(editCover, "edit");

      await setMarkdownMode(driver, "preview");
      await waitCss(driver, ".workspace-leaf.mod-active .markdown-preview-view img.atomic-book-cover");
      const readingCover = await measureCoverInset(driver, "reading");
      assert.equal(readingCover?.preview, true);
      assertCoverFillsBook(readingCover, "reading");
      await shot(driver, "shelf-reading-mode");
      await setMarkdownMode(driver, "source");
    });
  });

  it("renders session blocks in reading mode instead of the pending bar", async () => {
    await check(driver, "reading-mode-blocks", async () => {
      const path = "atomics/exercise/Golf/2026/2026-09-12.md";
      const bilingual = `---
type: session
date: 2026-09-12
activity: golf
duration_min:
timer_started_at:
location:
focus: []
club: []
felt:
---

# ⛳ Golf / 高爾夫 — 2026-09-12

${E2E_TIMER_FENCE}

## 💡 Reminders / 提醒

${E2E_CUE_LOG_FENCE}
`;
      const written = await driver.executeAsyncScript(
        `
        const path = arguments[0];
        const markdown = arguments[1];
        const done = arguments[2];
        const existing = app.vault.getAbstractFileByPath(path);
        const write = existing
          ? app.vault.modify(existing, markdown)
          : app.vault.create(path, markdown);
        write.then(
          () => done({ ok: true }),
          (err) => done({ ok: false, error: String(err) }),
        );
        `,
        path,
        bilingual,
      );
      assert.equal(written?.ok, true, written?.error);

      await openVaultFile(driver, path);
      await setMarkdownMode(driver, "preview");
      await waitCss(driver, ".markdown-preview-view [data-testid='atomic-timer']");
      await waitCss(driver, ".markdown-preview-view [data-testid='atomic-cue-log']");

      const state = await driver.executeScript(`
        const preview = document.querySelector(".markdown-preview-view");
        return {
          pending: preview?.querySelectorAll(".atomic-block-pending").length ?? -1,
          timer: Boolean(preview?.querySelector("[data-testid='atomic-timer']")),
          cueLog: Boolean(preview?.querySelector("[data-testid='atomic-cue-log']")),
        };
      `);
      assert.equal(state.timer, true);
      assert.equal(state.cueLog, true);
      assert.equal(state.pending, 0, `reading mode left pending shells: ${JSON.stringify(state)}`);

      const saved = await driver.executeAsyncScript(
        `
        const path = arguments[0];
        const done = arguments[1];
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) {
          done({ ok: false, error: "missing " + path });
          return;
        }
        app.vault.read(file).then(
          (text) => done({ ok: true, text }),
          (err) => done({ ok: false, error: String(err) }),
        );
        `,
        path,
      );
      assert.equal(saved?.ok, true, saved?.error);
      assert.match(String(saved.text), /⛳ Golf \/ 高爾夫 — 2026-09-12/);
      assert.match(String(saved.text), /💡 Reminders \/ 提醒/);

      await shot(driver, "reading-mode-blocks");
      await setMarkdownMode(driver, "source");
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
        const enabledLabel = await row.findElement(
          By.css('[data-testid="atomic-setting-enabled-label"]'),
        );
        assert.equal(await enabledLabel.getText(), "Enabled");
        const folderLabel = await row.findElement(
          By.css('[data-testid="atomic-setting-folder-label"]'),
        );
        assert.equal(await folderLabel.getText(), "Folder");
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
        const shadeLabel = await colors.findElement(
          By.css('[data-testid="atomic-setting-shades-label"]'),
        );
        assert.equal(await shadeLabel.getText(), "Heatmap shades");
      }

      const gymRow = await driver.findElement(
        By.css('[data-testid="atomic-setting-activity"][data-activity-id="gym"]'),
      );
      const cuesLabel = await gymRow.findElement(
        By.css('[data-testid="atomic-setting-cues-label"]'),
      );
      assert.equal(await cuesLabel.getText(), "Cues");
      const readingCues = await driver.findElements(
        By.css(
          '[data-testid="atomic-setting-activity"][data-activity-id="reading"] [data-testid="atomic-setting-cues"]',
        ),
      );
      assert.equal(readingCues.length, 0);

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
