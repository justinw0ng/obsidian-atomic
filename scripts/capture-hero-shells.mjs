/**
 * Screenshot the redesign window and phone with a magenta content hole.
 *
 * Live note shots are pasted into that hole, then composed with the same
 * banner layout as the daily and dashboard heroes.
 *
 * Run: node scripts/capture-hero-shells.mjs
 */
import { createServer } from "node:http";
import { accessSync, constants, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, By } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOCK = join(ROOT, "design/1.5.0-revamp/atomic-redesign-mock.html");
const OUT_DIR = process.env.ATOMIC_HERO_SHELLS || "/tmp/atomic-hero-shells";
const CHROME =
  process.env.ATOMIC_CHROME ||
  (existsChrome("/opt/google/chrome/chrome")
    ? "/opt/google/chrome/chrome"
    : "/usr/bin/google-chrome");

const KEY = "#ff00ff";

const PREPARE = `
  const style = document.getElementById("hero-shell-style") || document.createElement("style");
  style.id = "hero-shell-style";
  style.textContent = \`
    .play-bar { display: none !important; }
    body.is-play, .play-stage { background: #F5F2EC !important; }
    .play-stage { padding: 0 !important; margin: 0 !important; align-items: flex-start; justify-content: flex-start; }
    .play-stage .ob-content,
    .play-stage .ob-mcontent { scrollbar-width: none !important; }
    .play-stage .ob-content::-webkit-scrollbar,
    .play-stage .ob-mcontent::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
  \`;
  document.head.append(style);
`;

const LOCK_DESKTOP = `
  const width = arguments[0];
  const height = arguments[1];
  const wins = [...document.querySelectorAll(".ob-window")];
  wins.forEach((win, i) => { win.style.display = i === 0 ? "" : "none"; });
  const win = wins[0];
  win.style.setProperty("--ob-w", width + "px");
  win.style.width = width + "px";
  win.style.height = height + "px";
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
  const rect = phone.getBoundingClientRect();
  return { cssWidth: rect.width, cssHeight: rect.height };
`;

const PUNCH = `
  const kind = arguments[0];
  const key = arguments[1];
  const root = kind === "phone"
    ? document.querySelector(".ob-phone")
    : document.querySelector(".ob-window");
  const content = kind === "phone"
    ? root.querySelector(".ob-mcontent")
    : root.querySelector(".ob-content");
  content.replaceChildren();
  content.style.background = key;
  content.style.padding = "0px";
  content.style.margin = "0px";
  content.style.overflow = "hidden";
  content.style.flex = "1 1 auto";
  content.style.minHeight = "0";
  const rootRect = root.getBoundingClientRect();
  const rect = content.getBoundingClientRect();
  return {
    cssWidth: rootRect.width,
    cssHeight: rootRect.height,
    holeX: rect.left - rootRect.left,
    holeY: rect.top - rootRect.top,
    holeWidth: rect.width,
    holeHeight: rect.height,
  };
`;

const SCENES = [
  { name: "daily-desktop", tab: "daily", view: "desktop", kind: "desktop", width: 1240, height: 820 },
  { name: "dashboard-desktop", tab: "dashboard", view: "desktop", kind: "desktop", width: 1280, height: 820 },
  { name: "cues-desktop", tab: "cues", view: "desktop", kind: "desktop", width: 1180, height: 760 },
  { name: "daily-phone", tab: "daily", view: "phone", kind: "phone" },
  { name: "dashboard-phone", tab: "dashboard", view: "phone", kind: "phone" },
  { name: "cues-phone", tab: "cues", view: "phone", kind: "phone" },
];

function existsChrome(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
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

async function capture() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { server, url } = await serveMock();
  const options = new chrome.Options();
  options.setChromeBinaryPath(CHROME);
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=1500,1040",
  );
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  const shells = {};
  try {
    await driver.get(url);
    await driver.wait(async () => driver.executeScript("return window.__ready === true"), 20000);
    await driver.executeScript(PREPARE);
    await driver.manage().window().setRect({ width: 1500, height: 1040, x: 0, y: 0 });
    await sleep(200);

    for (const scene of SCENES) {
      if (scene.kind === "phone") {
        await driver.manage().window().setRect({ width: 520, height: 1040, x: 0, y: 0 });
      } else {
        await driver.manage().window().setRect({ width: 1500, height: 1040, x: 0, y: 0 });
      }
      await sleep(80);
      await driver.executeScript(
        "window.PLAY.set({ tab: arguments[0], view: arguments[1], theme: 'light', motion: 'full', lang: 'en' });",
        scene.tab,
        scene.view,
      );
      await driver.executeScript(PREPARE);
      await sleep(80);
      if (scene.kind === "desktop") {
        await driver.executeScript(LOCK_DESKTOP, scene.width, scene.height);
      } else {
        await driver.executeScript(LOCK_PHONE);
      }
      const hole = await driver.executeScript(PUNCH, scene.kind, KEY);
      if (!hole || hole.holeWidth < 80 || hole.holeHeight < 80) {
        throw new Error(`content hole too small for ${scene.name}: ${JSON.stringify(hole)}`);
      }
      await sleep(40);
      const css = scene.kind === "phone" ? ".ob-phone" : ".ob-window";
      const elements = await driver.findElements(By.css(css));
      if (!elements[0]) throw new Error(`missing ${css} for ${scene.name}`);
      const png = Buffer.from(await elements[0].takeScreenshot(), "base64");
      const file = join(OUT_DIR, `${scene.name}.png`);
      writeFileSync(file, png);
      const size = pngSize(png);
      const scaleX = size.width / hole.cssWidth;
      const scaleY = size.height / hole.cssHeight;
      shells[scene.name] = {
        file,
        cssWidth: hole.cssWidth,
        cssHeight: hole.cssHeight,
        holeCssWidth: hole.holeWidth,
        holeCssHeight: hole.holeHeight,
        hole: {
          x: Math.round(hole.holeX * scaleX),
          y: Math.round(hole.holeY * scaleY),
          width: Math.round(hole.holeWidth * scaleX),
          height: Math.round(hole.holeHeight * scaleY),
        },
      };
      console.log(
        "shell",
        scene.name,
        `${size.width}x${size.height}`,
        `hole ${shells[scene.name].hole.width}x${shells[scene.name].hole.height}`,
      );
    }
  } finally {
    await driver.quit();
    server.close();
  }
  const manifest = { shells };
  const manifestPath = join(OUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`wrote ${manifestPath}`);
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
