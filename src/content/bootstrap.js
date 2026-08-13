(function bootstrapFaePriorities(root) {
  "use strict";

  const namespace = root.FAEPriorities;
  if (!namespace?.domain || !namespace?.faeDom || !namespace?.ui) {
    console.error("FAE Agent Priorities could not initialize its modules.");
    return;
  }

  root.__FAE_AGENT_PRIORITIES_CLEANUP__?.();

  let refreshTimer = null;
  let pendingRetryTimer = null;
  let pendingRetryCount = 0;
  let lastPendingCount = 0;

  const panel = namespace.ui.createPanel(document, refresh);

  function refresh() {
    if (pendingRetryTimer !== null) {
      clearTimeout(pendingRetryTimer);
      pendingRetryTimer = null;
    }

    const profile = namespace.faeDom.extractProfile(document);
    panel.update(profile);

    if (profile.pendingTooltipCount === 0) {
      pendingRetryCount = 0;
      lastPendingCount = 0;
      return;
    }

    if (profile.pendingTooltipCount < lastPendingCount) {
      pendingRetryCount = 0;
    }
    lastPendingCount = profile.pendingTooltipCount;

    if (pendingRetryCount < 20) {
      pendingRetryCount += 1;
      pendingRetryTimer = setTimeout(refresh, 500);
    }
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, 250);
  }

  function mutationIsOutsidePanel(mutation) {
    const target =
      mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target
        : mutation.target.parentElement;
    return !target?.closest?.(`#${namespace.ui.PANEL_ID}`);
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some(mutationIsOutsidePanel)) {
      scheduleRefresh();
    }
  });
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  root.addEventListener("popstate", scheduleRefresh);
  refresh();

  root.__FAE_AGENT_PRIORITIES_CLEANUP__ = () => {
    observer.disconnect();
    root.removeEventListener("popstate", scheduleRefresh);
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }
    if (pendingRetryTimer !== null) {
      clearTimeout(pendingRetryTimer);
    }
    panel.remove();
    delete root.__FAE_AGENT_PRIORITIES_CLEANUP__;
  };
})(globalThis);
