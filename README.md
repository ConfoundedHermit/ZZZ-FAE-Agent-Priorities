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
average. Separate Set fixes, Discs 1–3, Discs 4–6, and All discs buttons expose
each priority independently.

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

- **Combined** puts agents with Set-score issues first, followed by the lowest
  discs 1–3 average and then the lowest discs 4–6 average.
- **Set fixes** prioritizes the number and severity of Set-score issues.
- **Discs 1–3** and **Discs 4–6** sort directly by the selected group's average.
- **All discs** sorts by the average Total score across all six discs and appears
  as the final priority option.
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

## Package as a CRX

A CRX is a signed package of the generated extension. Build `dist` before
packing it:

```powershell
npm run build
```

For the first package:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Pack extension**.
3. Set **Extension root directory** to this repository's `dist` directory.
4. Leave **Private key file** empty, then select **Pack extension**.
5. Note the paths Chrome reports for the generated `.crx` package and `.pem`
   private key.

Store the `.pem` file securely outside the repository. Never publish or share
it: the key signs extension updates, and losing it prevents future packages from
retaining the same extension ID.

To package an update, increment the version in both `package.json` and
`static/manifest.json`, run `npm run build`, then repeat **Pack extension** and
select the original `.pem` under **Private key file**.

Chrome can also package the extension from PowerShell. Adjust `chromePath` if
Chrome is installed elsewhere. Omit the key argument only for the first package:

```powershell
$chromePath = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$extensionRoot = (Resolve-Path .\dist).Path

# First package: Chrome generates a new private key.
& $chromePath "--pack-extension=$extensionRoot"

# Updates: reuse the securely stored private key.
$keyPath = "C:\secure\fae-agent-priorities.pem"
& $chromePath "--pack-extension=$extensionRoot" "--pack-extension-key=$keyPath"
```

Direct CRX installation is restricted for regular Chrome users on Windows and
macOS. Use the Chrome Web Store for general distribution; CRX packages remain
useful for controlled testing, automation, and supported self-hosted setups.
See Chrome's official documentation for [packing extensions](https://developer.chrome.com/docs/chromedriver/extensions)
and [installation restrictions](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions).

## Project layout

```text
src/domain/priorities.js       Pure calculations and comparators
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
- No `tabs`, `storage`, `cookies`, `webRequest`, or broad host permissions.
- Page-derived text is rendered with DOM `textContent`, not HTML injection.
- The parser follows each disc's `data-tooltip-content-id` and validates every
  percentage before calculating a result.

## Known limitations

- The integration depends on FAE's current semantic DOM structure. Parsing is
  isolated in one adapter and covered by a regression fixture.
- Chromium is the validated packaging target. The implementation uses ordinary
  content-script and DOM APIs, but Firefox packaging has not yet been tested.
