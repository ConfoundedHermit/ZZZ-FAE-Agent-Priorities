# FAE Agent Priorities

A Manifest V3 browser extension that adds an upgrade-priority panel to public
[Fairy's Agent Evaluator](https://zfae.net/) profile pages.

The extension reads the profile already rendered in the current tab. It makes no
network requests of its own, stores no profile data, and requests access only to
`https://zfae.net/profile/*`.

## What it ranks

Every supported agent build is shown with:

- The number of discs whose **Set score is below 100%** and the lowest Set score.
- The average per-disc **Total score** for discs 1–3.
- The average per-disc **Total score** for discs 4–6.
- The average per-disc **Total score** across all six discs.

The default Combined order puts agents with Set-score issues first, then sorts by
the lower discs 1–3 average, the lower discs 4–6 average, and finally the all-disc
average. The **Sort by...** menu also exposes Set fixes, Discs 1–3, Discs 4–6,
and All discs independently.

Agents without a complete six-disc score set remain visible at the bottom as
incomplete; missing data is never interpreted as zero.

## Install from source

1. Clone or download the repository and run `npm run build` from its root.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the generated `dist` directory.
6. Open or refresh your FAE profile at `https://zfae.net/profile/<UID>`.

The **Agent Priorities** panel appears in the upper-right corner.

## Using the priority panel

- Open **Sort by...** to choose one of five priority orders. The current choice
  appears beside the menu label:
  - **Combined** puts complete agents with Set-score issues first, then compares
    the discs 1–3 average, discs 4–6 average, and all-disc average.
  - **Set fixes** prioritizes more Set-score issues and then the lowest Set score.
  - **Discs 1–3** and **Discs 4–6** use the selected group's average as the
    primary sort value.
  - **All discs** uses the average Total score across all six discs.
- Open **Filter by...** to set Type, Element, and Rank independently. Each
  dropdown defaults to **All**, and selections across the three dropdowns are
  combined.
- Filter choices contain only classifications represented by agents on the
  current profile. An unrecognized agent contributes an **Unknown** choice to
  its Type, Element, and Rank dropdowns instead of being omitted or guessed.
- Sorting is applied after filtering, and visible row positions are renumbered.
  The summary reports how many agents are shown, while **Clear filters** restores
  all profile agents.
- Lower disc-score averages represent higher upgrade priority. Incomplete agents
  that match the filters remain visible below complete agents.
- Agent rows keep per-disc audit values hidden by default. Use **Show details** to
  reveal them, and **Hide details** to return to the compact view.
- Mindscape levels appear after the agent name, such as `Lighter [M1]`.
- Use the refresh button after updating a profile from Showcase if the panel has
  not already refreshed automatically.
- Use the collapse button to keep the panel available without covering the page.

## Development

The project intentionally has no third-party build or runtime dependencies. Node
20 or newer is sufficient.

```powershell
npm run check
```

That command syntax-checks the source, runs the test suite, and rebuilds `dist`.
Individual commands are:

```powershell
npm run lint
npm test
npm run build
```

The sanitized regression fixture at `tests/fixtures/profile-fragment.html` can
also be opened directly in a browser for a quick UI smoke test.

## Project layout

```text
src/domain/priorities.js       Pure calculations and comparators
src/domain/agent-metadata.js   Local agent type, element, and rank catalog
src/content/fae-dom-adapter.js FAE DOM-to-model extraction
src/content/bootstrap.js       Lifecycle, mutation refresh, and startup
src/ui/panel.js                Safe DOM rendering and interactions
src/ui/panel.css               Styles scoped to the extension root
static/manifest.json           Manifest V3 definition
tests/                         Node tests and sanitized browser fixture
scripts/                       Offline syntax-check and build scripts
dist/                          Generated unpacked extension
```

## Data and permission behavior

- No backend or analytics.
- No cookies, UID, agent, build, or score data is transmitted or persisted.
- Agent classifications are bundled with the extension and looked up by FAE's
  rendered agent slug; filtering does not make a network request.
- No `tabs`, `storage`, `cookies`, `webRequest`, or broad host permissions.
- Page-derived text is rendered with DOM `textContent`, not HTML injection.
- The parser follows each disc's `data-tooltip-content-id` and validates every
  percentage before calculating a result.

## Known limitations

- The integration depends on FAE's current semantic DOM structure. Parsing is
  isolated in one adapter and covered by a regression fixture.
- FAE currently exposes agent slugs but not type, element, or rarity on profile
  cards, so newly added agents remain **Unknown** until the local catalog is
  updated. Explicit FAE metadata will take precedence if those fields are added.
- Chromium is the validated packaging target. The implementation uses ordinary
  content-script and DOM APIs, but Firefox packaging has not yet been tested.
