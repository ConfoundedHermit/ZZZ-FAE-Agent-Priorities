import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

await import("../src/domain/agent-metadata.js");
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
    .with(".title .mindscapes", new FakeNode({ textContent: "M1" }))
    .with(
      "a.dedicated[href]",
      new FakeNode({ href: "https://zfae.net/profile/fixture-profile/fixture-alpha" }),
    )
    .with(
      "a.build-editor[href]",
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
    .with(".title .mindscapes", new FakeNode({ textContent: "M2" }))
    .with(
      "a.dedicated[href]",
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
  assert.deepEqual(
    {
      type: result.agents[0].type,
      element: result.agents[0].element,
      rank: result.agents[0].rank,
    },
    { type: "Unknown", element: "Unknown", rank: "Unknown" },
  );
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

test("extractProfile attaches catalog metadata by FAE slug", () => {
  const documentNode = new FakeDocument();
  const card = populatedCard(documentNode);
  card.dataset.agentSlug = "zhu-yuan";
  documentNode.withAll(".agent-card[data-agent-slug]", [card]);

  const [agent] = extractProfile(documentNode).agents;

  assert.deepEqual(
    { type: agent.type, element: agent.element, rank: agent.rank },
    { type: "Attack", element: "Ether", rank: "S" },
  );
  assert.equal(agent.hasKnownMetadata, true);
});

test("explicit FAE metadata can override the local catalog", () => {
  const documentNode = new FakeDocument();
  const card = populatedCard(documentNode);
  card.dataset.agentSlug = "zhu-yuan";
  card.dataset.agentType = "Future type";
  card.dataset.agentElement = "Future element";
  card.dataset.agentRarity = "Future rank";
  documentNode.withAll(".agent-card[data-agent-slug]", [card]);

  const [agent] = extractProfile(documentNode).agents;

  assert.deepEqual(
    { type: agent.type, element: agent.element, rank: agent.rank },
    {
      type: "Future type",
      element: "Future element",
      rank: "Future rank",
    },
  );
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

test("the legacy profile fixture retains populated score tooltips", async () => {
  const fixture = await readFile(
    new URL("fixtures/profile-legacy.html", import.meta.url),
    "utf8",
  );

  assert.equal((fixture.match(/class="stat-list slot[1-6]"/g) ?? []).length, 6);
  assert.equal((fixture.match(/data-tooltip-content-id=/g) ?? []).length, 6);
  assert.equal((fixture.match(/Set score:/g) ?? []).length, 6);
  assert.equal((fixture.match(/Total score:/g) ?? []).length, 6);
  assert.match(fixture, /data-agent-slug="fixture-beta"/);
});

function inlineCard(documentNode) {
  const card = populatedCard(documentNode);
  card.single.delete("h3.title > label");
  card.with(".title .agent-name", new FakeNode({ textContent: "Fixture Alpha" }));
  card.dataset.assessmentId = "fixture-build";
  for (let slot = 1; slot <= 6; slot += 1) {
    card.with(`.disc-details .stat-list.slot${slot}`, new FakeNode().with(
      ".tier .tooltip-content",
      documentNode.byId.get(`tooltip-fixture-build-slot${slot}`),
    ));
  }
  documentNode.byId.clear();
  return card;
}

test("current cards read names, links and inline numeric scores", () => {
  const documentNode = new FakeDocument();
  documentNode.withAll(".agent-card[data-agent-slug]", [inlineCard(documentNode)]);
  const result = extractProfile(documentNode);
  const [agent] = result.agents;
  assert.equal(agent.name, "Fixture Alpha");
  assert.equal(agent.mindscape, "M1");
  assert.equal(agent.key, "fixture-alpha:fixture-build");
  assert.equal(agent.dedicatedUrl, "https://zfae.net/profile/fixture-profile/fixture-alpha");
  assert.equal(agent.buildUrl, "https://zfae.net/build/fixture-alpha/fixture-build");
  assert.equal(agent.status, "complete");
  assert.equal(result.pendingTooltipCount, 0);
  assert.deepEqual(agent.discs.map((disc) => disc.totalScore), [81, 82, 83, 84, 85, 86]);
  assert.deepEqual(agent.discs.map((disc) => disc.setScore), [100, 100, 95, 90, 100, 85]);
});

test("assessment IDs preserve build identity when the editor link is absent", () => {
  const documentNode = new FakeDocument();
  const card = inlineCard(documentNode);
  card.single.delete("a.build-editor[href]");
  documentNode.withAll(".agent-card[data-agent-slug]", [card]);
  assert.equal(extractProfile(documentNode).agents[0].key, "fixture-alpha:fixture-build");
});

test("empty inline tooltips stay pending per card and recover when populated", () => {
  const documentNode = new FakeDocument();
  const cards = [inlineCard(documentNode), inlineCard(documentNode)];
  const emptyTooltip = new FakeNode();
  for (const card of cards) {
    for (let slot = 1; slot <= 6; slot += 1) {
      card.querySelector(`.disc-details .stat-list.slot${slot}`)
        .with(".tier .tooltip-content", emptyTooltip);
    }
  }
  documentNode.withAll(".agent-card[data-agent-slug]", cards);
  const result = extractProfile(documentNode);
  assert.equal(result.pendingTooltipCount, 12);
  assert.ok(result.agents.every((agent) => agent.status === "incomplete" && agent.discs.length === 0));
  emptyTooltip.withAll("li", tooltip(100, 72).querySelectorAll("li"));
  assert.equal(extractProfile(documentNode).pendingTooltipCount, 0);
  assert.ok(extractProfile(documentNode).agents.every((agent) => agent.status === "complete"));
});

test("invalid inline scores cannot produce a complete build", () => {
  const documentNode = new FakeDocument();
  const card = inlineCard(documentNode);
  card.querySelector(".disc-details .stat-list.slot4")
    .with(".tier .tooltip-content", tooltip(100, 101));
  documentNode.withAll(".agent-card[data-agent-slug]", [card]);
  const result = extractProfile(documentNode);
  assert.equal(result.agents[0].status, "incomplete");
  assert.equal(result.agents[0].discs.length, 5);
  assert.equal(result.pendingTooltipCount, 1);
});
