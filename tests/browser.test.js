import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { dumpBrowserDom } from "./helpers/browser-process.js";

const configuredBrowser = process.env.FAE_TEST_BROWSER;
const browser = configuredBrowser || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path));

test("real browser checks parsing, refresh, layout and controls under host CSS", {
  skip: browser ? false : "Install Chromium or set FAE_TEST_BROWSER to run DOM regressions.",
}, async () => {
  assert.ok(existsSync(browser), `Configured test browser does not exist: ${browser}`);
  const profileDirectory = await mkdtemp(join(tmpdir(), "fae-dom-test-"));
  try {
    const { stdout, stderr } = await dumpBrowserDom(browser, [
      "--headless",
      // Opt in only for isolated test runners that cannot initialize Chromium's sandbox.
      ...(process.env.FAE_TEST_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      `--user-data-dir=${profileDirectory}`,
      "--virtual-time-budget=5000",
      "--dump-dom",
      new URL("fixtures/browser-regression.html", import.meta.url).href,
    ]);
    assert.match(stdout, /<pre id="result" data-status="pass">PASS<\/pre>/,
      `Browser: ${browser}\nDOM:\n${stdout}\nstderr:\n${stderr || "(empty)"}`);
  } finally {
    assert.ok(resolve(profileDirectory).startsWith(`${resolve(tmpdir())}${sep}fae-dom-test-`));
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
