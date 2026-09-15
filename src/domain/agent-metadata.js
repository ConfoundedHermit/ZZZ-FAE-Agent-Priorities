(function registerAgentMetadata(root) {
  "use strict";

  const namespace = (root.FAEPriorities ??= {});
  const UNKNOWN = "Unknown";

  // FAE agent slugs and classifications, updated 2026-09-14.
  const catalogEntries = {
    alice: ["Anomaly", "Physical", "S"],
    anby: ["Stun", "Electric", "A"],
    anton: ["Attack", "Electric", "A"],
    aria: ["Anomaly", "Ether", "S"],
    "astra-yao": ["Support", "Ether", "S"],
    banyue: ["Rupture", "Fire", "S"],
    ben: ["Defense", "Fire", "A"],
    billy: ["Attack", "Physical", "A"],
    burnice: ["Anomaly", "Fire", "S"],
    caesar: ["Defense", "Physical", "S"],
    cissia: ["Attack", "Electric", "S"],
    claret: ["Armorer", "Electric", "S"],
    corin: ["Attack", "Physical", "A"],
    dialyn: ["Stun", "Physical", "S"],
    ellen: ["Attack", "Ice", "S"],
    evelyn: ["Attack", "Fire", "S"],
    grace: ["Anomaly", "Electric", "S"],
    harumasa: ["Attack", "Electric", "S"],
    hugo: ["Attack", "Ice", "S"],
    jane: ["Anomaly", "Physical", "S"],
    "ju-fufu": ["Stun", "Fire", "S"],
    koleda: ["Stun", "Fire", "S"],
    lighter: ["Stun", "Fire", "S"],
    lucia: ["Support", "Ether", "S"],
    lucy: ["Support", "Fire", "A"],
    lycaon: ["Stun", "Ice", "S"],
    manato: ["Rupture", "Fire", "A"],
    miyabi: ["Anomaly", "Ice", "S"],
    "nangong-yu": ["Stun", "Ether", "S"],
    nekomata: ["Attack", "Physical", "S"],
    nicole: ["Support", "Ether", "A"],
    norma: ["Stun", "Fire", "S"],
    "orphie-magus": ["Attack", "Fire", "S"],
    "pan-yinhu": ["Defense", "Physical", "A"],
    phoenix: ["Anomaly", "Fire", "S"],
    piper: ["Anomaly", "Physical", "A"],
    promeia: ["Anomaly", "Ice", "S"],
    pulchra: ["Stun", "Physical", "A"],
    pyrois: ["Attack", "Ether", "Infinity"],
    qingyi: ["Stun", "Electric", "S"],
    remielle: ["Anomaly", "Lumiflux", "S"],
    rina: ["Support", "Electric", "S"],
    roxy: ["Stun", "Wind", "S"],
    seed: ["Attack", "Electric", "S"],
    seth: ["Defense", "Electric", "A"],
    severian: ["Attack", "Wind", "S"],
    sigrid: ["Attack", "Ice", "S"],
    "soldier-0-anby": ["Attack", "Electric", "S"],
    "soldier-11": ["Attack", "Fire", "S"],
    soukaku: ["Support", "Ice", "A"],
    "starlight-billy": ["Attack", "Physical", "S"],
    sunna: ["Support", "Physical", "S"],
    trigger: ["Stun", "Electric", "S"],
    velina: ["Anomaly", "Wind", "S"],
    vivian: ["Anomaly", "Ether", "S"],
    yanagi: ["Anomaly", "Electric", "S"],
    "ye-shunguang": ["Attack", "Physical", "S"],
    yidhari: ["Rupture", "Ice", "S"],
    yixuan: ["Rupture", "Ether", "S"],
    yuzuha: ["Support", "Physical", "S"],
    zhao: ["Defense", "Ice", "S"],
    "zhu-yuan": ["Attack", "Ether", "S"],
  };

  const AGENT_CATALOG = Object.freeze(
    Object.fromEntries(
      Object.entries(catalogEntries).map(([slug, [type, element, rank]]) => [
        slug,
        Object.freeze({ type, element, rank }),
      ]),
    ),
  );

  const FILTER_FIELDS = Object.freeze({
    TYPE: "type",
    ELEMENT: "element",
    RANK: "rank",
  });

  const FILTER_LABELS = Object.freeze({
    [FILTER_FIELDS.TYPE]: "Type",
    [FILTER_FIELDS.ELEMENT]: "Element",
    [FILTER_FIELDS.RANK]: "Rank",
  });

  const VALUE_ORDER = Object.freeze({
    [FILTER_FIELDS.TYPE]: [
      "Attack",
      "Anomaly",
      "Stun",
      "Support",
      "Defense",
      "Rupture",
      "Armorer",
      UNKNOWN,
    ],
    [FILTER_FIELDS.ELEMENT]: [
      "Physical",
      "Fire",
      "Ice",
      "Electric",
      "Ether",
      "Wind",
      "Lumiflux",
      UNKNOWN,
    ],
    [FILTER_FIELDS.RANK]: ["S", "A", "Infinity", UNKNOWN],
  });

  function cleanMetadataValue(value) {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  }

  function getAgentMetadata(slug, exposed = {}) {
    const catalog = AGENT_CATALOG[slug] ?? {};
    const type = cleanMetadataValue(exposed.type) ?? catalog.type ?? UNKNOWN;
    const element =
      cleanMetadataValue(exposed.element) ?? catalog.element ?? UNKNOWN;
    const rank = cleanMetadataValue(exposed.rank) ?? catalog.rank ?? UNKNOWN;

    return {
      type,
      element,
      rank,
      isKnown: type !== UNKNOWN && element !== UNKNOWN && rank !== UNKNOWN,
    };
  }

  function compareFilterValues(field, left, right) {
    const order = VALUE_ORDER[field] ?? [];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? order.length : leftIndex;
    const normalizedRight = rightIndex === -1 ? order.length : rightIndex;

    return (
      normalizedLeft - normalizedRight ||
      left.localeCompare(right, undefined, { sensitivity: "base" })
    );
  }

  function getFilterOptions(agents, field) {
    if (!Object.values(FILTER_FIELDS).includes(field)) {
      return [];
    }

    return [...new Set(agents.map((agent) => agent[field] ?? UNKNOWN))].sort(
      (left, right) => compareFilterValues(field, left, right),
    );
  }

  function filterAgents(agents, filters = {}) {
    return agents.filter((agent) =>
      Object.values(FILTER_FIELDS).every((field) => {
        const selected = filters[field];
        return !selected || (agent[field] ?? UNKNOWN) === selected;
      }),
    );
  }

  namespace.agentMetadata = Object.freeze({
    UNKNOWN,
    AGENT_CATALOG,
    FILTER_FIELDS,
    FILTER_LABELS,
    getAgentMetadata,
    getFilterOptions,
    filterAgents,
  });
})(globalThis);
