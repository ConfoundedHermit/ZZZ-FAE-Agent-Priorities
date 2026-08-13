import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const outputDirectory = new URL("dist/", projectRoot);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const sourceFiles = [
  ["src/domain/priorities.js", "priorities.js"],
  ["src/content/fae-dom-adapter.js", "fae-dom-adapter.js"],
  ["src/ui/panel.js", "panel.js"],
  ["src/content/bootstrap.js", "bootstrap.js"],
  ["src/ui/panel.css", "panel.css"],
];

for (const [source, destination] of sourceFiles) {
  await cp(new URL(source, projectRoot), new URL(destination, outputDirectory));
}

const manifestPath = new URL("static/manifest.json", projectRoot);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await writeFile(
  new URL("manifest.json", outputDirectory),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Built extension ${manifest.version} in dist/`);
