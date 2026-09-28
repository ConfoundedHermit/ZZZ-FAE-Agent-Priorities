import test from "node:test";
import assert from "node:assert/strict";
import { dumpBrowserDom } from "./helpers/browser-process.js";

test("browser output preserves both the DOM and stderr", async () => {
  const result = await dumpBrowserDom(process.execPath, [
    "-e", "console.log('<pre>PASS</pre>'); console.error('browser diagnostic');",
  ]);
  assert.match(result.stdout, /<pre>PASS<\/pre>/);
  assert.match(result.stderr, /browser diagnostic/);
});

test("empty browser output reports stderr and the selected executable", async () => {
  await assert.rejects(dumpBrowserDom(process.execPath, [
    "-e", "console.error('startup problem');",
  ]), (error) => {
    assert.match(error.message, /Browser returned no DOM output/);
    assert.ok(error.message.includes(process.execPath));
    assert.match(error.message, /startup problem/);
    return true;
  });
});

test("browser startup failures preserve exit status and stderr", async () => {
  await assert.rejects(dumpBrowserDom(process.execPath, [
    "-e", "console.error('launch failed'); process.exit(7);",
  ]), (error) => {
    assert.match(error.message, /code: 7/);
    assert.match(error.message, /launch failed/);
    return true;
  });
});

test("a stalled browser is reported as a timeout even if it handles termination", async () => {
  await assert.rejects(dumpBrowserDom(process.execPath, [
    "-e",
    "process.on('SIGTERM', () => process.exit(0)); setInterval(() => {}, 100);",
  ], { timeout: 1000 }), /Browser timed out/);
});
