/* global FAEPriorities */
(async function runBrowserRegression() {
  const result = document.getElementById("result");
  const { extractProfile } = FAEPriorities.faeDom;
  const { derivePriority } = FAEPriorities.domain;

  function check(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function loadFixture(filename) {
    return new Promise((resolve) => {
      const frame = document.createElement("iframe");
      frame.style.width = "1280px";
      frame.style.height = "900px";
      frame.onload = () => resolve(frame);
      frame.src = filename;
      document.body.append(frame);
    });
  }

  function clickVisible(doc, selector) {
    const button = doc.querySelector(selector);
    check(button, `missing control: ${selector}`);
    const rect = button.getBoundingClientRect();
    const hit = doc.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    check(hit && button.contains(hit), `control cannot receive pointer input: ${selector}`);
    hit.click();
  }

  function checkPanelBounds(doc) {
    const panel = doc.querySelector("#fae-priority-extension-root");
    const bounds = panel.getBoundingClientRect();
    const header = panel.querySelector(".panel-header").getBoundingClientRect();
    const navigation = doc.querySelector(".site-navigation").getBoundingClientRect();
    check(header.left >= bounds.left && header.right <= bounds.right,
      "panel header stays inside panel width");
    check(header.top >= bounds.top && header.bottom <= bounds.bottom,
      "panel header stays inside panel height");
    check(bounds.top >= navigation.bottom + 8, "panel clears site navigation");
    check(bounds.left >= 0 && bounds.right <= doc.documentElement.clientWidth,
      "panel stays inside viewport width");
    check(bounds.bottom <= doc.documentElement.clientHeight,
      "panel stays inside viewport height");
    return bounds;
  }

  async function checkPanelControls(frame) {
    const doc = frame.contentDocument;
    for (const [width, height] of [[1280, 900], [390, 844]]) {
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      await new Promise((resolve) => setTimeout(resolve, 50));
      const expanded = checkPanelBounds(doc);
      check(expanded.width <= 600, "expanded panel has a bounded width");
      clickVisible(doc, '[aria-label="Collapse priority panel"]');
      check(!doc.querySelector(".panel-content"), "collapse hides panel content");
      check(checkPanelBounds(doc).width === 240, "collapsed panel is compact");
      clickVisible(doc, '[aria-label="Expand priority panel"]');
      check(doc.querySelector(".panel-content"), "expand restores panel content");
      check(checkPanelBounds(doc).width === expanded.width, "expand restores panel width");
      clickVisible(doc, '[aria-label="Refresh priorities"]');
      clickVisible(doc, ".details-toggle");
      check(doc.querySelector(".disc-audit"), "details button shows disc audit");
      clickVisible(doc, ".details-toggle");
      check(!doc.querySelector(".disc-audit"), "details button hides disc audit");
    }
  }

  try {
    for (const filename of ["profile-fragment.html", "profile-legacy.html"]) {
      const frame = await loadFixture(filename);
      const doc = frame.contentDocument;
      const profile = extractProfile(doc);
      check(profile.profileUid === "fixture-profile", `${filename}: profile UID`);
      check(profile.agents.length === 2, `${filename}: card count`);
      const [agent, emptyAgent] = profile.agents;
      check(agent.name === "Fixture Alpha" && agent.mindscape === "M1", `${filename}: heading`);
      check(agent.key === "fixture-alpha:fixture-build", `${filename}: build identity`);
      check(agent.dedicatedUrl.endsWith("/fixture-profile/fixture-alpha"), `${filename}: profile link`);
      check(agent.buildUrl.endsWith("/fixture-alpha/fixture-build"), `${filename}: build link`);
      check(agent.status === "complete" && profile.pendingTooltipCount === 0, `${filename}: complete scores`);
      check(agent.discs.map((disc) => disc.totalScore).join() === "81,82,83,84,85,86", `${filename}: slot scores`);
      const { priority } = derivePriority(agent);
      check(priority.setIssueCount === 3 && priority.lowestSetScore === 85, `${filename}: set priority`);
      check(priority.average1to3 === 82 && priority.average4to6 === 85 && priority.averageAll === 83.5, `${filename}: averages`);
      check(emptyAgent.status === "no-disc-data", `${filename}: empty agent`);
      check(doc.querySelector(".panel-summary").textContent === "1 scored · 1 incomplete", `${filename}: panel summary`);
      check(doc.querySelector(".agent-link").textContent === "Fixture Alpha [M1]", `${filename}: panel label`);
      await checkPanelControls(frame);

      if (filename === "profile-fragment.html") {
        const tooltip = doc.querySelector(".stat-list.slot1 .tier .tooltip-content");
        tooltip.querySelector("li:last-child span").textContent = "51%";
        // Exercise the real bootstrap observer: no manual panel refresh.
        await new Promise((resolve) => setTimeout(resolve, 400));
        check(doc.querySelector(".fae-priority-row").textContent.includes("72%"), "mutation refresh recalculates D1–3");
      }
      frame.contentWindow.__FAE_AGENT_PRIORITIES_CLEANUP__();
      frame.remove();
    }

    const frame = await loadFixture("profile-saved.html");
    const doc = frame.contentDocument;
    const saved = extractProfile(doc);
    check(saved.pendingTooltipCount === 6, "saved snapshot has six empty inline tooltips");
    check(saved.agents[0].status === "incomplete" && saved.agents[0].discs.length === 0, "tier badges cannot replace numeric scores");
    check(derivePriority(saved.agents[0]).priority.averageAll === null, "missing scores stay unknown");
    const tooltip = doc.querySelector(".stat-list.slot1 .tooltip-content");
    for (const [label, value] of [["Set score:", "100%"], ["Total score:", "60%"]]) {
      const row = doc.createElement("li");
      const strong = doc.createElement("strong");
      strong.textContent = label;
      const span = doc.createElement("span");
      span.textContent = value;
      row.append(strong, span);
      tooltip.append(row);
    }
    check(extractProfile(doc).pendingTooltipCount === 5, "inline scores recover after population");
    frame.remove();
    result.textContent = "PASS";
    result.dataset.status = "pass";
  } catch (error) {
    result.textContent = error.stack;
    result.dataset.status = "fail";
  }
})();
