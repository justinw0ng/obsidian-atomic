import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { e2eSkipReason, resolveDisplay, waitForCdpGone } from "../e2e/lib/obsidian.mjs";

function listenHttp(handler) {
  const server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("HTTP test server did not bind a port"));
        return;
      }
      resolve({ server, port: address.port });
    });
    server.once("error", reject);
  });
}

function withEnv(key, value, fn) {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

test("resolveDisplay prefers DISPLAY when set", () => {
  withEnv("DISPLAY", ":99", () => {
    assert.equal(resolveDisplay(), ":99");
  });
});

test("e2eSkipReason honors SKIP_E2E even when a display is available", () => {
  withEnv("SKIP_E2E", "1", () => {
    withEnv("DISPLAY", ":1", () => {
      assert.equal(e2eSkipReason(), "SKIP_E2E=1");
    });
  });
});

test("launchObsidian waits for the previous CDP port to close", () => {
  const src = readFileSync(new URL("../e2e/lib/obsidian.mjs", import.meta.url), "utf8");
  assert.match(src, /async function waitForCdpGone/);
  assert.match(src, /killObsidian\(\);\n  await waitForCdpGone\(\);/);
});

test("waitForCdpGone returns when nothing is listening", async () => {
  const { server, port } = await listenHttp((_req, res) => {
    res.writeHead(200);
    res.end("open");
  });
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await waitForCdpGone(port, 1000);
});

test("waitForCdpGone does not treat HTTP 404 as a closed port", async () => {
  const { server, port } = await listenHttp((_req, res) => {
    res.writeHead(404);
    res.end("missing");
  });
  try {
    await assert.rejects(
      () => waitForCdpGone(port, 400),
      /still listening/,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("waitForCdpGone throws when the port stays open", async () => {
  const { server, port } = await listenHttp((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{}");
  });
  try {
    await assert.rejects(
      () => waitForCdpGone(port, 400),
      /still listening/,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("waitForCdpGone returns after a live listener closes", async () => {
  const { server, port } = await listenHttp((_req, res) => {
    res.writeHead(200);
    res.end("open");
  });
  setTimeout(() => server.close(), 120);
  await waitForCdpGone(port, 2000);
});

test("noticeTexts reads notices in one script to avoid stale elements", () => {
  const src = readFileSync(new URL("../e2e/lib/obsidian.mjs", import.meta.url), "utf8");
  assert.match(src, /export async function noticeTexts/);
  assert.match(src, /querySelectorAll\("\.notice"\)/);
  assert.doesNotMatch(
    src,
    /export async function noticeTexts[\s\S]*findElements\(By\.css\("\.notice"\)\)/,
  );
});
