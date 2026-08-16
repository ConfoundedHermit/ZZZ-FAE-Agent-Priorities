(function registerPriorityPanel(root) {
  "use strict";

  const namespace = (root.FAEPriorities ??= {});
  const PANEL_ID = "fae-priority-extension-root";

  function createElement(documentNode, tagName, className, text) {
    const element = documentNode.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function formatScore(score) {
    if (!Number.isFinite(score)) {
      return "—";
    }
    const rounded = Math.round(score * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
  }

  function buildDiscAudit(agent) {
    if (agent.discs.length === 0) {
      return "No disc scores available";
    }

    return [...agent.discs]
      .sort((left, right) => left.slot - right.slot)
      .map(
        (disc) =>
          `D${disc.slot} ${formatScore(disc.totalScore)} (set ${formatScore(disc.setScore)})`,
      )
      .join(" · ");
  }

  function formatAgentLabel(agent) {
    return `${agent.name}${agent.mindscape ? ` [${agent.mindscape}]` : ""}`;
  }

  function appendAgentRow(documentNode, body, agent, position, showAudit) {
    const row = createElement(documentNode, "tr", "fae-priority-row");
    if (!agent.priority.isComplete) {
      row.classList.add("is-incomplete");
    } else if (agent.priority.needsSetWork) {
      row.classList.add("needs-set-work");
    }

    const agentCell = createElement(documentNode, "td", "agent-cell");
    const rank = createElement(
      documentNode,
      "span",
      "priority-position",
      `${position}.`,
    );
    agentCell.append(rank);

    const label = formatAgentLabel(agent);
    if (agent.dedicatedUrl) {
      const link = createElement(documentNode, "a", "agent-link", label);
      link.href = agent.dedicatedUrl;
      agentCell.append(link);
    } else {
      agentCell.append(createElement(documentNode, "span", "agent-link", label));
    }

    if (showAudit) {
      agentCell.append(
        createElement(documentNode, "small", "disc-audit", buildDiscAudit(agent)),
      );
    }
    row.append(agentCell);

    const setCell = createElement(documentNode, "td", "score-cell set-cell");
    if (!agent.priority.isComplete) {
      setCell.textContent = agent.status === "no-disc-data" ? "No data" : "Waiting";
    } else if (agent.priority.needsSetWork) {
      setCell.append(
        createElement(
          documentNode,
          "strong",
          "set-warning",
          `${agent.priority.setIssueCount} issue${agent.priority.setIssueCount === 1 ? "" : "s"}`,
        ),
      );
      setCell.append(
        createElement(
          documentNode,
          "small",
          "lowest-set",
          `min ${formatScore(agent.priority.lowestSetScore)}`,
        ),
      );
    } else {
      setCell.append(createElement(documentNode, "span", "set-perfect", "✓ 100%"));
    }
    row.append(setCell);

    row.append(
      createElement(
        documentNode,
        "td",
        "score-cell",
        formatScore(agent.priority.average1to3),
      ),
    );
    row.append(
      createElement(
        documentNode,
        "td",
        "score-cell",
        formatScore(agent.priority.average4to6),
      ),
    );
    row.append(
      createElement(
        documentNode,
        "td",
        "score-cell",
        formatScore(agent.priority.averageAll),
      ),
    );

    if (agent.diagnostics.length > 0) {
      row.title = agent.diagnostics.join("\n");
    }
    body.append(row);
  }

  function createPanel(documentNode, onRefresh) {
    const { SORT_MODES, SORT_MODE_LABELS, prioritizeAgents } = namespace.domain;
    const {
      FILTER_FIELDS,
      FILTER_LABELS,
      getFilterOptions,
      filterAgents,
    } = namespace.agentMetadata;
    documentNode.getElementById(PANEL_ID)?.remove();

    const panel = createElement(documentNode, "section", "fae-priority-panel");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "FAE agent priorities");
    documentNode.body.append(panel);

    let profile = {
      profileUid: null,
      agents: [],
      diagnostics: [],
      pendingTooltipCount: 0,
    };
    let sortMode = SORT_MODES.COMBINED;
    const filters = {
      [FILTER_FIELDS.TYPE]: null,
      [FILTER_FIELDS.ELEMENT]: null,
      [FILTER_FIELDS.RANK]: null,
    };
    let collapsed = false;
    let showAudit = false;
    let sortMenuOpen = false;
    let filterMenuOpen = false;

    function render() {
      panel.replaceChildren();
      panel.classList.toggle("is-collapsed", collapsed);

      const filterOptions = Object.fromEntries(
        Object.values(FILTER_FIELDS).map((field) => [
          field,
          getFilterOptions(profile.agents, field),
        ]),
      );
      for (const field of Object.values(FILTER_FIELDS)) {
        if (filters[field] && !filterOptions[field].includes(filters[field])) {
          filters[field] = null;
        }
      }
      const filteredAgents = filterAgents(profile.agents, filters);
      const activeFilterCount = Object.values(filters).filter(Boolean).length;

      const header = createElement(documentNode, "header", "panel-header");
      const headingGroup = createElement(documentNode, "div", "heading-group");
      headingGroup.append(
        createElement(documentNode, "h2", "panel-title", "Agent Priorities"),
      );
      headingGroup.append(
        createElement(
          documentNode,
          "small",
          "profile-label",
          profile.profileUid ? `UID ${profile.profileUid}` : "FAE profile",
        ),
      );
      header.append(headingGroup);

      const headerActions = createElement(documentNode, "div", "header-actions");
      const refreshButton = createElement(
        documentNode,
        "button",
        "icon-button",
        "↻",
      );
      refreshButton.type = "button";
      refreshButton.title = "Refresh priorities";
      refreshButton.setAttribute("aria-label", "Refresh priorities");
      refreshButton.addEventListener("click", onRefresh);
      headerActions.append(refreshButton);

      const collapseButton = createElement(
        documentNode,
        "button",
        "icon-button",
        collapsed ? "▾" : "▴",
      );
      collapseButton.type = "button";
      collapseButton.title = collapsed ? "Expand panel" : "Collapse panel";
      collapseButton.setAttribute(
        "aria-label",
        collapsed ? "Expand priority panel" : "Collapse priority panel",
      );
      collapseButton.addEventListener("click", () => {
        collapsed = !collapsed;
        render();
      });
      headerActions.append(collapseButton);
      header.append(headerActions);
      panel.append(header);

      if (collapsed) {
        return;
      }

      const content = createElement(documentNode, "div", "panel-content");
      const completeCount = profile.agents.filter(
        (agent) => agent.status === "complete",
      ).length;
      const incompleteCount = profile.agents.length - completeCount;
      let summaryText = `${completeCount} scored`;
      if (incompleteCount > 0) {
        summaryText += ` · ${incompleteCount} incomplete`;
      }
      if (profile.pendingTooltipCount > 0) {
        summaryText += ` · waiting for ${profile.pendingTooltipCount} tooltip${
          profile.pendingTooltipCount === 1 ? "" : "s"
        }`;
      }
      if (activeFilterCount > 0) {
        summaryText += ` · showing ${filteredAgents.length}`;
      }
      const summaryRow = createElement(documentNode, "div", "panel-summary-row");
      summaryRow.append(
        createElement(documentNode, "p", "panel-summary", summaryText),
      );
      const detailsButton = createElement(
        documentNode,
        "button",
        "details-toggle",
        showAudit ? "Hide details" : "Show details",
      );
      detailsButton.type = "button";
      detailsButton.setAttribute("aria-pressed", String(showAudit));
      detailsButton.addEventListener("click", () => {
        showAudit = !showAudit;
        render();
      });
      summaryRow.append(detailsButton);
      content.append(summaryRow);

      const controls = createElement(documentNode, "div", "list-controls");

      const sortMenu = createElement(
        documentNode,
        "details",
        "control-menu sort-menu",
      );
      sortMenu.open = sortMenuOpen;
      sortMenu.addEventListener("toggle", () => {
        sortMenuOpen = sortMenu.open;
      });
      const sortSummary = createElement(
        documentNode,
        "summary",
        "control-summary",
        "Sort by...",
      );
      sortSummary.append(
        createElement(
          documentNode,
          "small",
          "control-current",
          SORT_MODE_LABELS[sortMode],
        ),
      );
      sortMenu.append(sortSummary);

      const sortOptions = createElement(
        documentNode,
        "div",
        "dropdown-panel sort-options",
      );
      sortOptions.setAttribute("role", "group");
      sortOptions.setAttribute("aria-label", "Priority sort");
      for (const mode of Object.values(SORT_MODES)) {
        const button = createElement(
          documentNode,
          "button",
          "sort-button",
          SORT_MODE_LABELS[mode],
        );
        button.type = "button";
        button.classList.toggle("is-active", mode === sortMode);
        button.setAttribute("aria-pressed", String(mode === sortMode));
        button.addEventListener("click", () => {
          sortMode = mode;
          sortMenuOpen = false;
          render();
        });
        sortOptions.append(button);
      }
      sortMenu.append(sortOptions);
      controls.append(sortMenu);

      const filterMenu = createElement(
        documentNode,
        "details",
        "control-menu filter-menu",
      );
      filterMenu.open = filterMenuOpen;
      filterMenu.addEventListener("toggle", () => {
        filterMenuOpen = filterMenu.open;
      });
      const filterSummary = createElement(
        documentNode,
        "summary",
        "control-summary",
        "Filter by...",
      );
      if (activeFilterCount > 0) {
        filterSummary.append(
          createElement(
            documentNode,
            "small",
            "active-filter-count",
            String(activeFilterCount),
          ),
        );
      }
      filterMenu.append(filterSummary);

      const filterOptionsPanel = createElement(
        documentNode,
        "div",
        "dropdown-panel filter-options",
      );
      for (const field of Object.values(FILTER_FIELDS)) {
        const label = createElement(documentNode, "label", "filter-field");
        label.append(
          createElement(
            documentNode,
            "span",
            "filter-label",
            FILTER_LABELS[field],
          ),
        );

        const select = createElement(
          documentNode,
          "select",
          "filter-select",
        );
        const allOption = createElement(documentNode, "option", null, "All");
        allOption.value = "";
        select.append(allOption);
        for (const value of filterOptions[field]) {
          const option = createElement(documentNode, "option", null, value);
          option.value = value;
          select.append(option);
        }
        select.value = filters[field] ?? "";
        select.addEventListener("change", () => {
          filters[field] = select.value || null;
          filterMenuOpen = true;
          render();
        });
        label.append(select);
        filterOptionsPanel.append(label);
      }

      if (activeFilterCount > 0) {
        const clearButton = createElement(
          documentNode,
          "button",
          "clear-filters",
          "Clear filters",
        );
        clearButton.type = "button";
        clearButton.addEventListener("click", () => {
          for (const field of Object.values(FILTER_FIELDS)) {
            filters[field] = null;
          }
          filterMenuOpen = false;
          render();
        });
        filterOptionsPanel.append(clearButton);
      }
      filterMenu.append(filterOptionsPanel);
      controls.append(filterMenu);
      content.append(controls);

      if (profile.agents.length === 0) {
        const emptyMessage = profile.diagnostics[0] ?? "No FAE agents were found.";
        content.append(createElement(documentNode, "p", "empty-state", emptyMessage));
        panel.append(content);
        return;
      }

      if (filteredAgents.length === 0) {
        content.append(
          createElement(
            documentNode,
            "p",
            "empty-state",
            "No agents match the selected filters.",
          ),
        );
        panel.append(content);
        return;
      }

      const tableWrapper = createElement(documentNode, "div", "table-wrapper");
      const table = createElement(documentNode, "table", "priority-table");
      const head = createElement(documentNode, "thead");
      const headRow = createElement(documentNode, "tr");
      for (const [text, title] of [
        ["Agent", "Agent build and per-disc audit values"],
        ["Set", "Disc set issues"],
        ["D1–3", "Average Total score for discs 1 through 3"],
        ["D4–6", "Average Total score for discs 4 through 6"],
        ["All", "Average Total score for all six discs"],
      ]) {
        const headerCell = createElement(documentNode, "th", null, text);
        headerCell.scope = "col";
        headerCell.title = title;
        headRow.append(headerCell);
      }
      head.append(headRow);
      table.append(head);

      const body = createElement(documentNode, "tbody");
      const prioritized = prioritizeAgents(filteredAgents, sortMode);
      prioritized.forEach((agent, index) =>
        appendAgentRow(documentNode, body, agent, index + 1, showAudit),
      );
      table.append(body);
      tableWrapper.append(table);
      content.append(tableWrapper);

      const note = createElement(
        documentNode,
        "p",
        "panel-note",
        "Lower averages are higher priority. Hover incomplete rows for details.",
      );
      content.append(note);
      panel.append(content);
    }

    render();

    return Object.freeze({
      update(nextProfile) {
        profile = nextProfile;
        render();
      },
      remove() {
        panel.remove();
      },
    });
  }

  namespace.ui = Object.freeze({
    PANEL_ID,
    createPanel,
    formatScore,
    formatAgentLabel,
    buildDiscAudit,
  });
})(globalThis);
