import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../src/content/fae-dom-adapter.js");

const { extractProfile, parseScoreText, parseScoreTooltip } =
  globalThis.FAEPriorities.faeDom;

class FakeNode {
  constructor({ textContent = "", dataset = {}, href = null } = {}) {
    this.textContent = textContent;
    this.dataset = dataset;
    this.href = href;
    this.single = new Map();
    this.multiple = new Map();
    this.attributes = new Map();
  }

  with(selector, node) {
    this.single.set(selector, node);
    return this;
  }

  withAll(selector, nodes) {
    this.multiple.set(selector, nodes);
    return this;
  }

  querySelector(selector) {
    return this.single.get(selector) ?? null;
  }

  querySelectorAll(selector) {
    return this.multiple.get(selector) ?? [];
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeDocument extends FakeNode {
  constructor() {
    super();
    this.byId = new Map();
  }

  getElementById(id) {
    return this.byId.get(id) ?? null;
  }
}

function tooltip(setScore, totalScore, mainstatScore = null, substatScore = 50) {
  const rows = [
    ["Set score:", `${setScore}%`],
    ...(mainstatScore === null
      ? []
      : [["Mainstat score:", `${mainstatScore}%`]]),
    ["Substat score:", `${substatScore}%`],
    ["Total score:", `${totalScore}%`],
  ].map(([label, value]) =>
    new FakeNode()
      .with("strong", new FakeNode({ textContent: label }))
      .with("span", new FakeNode({ textContent: value })),
  );
  return new FakeNode().withAll("li", rows);
}

function populatedCard(documentNode) {
  const card = new FakeNode({
    dataset: {
      agentSlug: "fixture-alpha",
      rank: "4321",
      topPercentile: "0.4321",
      dateUpdated: "1700000000",
      damageScore: "10000.0",
    },
  })
    .with("h3.title > label", new FakeNode({ textContent: " Fixture Alpha " }))
    .with("h3.title > .mindscapes", new FakeNode({ textContent: "M1" }))
    .with(
      "a.button.dedicated[href]",
      new FakeNode({ href: "https://zfae.net/profile/fixture-profile/fixture-alpha" }),
    )
    .with(
      "a.button.build-editor[href]",
      new FakeNode({ href: "https://zfae.net/build/fixture-alpha/fixture-build" }),
    );

  const sets = [100, 100, 95, 90, 100, 85];
  const totals = [81, 82, 83, 84, 85, 86];
  for (let slot = 1; slot <= 6; slot += 1) {
    const tooltipId = `tooltip-fixture-build-slot${slot}`;
    const reference = new FakeNode({ dataset: { tooltipContentId: tooltipId } });
    const slotNode = new FakeNode().with(
      "[data-tooltip-content-id]",
      reference,
    );
    card.with(`.disc-details .stat-list.slot${slot}`, slotNode);
    documentNode.byId.set(
      tooltipId,
      tooltip(sets[slot - 1], totals[slot - 1], slot >= 4 ? 100 : null),
    );
  }
  return card;
}

function emptyCard() {
  return new FakeNode({ dataset: { agentSlug: "fixture-beta" } })
    .with("h3.title > label", new FakeNode({ textContent: "Fixture Beta" }))
    .with("h3.title > .mindscapes", new FakeNode({ textContent: "M2" }))
    .with(
      "a.button.dedicated[href]",
      new FakeNode({ href: "https://zfae.net/profile/fixture-profile/fixture-beta" }),
    );
}

test("parseScoreText accepts valid percentages and rejects malformed values", () => {
  assert.equal(parseScoreText("85%"), 85);
  assert.equal(parseScoreText("74.5"), 74.5);
  assert.equal(parseScoreText("100.0%"), 100);
  assert.equal(parseScoreText("101%"), null);
  assert.equal(parseScoreText("score 85"), null);
  assert.equal(parseScoreText(""), null);
});

test("parseScoreTooltip maps FAE labels and permits absent mainstat scores", () => {
  const result = parseScoreTooltip(tooltip(80, 70, null, 40));
  assert.deepEqual(result, {
    setScore: 80,
    substatScore: 40,
    totalScore: 70,
  });
});

test("extractProfile follows tooltip IDs and preserves no-disc agents", () => {
  const documentNode = new FakeDocument();
  documentNode.with(
    ".profile[data-profile-uid]",
    new FakeNode({ dataset: { profileUid: "fixture-profile" } }),
  );
  documentNode.withAll(".agent-card[data-agent-slug]", [
    populatedCard(documentNode),
    emptyCard(),
  ]);

  const result = extractProfile(documentNode);

  assert.equal(result.profileUid, "fixture-profile");
  assert.equal(result.agents.length, 2);
  assert.equal(result.pendingTooltipCount, 0);
  assert.equal(result.agents[0].key, "fixture-alpha:fixture-build");
  assert.equal(result.agents[0].status, "complete");
  assert.deepEqual(
    result.agents[0].discs.map((disc) => disc.slot),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    result.agents[0].discs.map((disc) => disc.totalScore),
    [81, 82, 83, 84, 85, 86],
  );
  assert.equal(result.agents[1].status, "no-disc-data");
  assert.match(result.agents[1].diagnostics[0], /No populated disc slots/);
});

test("missing tooltip content is reported as pending rather than zero", () => {
  const documentNode = new FakeDocument();
  const card = populatedCard(documentNode);
  documentNode.byId.delete("tooltip-fixture-build-slot4");
  documentNode.withAll(".agent-card[data-agent-slug]", [card]);

  const result = extractProfile(documentNode);

  assert.equal(result.pendingTooltipCount, 1);
  assert.equal(result.agents[0].status, "incomplete");
  assert.equal(result.agents[0].discs.length, 5);
  assert.ok(result.agents[0].discs.every((disc) => disc.slot !== 4));
});

test("the sanitized profile fixture retains populated score tooltips", async () => {
  const fixture = await readFile(
    new URL("fixtures/profile-fragment.html", import.meta.url),
    "utf8",
  );

  assert.equal((fixture.match(/class="stat-list slot[1-6]"/g) ?? []).length, 6);
  assert.equal((fixture.match(/data-tooltip-content-id=/g) ?? []).length, 6);
  assert.equal((fixture.match(/Set score:/g) ?? []).length, 6);
  assert.equal((fixture.match(/Total score:/g) ?? []).length, 6);
  assert.match(fixture, /data-agent-slug="fixture-beta"/);
});
