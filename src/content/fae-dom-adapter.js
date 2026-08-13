(function registerFaeDomAdapter(root) {
  "use strict";

  const namespace = (root.FAEPriorities ??= {});
  const SCORE_LABELS = Object.freeze({
    "Set score": "setScore",
    "Mainstat score": "mainstatScore",
    "Substat score": "substatScore",
    "Total score": "totalScore",
  });

  function normalizedText(node) {
    return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function parseScoreText(text) {
    const normalized = String(text ?? "").trim();
    if (!/^(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%?$/.test(normalized)) {
      return null;
    }

    const value = Number.parseFloat(normalized.replace("%", ""));
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  }

  function parseScoreTooltip(tooltip) {
    const scores = {};

    for (const row of tooltip?.querySelectorAll("li") ?? []) {
      const label = normalizedText(row.querySelector("strong")).replace(/:$/, "");
      const property = SCORE_LABELS[label];
      if (!property) {
        continue;
      }

      const value = parseScoreText(normalizedText(row.querySelector("span")));
      if (value !== null) {
        scores[property] = value;
      }
    }

    return scores;
  }

  function readHref(anchor) {
    if (!anchor) {
      return null;
    }
    return anchor.href || anchor.getAttribute?.("href") || null;
  }

  function buildIdFromUrl(buildUrl) {
    if (!buildUrl) {
      return null;
    }

    try {
      const parts = new URL(buildUrl, "https://zfae.net").pathname
        .split("/")
        .filter(Boolean);
      return parts[0] === "build" ? (parts.at(-1) ?? null) : null;
    } catch {
      return null;
    }
  }

  function extractAgent(card, documentNode, index) {
    const slug = card.dataset?.agentSlug || `unknown-${index + 1}`;
    const name = normalizedText(card.querySelector("h3.title > label")) || slug;
    const mindscape = normalizedText(
      card.querySelector("h3.title > .mindscapes"),
    );
    const dedicatedUrl = readHref(
      card.querySelector("a.button.dedicated[href]"),
    );
    const buildUrl = readHref(card.querySelector("a.button.build-editor[href]"));
    const buildId = buildIdFromUrl(buildUrl);
    const discs = [];
    const diagnostics = [];
    const pendingTooltipIds = [];
    let populatedSlotCount = 0;

    for (let slot = 1; slot <= 6; slot += 1) {
      const slotNode = card.querySelector(
        `.disc-details .stat-list.slot${slot}`,
      );
      if (!slotNode) {
        continue;
      }

      populatedSlotCount += 1;
      const reference = slotNode.querySelector("[data-tooltip-content-id]");
      const tooltipId =
        reference?.dataset?.tooltipContentId ||
        reference?.getAttribute?.("data-tooltip-content-id") ||
        null;
      if (!tooltipId) {
        diagnostics.push(`Disc ${slot} has no score-tooltip reference.`);
        continue;
      }

      const tooltip = documentNode.getElementById(tooltipId);
      const scores = parseScoreTooltip(tooltip);
      if (scores.setScore === undefined || scores.totalScore === undefined) {
        pendingTooltipIds.push(tooltipId);
        diagnostics.push(`Disc ${slot} score data is not available yet.`);
        continue;
      }

      discs.push({
        slot,
        setScore: scores.setScore,
        mainstatScore: scores.mainstatScore ?? null,
        substatScore: scores.substatScore ?? null,
        totalScore: scores.totalScore,
      });
    }

    let status = "incomplete";
    if (populatedSlotCount === 0) {
      status = "no-disc-data";
      diagnostics.push("No populated disc slots were found.");
    } else if (populatedSlotCount === 6 && discs.length === 6) {
      status = "complete";
    } else if (populatedSlotCount < 6) {
      diagnostics.push(
        `Only ${populatedSlotCount} of 6 disc slots were found.`,
      );
    }

    return {
      key: buildId ? `${slug}:${buildId}` : `${slug}:card-${index + 1}`,
      slug,
      name,
      mindscape,
      dedicatedUrl,
      buildUrl,
      buildId,
      status,
      discs,
      diagnostics,
      pendingTooltipIds,
      source: {
        rank: card.dataset?.rank || null,
        topPercentile: card.dataset?.topPercentile || null,
        dateUpdated: card.dataset?.dateUpdated || null,
        damageScore: card.dataset?.damageScore || null,
      },
    };
  }

  function extractProfile(documentNode) {
    const profileNode = documentNode.querySelector(".profile[data-profile-uid]");
    const profileUid = profileNode?.dataset?.profileUid ?? null;
    const cards = Array.from(
      documentNode.querySelectorAll(".agent-card[data-agent-slug]"),
    );
    const diagnostics = [];

    if (!profileNode) {
      diagnostics.push("The FAE profile marker was not found.");
    }
    if (cards.length === 0) {
      diagnostics.push("No FAE agent cards were found.");
    }

    const agents = cards.map((card, index) =>
      extractAgent(card, documentNode, index),
    );
    const pendingTooltipIds = new Set(
      agents.flatMap((agent) => agent.pendingTooltipIds),
    );

    return {
      profileUid,
      agents,
      diagnostics,
      pendingTooltipCount: pendingTooltipIds.size,
    };
  }

  namespace.faeDom = Object.freeze({
    extractProfile,
    parseScoreText,
    parseScoreTooltip,
  });
})(globalThis);
