import test from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeviceHeroArgs } from "../scripts/docs-capture.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const compositor = join(root, "scripts/compose-device-hero.py");

test("buildDeviceHeroArgs omits crop-chrome unless requested", () => {
  const args = buildDeviceHeroArgs({
    desktop: "/tmp/desk.png",
    mobile: "/tmp/phone.png",
    out: "/tmp/out.png",
    headline: "Your cues. One index card.",
    desktopFit: "contain",
    phoneFit: "contain",
    mobileKind: "window",
    phonePad: 22,
    scrubScrollbars: true,
  });
  assert.equal(args[0], compositor);
  assert.deepEqual(args.slice(1), [
    "--desktop",
    "/tmp/desk.png",
    "--mobile",
    "/tmp/phone.png",
    "--out",
    "/tmp/out.png",
    "--headline",
    "Your cues. One index card.",
    "--desktop-fit",
    "contain",
    "--phone-fit",
    "contain",
    "--mobile-kind",
    "window",
    "--phone-pad",
    "22",
    "--scrub-scrollbars",
  ]);
  assert.equal(args.includes("--crop-chrome"), false);
});

test("buildDeviceHeroArgs adds crop-chrome for the dashboard hero", () => {
  const args = buildDeviceHeroArgs({
    desktop: "/tmp/desk.png",
    mobile: "/tmp/phone.png",
    out: "/tmp/out.png",
    headline: "Your year. One dashboard.",
    cropChrome: true,
    desktopFit: "contain",
    phoneFit: "contain",
    mobileKind: "phone",
    phonePad: 22,
    scrubScrollbars: true,
  });
  assert.equal(args.includes("--crop-chrome"), true);
  assert.equal(args.includes("--scrub-scrollbars"), true);
  assert.equal(args.at(-1) === "--crop-chrome" || args.includes("--crop-chrome"), true);
});
