#!/usr/bin/env node
/**
 * Capture the 1.5.0 redesign mock into README heroes and user-guide clips.
 *
 * The mock already draws the desktop window and the phone. This script
 * screenshots those frames. It does not redraw the plugin UI.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOCK = join(ROOT, "design/1.5.0-revamp/atomic-redesign-mock.html");
const SHOTS = "/tmp/atomic-revamp-shots";
const IMAGES = join(ROOT, "docs/images");

const PREPARE = `
  const style = document.getElementById("revamp-capture-style") || document.createElement("style");
  style.id = "revamp-capture-style";
  style.textContent = \`
    .play-bar { display: none !important; }
    body.is-play, .play-stage { background: #F5F2EC !important; }
    .play-stage { padding: 0 !important; margin: 0 !important; align-items: flex-start; justify-content: flex-start; }
    .play-stage .ob-content,
    .play-stage .ob-mcontent,
    .atomic-shelf-scroll,
    .atomic-heat-scroll { scrollbar-width: none !important; }
    .play-stage .ob-content::-webkit-scrollbar,
    .play-stage .ob-mcontent::-webkit-scrollbar,
    .atomic-shelf-scroll::-webkit-scrollbar,
    .atomic-heat-scroll::-webkit-scrollbar {
      width: 0 !important; height: 0 !important; display: none !important;
    }
    .atomic-btn.is-hover { background: var(--atomic-fill-3); }
  \`;
  document.head.append(style);
  const bar = document.querySelector(".play-bar");
  if (bar) bar.style.display = "none";
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serveMock() {
  const html = readFileSync(MOCK);
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(html);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/atomic-redesign-mock.html`,
      });
    });
  });
}

async function waitReady(driver) {
  await driver.wait(async () => driver.executeScript("return window.__ready === true"), 20000);
  await driver.executeScript(PREPARE);
}

async function show(driver, tab, view, theme = "light") {
  await driver.executeScript(
    "window.PLAY.set({ tab: arguments[0], view: arguments[1], theme: arguments[2], motion: 'full', lang: 'en' });",
    tab,
    view,
    theme,
  );
  await driver.executeScript(PREPARE);
  await sleep(60);
}

async function run(driver, script, ...args) {
  return driver.executeScript(script, ...args);
}

const INSERT_SHELF = `
  const touch = arguments[0] === true;
  const host = document.querySelector(".ob-content, .ob-mcontent-inner");
  if (!host || host.querySelector(".atomic-shelf")) return;
  const shelf = window.UI.shelf({});
  const heading = host.querySelector(".ob-h2");
  if (heading) heading.after(shelf);
  else host.prepend(shelf);
  window.INTERACT.wireShelf(shelf, { touch });
`;

const INSERT_SHELF_TOUCH = `
  const host = document.querySelector(".ob-mcontent-inner, .ob-content");
  if (!host || host.querySelector(".atomic-shelf")) return;
  const shelf = window.UI.shelf({});
  const heading = host.querySelector(".ob-h2");
  if (heading) heading.after(shelf);
  else host.prepend(shelf);
  window.INTERACT.wireShelf(shelf, { touch: true });
`;

const LOCK_DESKTOP = `
  const width = arguments[0];
  const height = arguments[1];
  const index = arguments[2] || 0;
  const wins = [...document.querySelectorAll(".ob-window")];
  wins.forEach((win, i) => { win.style.display = i === index ? "" : "none"; });
  const win = wins[index];
  win.style.setProperty("--ob-w", width + "px");
  win.style.width = width + "px";
  win.style.height = height + "px";
  const content = win.querySelector(".ob-content");
  if (content) content.scrollTop = 0;
  const rect = win.getBoundingClientRect();
  return { cssWidth: rect.width, cssHeight: rect.height };
`;

const LOCK_PHONE = `
  const phone = document.querySelector(".ob-phone");
  phone.style.transform = "none";
  const fit = phone.parentElement;
  if (fit) {
    fit.style.width = "412px";
    fit.style.height = "866px";
    fit.style.transform = "none";
    fit.style.overflow = "visible";
  }
  const content = phone.querySelector(".ob-mcontent");
  if (content) content.scrollTop = 0;
  const rect = phone.getBoundingClientRect();
  return { cssWidth: rect.width, cssHeight: rect.height };
`;

const CLIP_SHELF = `
  document.querySelectorAll(".atomic-shelf-scroll").forEach((scroller) => {
    const port = scroller.getBoundingClientRect();
    scroller.querySelectorAll(".atomic-book").forEach((book) => {
      const rect = book.getBoundingClientRect();
      const clipped = rect.left < port.left - 1 || rect.right > port.right - 1;
      book.style.visibility = clipped ? "hidden" : "";
    });
  });
`;

const FOCUS_TODAY = `
  document.querySelectorAll(".atomic-shelf, .atomic-actions, .atomic-heatmap, .ob-p").forEach((node) => {
    node.style.display = "none";
  });
  const scroller = document.querySelector(".ob-content");
  if (scroller) scroller.scrollTop = 0;
`;

const PREVIEW_BOOK = `
  const scroller = document.querySelector(".atomic-shelf-scroll");
  const books = [...scroller.querySelectorAll(".atomic-book")];
  const port = scroller.getBoundingClientRect();
  let pick = null;
  for (const book of books) {
    const rect = book.getBoundingClientRect();
    if (rect.width < 30) continue;
    if (rect.left >= port.left - 2 && rect.right <= port.right - 2) pick = book;
  }
  if (!pick) return false;
  pick.classList.add("is-preview");
  pick.style.setProperty("--px", "0.28");
  pick.style.setProperty("--py", "-0.22");
  pick.style.setProperty("--sx", "78%");
  pick.style.setProperty("--sy", "28%");
  const read = document.querySelector(".atomic-shelf-readout");
  const book = window.ATOMIC_DATA.books[Number(pick.getAttribute("data-i"))];
  window.UI.fillShelfReadout(read, book, false);
  return true;
`;

const CROP_OF = `
  const index = arguments[0] || 0;
  const selector = arguments[1];
  const pad = arguments[2] || 28;
  const endSelector = arguments[3] || "";
  const win = document.querySelectorAll(".ob-window")[index];
  const target = win.querySelector(selector);
  const end = endSelector ? win.querySelector(endSelector) : target;
  const winRect = win.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  return {
    cropTop: Math.max(0, targetRect.top - winRect.top - pad),
    cropBottom: Math.min(winRect.height, endRect.bottom - winRect.top + pad),
  };
`;

async function saveElement(driver, css, index, file) {
  const elements = await driver.findElements(By.css(css));
  if (!elements[index]) throw new Error(`missing ${css} [${index}] for ${file}`);
  const png = await elements[index].takeScreenshot();
  writeFileSync(file, Buffer.from(png, "base64"));
}

async function setViewport(driver, width, height) {
  await driver.manage().window().setRect({ width, height, x: 0, y: 0 });
  await sleep(500);
  await driver.executeScript(PREPARE);
}

async function capture() {
  mkdirSync(SHOTS, { recursive: true });
  const { server, url } = await serveMock();
  const options = new chrome.Options();
  options.setChromeBinaryPath("/usr/bin/google-chrome");
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=1460,1000",
  );
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  const manifest = { shots: {} };
  try {
    await driver.get(url);
    await waitReady(driver);
    await setViewport(driver, 1460, 1000);

    async function desktop(name, tab, scene, width, height, index = 0) {
      await show(driver, tab, "desktop");
      const metrics = await run(driver, LOCK_DESKTOP, width, height, index);
      if (scene) await run(driver, scene);
      await run(driver, CLIP_SHELF);
      await sleep(80);
      const file = join(SHOTS, `${name}.png`);
      await saveElement(driver, ".ob-window", index, file);
      manifest.shots[name] = { file, ...metrics };
      console.log("shot", name, metrics.cssWidth, metrics.cssHeight);
    }

    await desktop("daily-desktop", "daily", INSERT_SHELF, 1240, 820);
    await desktop("daily-desktop-hover", "daily", `${INSERT_SHELF}\n${PREVIEW_BOOK}`, 1240, 820);
    await desktop("dashboard-desktop", "dashboard", "", 1280, 820);
    await desktop("cues-desktop", "cues", "", 1180, 760);
    await desktop(
      "cues-desktop-hover",
      "cues",
      `document.querySelectorAll(".atomic-cue-card")[1].classList.add("is-preview");`,
      1180,
      760,
    );
    await desktop(
      "cues-desktop-open",
      "cues",
      `document.querySelector(".atomic-cue-card").click();`,
      1180,
      760,
    );
    await sleep(650);
    {
      const file = join(SHOTS, "cues-desktop-open.png");
      await saveElement(driver, ".ob-window", 0, file);
      const metrics = await run(driver, "const r = document.querySelector('.ob-window').getBoundingClientRect(); return { cssWidth: r.width, cssHeight: r.height };");
      manifest.shots["cues-desktop-open"] = { file, ...metrics };
      console.log("shot cues-desktop-open");
    }

    await desktop("shelf-desktop", "shelf", "", 1280, 720);
    await desktop(
      "shelf-desktop-hover",
      "shelf",
      PREVIEW_BOOK,
      1280,
      720,
    );

    await show(driver, "timer", "desktop");
    await run(driver, LOCK_DESKTOP, 980, 640, 0);
    await run(
      driver,
      `
        const slot = document.querySelector(".atomic-timer");
        if (slot) slot.replaceWith(window.UI.timer("idle", { total: 40 }));
      `,
    );
    await saveNamed(driver, manifest, "timer-idle", ".ob-window", 0, ".atomic-timer");
    await run(
      driver,
      `document.querySelector(".atomic-timer").replaceWith(window.UI.timer("running", { total: 40, clock: "12:47" }));`,
    );
    await saveNamed(driver, manifest, "timer-running", ".ob-window", 0, ".atomic-timer");
    await run(
      driver,
      `document.querySelector(".atomic-timer").replaceWith(window.UI.timer("logged", { total: 53 }));`,
    );
    await saveNamed(driver, manifest, "timer-logged", ".ob-window", 0, ".atomic-timer");

    await show(driver, "timer", "desktop");
    await run(driver, LOCK_DESKTOP, 1080, 760, 1);
    await saveNamed(driver, manifest, "gym-rest", ".ob-window", 1, ".atomic-gym-log|.ob-table");
    await run(driver, `document.querySelector('[data-anchor="gl-add"]').click();`);
    await sleep(40);
    await saveNamed(driver, manifest, "gym-added", ".ob-window", 1, ".atomic-gym-log|.ob-table");

    await show(driver, "daily", "desktop");
    await run(driver, LOCK_DESKTOP, 1240, 860, 0);
    await run(driver, INSERT_SHELF, false);
    await run(
      driver,
      `
        const actions = document.querySelector(".atomic-actions");
        const scroller = actions.closest(".ob-content");
        const head = document.querySelector(".ob-viewhead");
        scroller.scrollTop += actions.getBoundingClientRect().top - head.getBoundingClientRect().bottom - 12;
      `,
    );
    await saveNamed(driver, manifest, "actions-rest", ".ob-window", 0, ".atomic-actions");
    await run(
      driver,
      `document.querySelectorAll(".atomic-actions .atomic-btn")[1].classList.add("is-hover");`,
    );
    await saveNamed(driver, manifest, "actions-hover", ".ob-window", 0, ".atomic-actions");

    await run(
      driver,
      `
        const heat = document.querySelector(".atomic-heatmap");
        const scroller = heat.closest(".ob-content");
        const head = document.querySelector(".ob-viewhead");
        scroller.scrollTop += heat.getBoundingClientRect().top - head.getBoundingClientRect().bottom - 8;
      `,
    );
    await saveNamed(driver, manifest, "heat-rest", ".ob-window", 0, ".atomic-heatmap");
    await run(
      driver,
      `
        const heat = document.querySelector(".atomic-heatmap");
        const cell = [...heat.querySelectorAll(".atomic-heat-cell[data-read]")].find((node) => /min$/.test(node.getAttribute("data-read")));
        cell.classList.add("is-preview");
        const read = heat.querySelector(".atomic-readout");
        read.textContent = cell.getAttribute("data-read");
        read.classList.add("is-live");
      `,
    );
    await saveNamed(driver, manifest, "heat-hover", ".ob-window", 0, ".atomic-heatmap");
    await run(driver, FOCUS_TODAY);
    await saveNamed(driver, manifest, "today-rest", ".ob-window", 0, ".atomic-today");
    await run(
      driver,
      `document.querySelector(".atomic-today .atomic-recent-row").classList.add("is-preview");`,
    );
    await saveNamed(driver, manifest, "today-hover", ".ob-window", 0, ".atomic-today");

    await show(driver, "dashboard", "desktop");
    await run(driver, LOCK_DESKTOP, 1280, 860, 0);
    await saveNamed(driver, manifest, "dash-rest", ".ob-window", 0, ".atomic-chart");
    await run(
      driver,
      `
        const col = document.querySelector('.atomic-chart-col[data-m="4"]');
        col.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      `,
    );
    await saveNamed(driver, manifest, "dash-hover", ".ob-window", 0, ".atomic-chart");

    await setViewport(driver, 520, 1040);
    async function phone(name, tab, scene) {
      await show(driver, tab, "phone");
      const metrics = await run(driver, LOCK_PHONE);
      if (scene) await run(driver, scene);
      await run(driver, CLIP_SHELF);
      await sleep(80);
      const file = join(SHOTS, `${name}.png`);
      await saveElement(driver, ".ob-phone", 0, file);
      manifest.shots[name] = { file, ...metrics };
      console.log("shot", name, metrics.cssWidth, metrics.cssHeight);
    }
    await phone("daily-phone", "daily", INSERT_SHELF_TOUCH);
    await phone("dashboard-phone", "dashboard", "");
    await phone("cues-phone", "cues", "");
    await phone("cues-phone-open", "cues", `document.querySelector(".atomic-cue-card").click();`);
    await sleep(650);
    {
      const file = join(SHOTS, "cues-phone-open.png");
      await saveElement(driver, ".ob-phone", 0, file);
      const metrics = await run(driver, "const r = document.querySelector('.ob-phone').getBoundingClientRect(); return { cssWidth: r.width, cssHeight: r.height };");
      manifest.shots["cues-phone-open"] = { file, ...metrics };
      console.log("shot cues-phone-open");
    }
    await phone("shelf-phone", "shelf", "");
  } finally {
    await driver.quit();
    server.close();
  }
  const manifestPath = join(SHOTS, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  await finish(manifestPath);
}

async function saveNamed(driver, manifest, name, css, index, cropSelector) {
  const file = join(SHOTS, `${name}.png`);
  await saveElement(driver, css, index, file);
  const metrics = await run(
    driver,
    `const node = document.querySelectorAll(arguments[0])[arguments[1]]; const r = node.getBoundingClientRect(); return { cssWidth: r.width, cssHeight: r.height };`,
    css,
    index,
  );
  let crop = null;
  if (cropSelector) {
    const [start, end] = cropSelector.split("|");
    crop = await run(driver, CROP_OF, index, start, 36, end || "");
  }
  manifest.shots[name] = { file, ...metrics, ...(crop || {}) };
  console.log("shot", name, crop ? `crop ${Math.round(crop.cropTop)}-${Math.round(crop.cropBottom)}` : "");
}

function finish(manifestPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [join(ROOT, "scripts/finish-revamp-docs.py"), manifestPath], {
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`finish-revamp-docs.py exited ${code}`));
    });
  });
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
