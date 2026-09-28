import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const browser = [
  process.env.FAE_TEST_BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => path && existsSync(path));

test("real browser checks parsing, refresh, layout and controls under host CSS", {
  skip: browser ? false : "Install Chromium or set FAE_TEST_BROWSER to run DOM regressions.",
}, async () => {
  const profileDirectory = await mkdtemp(join(tmpdir(), "fae-dom-test-"));
  try {
    const { stdout } = await promisify(execFile)(browser, [
      "--headless",
      // Opt in only for isolated test runners that cannot initialize Chromium's sandbox.
      ...(process.env.FAE_TEST_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      `--user-data-dir=${profileDirectory}`,
      "--virtual-time-budget=5000",
      "--dump-dom",
      new URL("fixtures/browser-regression.html", import.meta.url).href,
    ], { timeout: 30000, maxBuffer: 1024 * 1024 });
    assert.match(stdout, /<pre id="result" data-status="pass">PASS<\/pre>/, stdout);
  } finally {
    assert.ok(resolve(profileDirectory).startsWith(`${resolve(tmpdir())}${sep}fae-dom-test-`));
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
