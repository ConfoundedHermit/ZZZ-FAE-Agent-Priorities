(function registerPriorityDomain(root) {
  "use strict";

  const namespace = (root.FAEPriorities ??= {});

  const SORT_MODES = Object.freeze({
    COMBINED: "combined",
    SET_FIXES: "set-fixes",
    DISCS_1_TO_3: "discs-1-to-3",
    DISCS_4_TO_6: "discs-4-to-6",
    ALL_DISCS: "all-discs",
  });

  const SORT_MODE_LABELS = Object.freeze({
    [SORT_MODES.COMBINED]: "Combined",
    [SORT_MODES.SET_FIXES]: "Set fixes",
    [SORT_MODES.DISCS_1_TO_3]: "Discs 1–3",
    [SORT_MODES.DISCS_4_TO_6]: "Discs 4–6",
    [SORT_MODES.ALL_DISCS]: "All discs",
  });

  function mean(values) {
    if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function scoreGroup(discsBySlot, slots) {
    const scores = [];

    for (const slot of slots) {
      const score = discsBySlot.get(slot)?.totalScore;
      if (!Number.isFinite(score)) {
        return null;
      }
      scores.push(score);
    }

    return mean(scores);
  }

  function derivePriority(agent) {
    const discsBySlot = new Map(
      agent.discs.map((disc) => [disc.slot, disc]),
    );
    const requiredSlots = [1, 2, 3, 4, 5, 6];
    const hasAllRequiredScores = requiredSlots.every((slot) => {
      const disc = discsBySlot.get(slot);
      return (
        disc !== undefined &&
        Number.isFinite(disc.setScore) &&
        Number.isFinite(disc.totalScore)
      );
    });
    const isComplete = agent.status === "complete" && hasAllRequiredScores;
    const setScores = isComplete
      ? requiredSlots.map((slot) => discsBySlot.get(slot).setScore)
      : [];
    const setIssueCount = isComplete
      ? setScores.filter((score) => score < 100).length
      : null;

    return {
      ...agent,
      priority: {
        isComplete,
        needsSetWork: isComplete ? setIssueCount > 0 : null,
        setIssueCount,
        lowestSetScore: isComplete ? Math.min(...setScores) : null,
        average1to3: isComplete
          ? scoreGroup(discsBySlot, [1, 2, 3])
          : null,
        average4to6: isComplete
          ? scoreGroup(discsBySlot, [4, 5, 6])
          : null,
        averageAll: isComplete
          ? scoreGroup(discsBySlot, [1, 2, 3, 4, 5, 6])
          : null,
      },
    };
  }

  function compareNumbers(left, right, direction = "ascending") {
    if (left === right) {
      return 0;
    }
    if (left === null) {
      return 1;
    }
    if (right === null) {
      return -1;
    }
    return direction === "descending" ? right - left : left - right;
  }

  function compareNames(left, right) {
    return left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }

  function compareCompletion(left, right) {
    return Number(!left.priority.isComplete) - Number(!right.priority.isComplete);
  }

  function compareCombined(left, right) {
    return (
      compareCompletion(left, right) ||
      Number(!left.priority.needsSetWork) -
        Number(!right.priority.needsSetWork) ||
      compareNumbers(
        left.priority.average1to3,
        right.priority.average1to3,
      ) ||
      compareNumbers(
        left.priority.average4to6,
        right.priority.average4to6,
      ) ||
      compareNumbers(left.priority.averageAll, right.priority.averageAll) ||
      compareNames(left, right)
    );
  }

  function compareSetFixes(left, right) {
    return (
      compareCompletion(left, right) ||
      Number(!left.priority.needsSetWork) -
        Number(!right.priority.needsSetWork) ||
      compareNumbers(
        left.priority.setIssueCount,
        right.priority.setIssueCount,
        "descending",
      ) ||
      compareNumbers(
        left.priority.lowestSetScore,
        right.priority.lowestSetScore,
      ) ||
      compareNumbers(
        left.priority.average1to3,
        right.priority.average1to3,
      ) ||
      compareNumbers(
        left.priority.average4to6,
        right.priority.average4to6,
      ) ||
      compareNumbers(left.priority.averageAll, right.priority.averageAll) ||
      compareNames(left, right)
    );
  }

  function compareDiscGroup(left, right, primaryKey, secondaryKey) {
    return (
      compareCompletion(left, right) ||
      compareNumbers(left.priority[primaryKey], right.priority[primaryKey]) ||
      compareNumbers(left.priority[secondaryKey], right.priority[secondaryKey]) ||
      compareNumbers(left.priority.averageAll, right.priority.averageAll) ||
      Number(!left.priority.needsSetWork) -
        Number(!right.priority.needsSetWork) ||
      compareNames(left, right)
    );
  }

  function compareAllDiscs(left, right) {
    return (
      compareCompletion(left, right) ||
      compareNumbers(left.priority.averageAll, right.priority.averageAll) ||
      compareNumbers(
        left.priority.average1to3,
        right.priority.average1to3,
      ) ||
      compareNumbers(
        left.priority.average4to6,
        right.priority.average4to6,
      ) ||
      Number(!left.priority.needsSetWork) -
        Number(!right.priority.needsSetWork) ||
      compareNames(left, right)
    );
  }

  function getComparator(sortMode) {
    switch (sortMode) {
      case SORT_MODES.SET_FIXES:
        return compareSetFixes;
      case SORT_MODES.DISCS_1_TO_3:
        return (left, right) =>
          compareDiscGroup(left, right, "average1to3", "average4to6");
      case SORT_MODES.DISCS_4_TO_6:
        return (left, right) =>
          compareDiscGroup(left, right, "average4to6", "average1to3");
      case SORT_MODES.ALL_DISCS:
        return compareAllDiscs;
      case SORT_MODES.COMBINED:
      default:
        return compareCombined;
    }
  }

  function prioritizeAgents(agents, sortMode = SORT_MODES.COMBINED) {
    return agents.map(derivePriority).sort(getComparator(sortMode));
  }

  namespace.domain = Object.freeze({
    SORT_MODES,
    SORT_MODE_LABELS,
    derivePriority,
    prioritizeAgents,
  });
})(globalThis);
