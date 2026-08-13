import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = new URL("../", import.meta.url);
const files = [
  "src/domain/priorities.js",
  "src/content/fae-dom-adapter.js",
  "src/ui/panel.js",
  "src/content/bootstrap.js",
  "scripts/build.mjs",
  "tests/priorities.test.js",
  "tests/fae-dom-adapter.test.js",
  "tests/panel.test.js",
];

for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ["--check", fileURLToPath(new URL(file, projectRoot))],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax checked ${files.length} JavaScript files.`);
