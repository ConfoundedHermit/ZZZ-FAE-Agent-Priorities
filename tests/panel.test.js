import test from "node:test";
import assert from "node:assert/strict";

await import("../src/domain/priorities.js");
await import("../src/ui/panel.js");

const { formatAgentLabel } = globalThis.FAEPriorities.ui;

test("agent labels put the mindscape after the name in brackets", () => {
  assert.equal(
    formatAgentLabel({ name: "Fixture Alpha", mindscape: "M1" }),
    "Fixture Alpha [M1]",
  );
  assert.equal(
    formatAgentLabel({ name: "Fixture Beta", mindscape: "M0" }),
    "Fixture Beta [M0]",
  );
  assert.equal(formatAgentLabel({ name: "Unknown", mindscape: "" }), "Unknown");
});
