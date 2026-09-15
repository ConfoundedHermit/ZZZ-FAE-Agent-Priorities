import test from "node:test";
import assert from "node:assert/strict";

await import("../src/domain/agent-metadata.js");

const {
  UNKNOWN,
  AGENT_CATALOG,
  getAgentMetadata,
  getFilterOptions,
  filterAgents,
} = globalThis.FAEPriorities.agentMetadata;

test("catalog covers the current FAE leaderboard agent set", () => {
  const expectedSlugs = [
    "alice",
    "anby",
    "anton",
    "aria",
    "astra-yao",
    "banyue",
    "ben",
    "billy",
    "burnice",
    "caesar",
    "cissia",
    "claret",
    "corin",
    "dialyn",
    "ellen",
    "evelyn",
    "grace",
    "harumasa",
    "hugo",
    "jane",
    "ju-fufu",
    "koleda",
    "lighter",
    "lucia",
    "lucy",
    "lycaon",
    "manato",
    "miyabi",
    "nangong-yu",
    "nekomata",
    "nicole",
    "norma",
    "orphie-magus",
    "pan-yinhu",
    "phoenix",
    "piper",
    "promeia",
    "pulchra",
    "pyrois",
    "qingyi",
    "remielle",
    "rina",
    "roxy",
    "seed",
    "seth",
    "severian",
    "sigrid",
    "soldier-0-anby",
    "soldier-11",
    "soukaku",
    "starlight-billy",
    "sunna",
    "trigger",
    "velina",
    "vivian",
    "yanagi",
    "ye-shunguang",
    "yidhari",
    "yixuan",
    "yuzuha",
    "zhao",
    "zhu-yuan",
  ];
  assert.deepEqual(Object.keys(AGENT_CATALOG).sort(), expectedSlugs);
  assert.deepEqual(getAgentMetadata("zhu-yuan"), {
    type: "Attack",
    element: "Ether",
    rank: "S",
    isKnown: true,
  });
  assert.deepEqual(getAgentMetadata("not-yet-known"), {
    type: UNKNOWN,
    element: UNKNOWN,
    rank: UNKNOWN,
    isKnown: false,
  });
});

test("filter options contain only values present in the rendered agents", () => {
  const agents = [
    { type: "Support", element: "Ether", rank: "S" },
    { type: "Attack", element: "Electric", rank: "A" },
    { type: UNKNOWN, element: UNKNOWN, rank: UNKNOWN },
  ];

  assert.deepEqual(getFilterOptions(agents, "type"), [
    "Attack",
    "Support",
    UNKNOWN,
  ]);
  assert.deepEqual(getFilterOptions(agents, "element"), [
    "Electric",
    "Ether",
    UNKNOWN,
  ]);
  assert.deepEqual(getFilterOptions(agents, "rank"), ["S", "A", UNKNOWN]);
});

test("filters combine type, element, and rank selections", () => {
  const agents = [
    { name: "One", type: "Attack", element: "Electric", rank: "S" },
    { name: "Two", type: "Attack", element: "Fire", rank: "A" },
    { name: "Three", type: "Support", element: "Electric", rank: "A" },
  ];

  assert.deepEqual(
    filterAgents(agents, { type: "Attack", rank: "A" }).map(
      (agent) => agent.name,
    ),
    ["Two"],
  );
  assert.deepEqual(filterAgents(agents, {}).map((agent) => agent.name), [
    "One",
    "Two",
    "Three",
  ]);
});
