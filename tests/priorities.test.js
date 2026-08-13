import test from "node:test";
import assert from "node:assert/strict";

await import("../src/domain/priorities.js");

const { SORT_MODES, derivePriority, prioritizeAgents } =
  globalThis.FAEPriorities.domain;

function completeAgent(name, setScores, totalScores) {
  return {
    key: name.toLowerCase(),
    slug: name.toLowerCase(),
    name,
    mindscape: "M0",
    dedicatedUrl: null,
    buildUrl: null,
    buildId: null,
    status: "complete",
    diagnostics: [],
    pendingTooltipIds: [],
    source: {},
    discs: totalScores.map((totalScore, index) => ({
      slot: index + 1,
      setScore: setScores[index],
      mainstatScore: index >= 3 ? 100 : null,
      substatScore: 50,
      totalScore,
    })),
  };
}

function incompleteAgent(name) {
  return {
    ...completeAgent(name, [], []),
    status: "no-disc-data",
  };
}

test("derivePriority calculates set issues and both disc averages", () => {
  const agent = completeAgent(
    "Fixture Alpha",
    [100, 100, 95, 90, 100, 85],
    [81, 82, 83, 84, 85, 86],
  );

  const result = derivePriority(agent);

  assert.equal(result.priority.isComplete, true);
  assert.equal(result.priority.needsSetWork, true);
  assert.equal(result.priority.setIssueCount, 3);
  assert.equal(result.priority.lowestSetScore, 85);
  assert.equal(result.priority.average1to3, 82);
  assert.equal(result.priority.average4to6, 85);
  assert.equal(result.priority.averageAll, 83.5);
});

test("combined sorting puts set problems first, then low 1-3 and 4-6 averages", () => {
  const perfectLow = completeAgent(
    "Perfect Low",
    [100, 100, 100, 100, 100, 100],
    [50, 50, 50, 50, 50, 50],
  );
  const setIssueHigher = completeAgent(
    "Set Issue Higher",
    [100, 100, 100, 100, 100, 85],
    [70, 70, 70, 20, 20, 20],
  );
  const setIssueLower = completeAgent(
    "Set Issue Lower",
    [75, 100, 100, 100, 100, 100],
    [60, 60, 60, 90, 90, 90],
  );

  const result = prioritizeAgents(
    [perfectLow, setIssueHigher, setIssueLower],
    SORT_MODES.COMBINED,
  );

  assert.deepEqual(
    result.map((agent) => agent.name),
    ["Set Issue Lower", "Set Issue Higher", "Perfect Low"],
  );
});

test("set-fix sorting uses issue count and then lowest set score", () => {
  const oneIssue = completeAgent(
    "One",
    [75, 100, 100, 100, 100, 100],
    [80, 80, 80, 80, 80, 80],
  );
  const twoIssuesHigherMinimum = completeAgent(
    "Two Higher",
    [85, 85, 100, 100, 100, 100],
    [80, 80, 80, 80, 80, 80],
  );
  const twoIssuesLowerMinimum = completeAgent(
    "Two Lower",
    [75, 85, 100, 100, 100, 100],
    [80, 80, 80, 80, 80, 80],
  );

  const result = prioritizeAgents(
    [oneIssue, twoIssuesHigherMinimum, twoIssuesLowerMinimum],
    SORT_MODES.SET_FIXES,
  );

  assert.deepEqual(
    result.map((agent) => agent.name),
    ["Two Lower", "Two Higher", "One"],
  );
});

test("independent disc sorts use the requested group", () => {
  const lowFirst = completeAgent(
    "Low First",
    [100, 100, 100, 100, 100, 100],
    [50, 50, 50, 90, 90, 90],
  );
  const lowSecond = completeAgent(
    "Low Second",
    [100, 100, 100, 100, 100, 100],
    [90, 90, 90, 50, 50, 50],
  );

  assert.equal(
    prioritizeAgents([lowSecond, lowFirst], SORT_MODES.DISCS_1_TO_3)[0].name,
    "Low First",
  );
  assert.equal(
    prioritizeAgents([lowFirst, lowSecond], SORT_MODES.DISCS_4_TO_6)[0].name,
    "Low Second",
  );
});

test("all-disc sorting uses the average Total score across all six discs", () => {
  const lowerAll = completeAgent(
    "Lower All",
    [100, 100, 100, 100, 100, 100],
    [50, 50, 50, 70, 70, 70],
  );
  const higherAll = completeAgent(
    "Higher All",
    [100, 100, 100, 100, 100, 100],
    [80, 80, 80, 60, 60, 60],
  );

  const result = prioritizeAgents(
    [higherAll, lowerAll],
    SORT_MODES.ALL_DISCS,
  );

  assert.deepEqual(
    result.map((agent) => agent.name),
    ["Lower All", "Higher All"],
  );
  assert.equal(result[0].priority.averageAll, 60);
  assert.equal(result[1].priority.averageAll, 70);
});

test("incomplete agents remain visible and sort after complete agents", () => {
  const incomplete = incompleteAgent("No Discs");
  const complete = completeAgent(
    "Complete",
    [100, 100, 100, 100, 100, 100],
    [100, 100, 100, 100, 100, 100],
  );

  for (const mode of Object.values(SORT_MODES)) {
    const result = prioritizeAgents([incomplete, complete], mode);
    assert.deepEqual(
      result.map((agent) => agent.name),
      ["Complete", "No Discs"],
    );
    assert.equal(result[1].priority.average1to3, null);
  }
});
