# Privacy

CompatLens runs entirely inside your DevTools. There is no account, no backend and no analytics. The
extension makes no request of its own to anywhere: the compatibility data is compiled in at build
time. Stylesheet bodies come from the DevTools resource APIs, which serve them from what the page
already loaded, and, where those APIs hand back nothing, from the page re-fetching its own
stylesheets at the addresses it already linked. Those are the only requests CompatLens causes, they
are made by the page rather than by the extension, they usually come straight out of the HTTP cache,
and you can watch them in the Network panel. The extension is a devtools page, a panel page, an
analysis worker and four icons.

Most claims below name the file that backs them, so you can check rather than take my word.

## What it reads

Three things. Nothing else is touched.

**The page's rendered markup.** A `MutationObserver` installed in the page queues elements as they
are added, and the panel drains that queue every 750 ms. Only the queued subtrees are serialised,
with `outerHTML`, plus the `innerHTML` of any shadow root found inside them. Shadow content is
included because a component built with `attachShadow()` would otherwise scan as an empty tag.

Two situations queue the whole document. One is installing the observer, because an observer on its
own reports only what is new. The other is changing the compatibility target, because that re-judges
everything already on screen. Nothing else causes a full read. See
`src/extension/devtools-api/pageObserver.ts`.

Serialised markup is markup: element names, attributes and the text between them, as the browser
currently holds it. The HTML detectors match element and attribute *names*, never attribute values
(`src/lib/engine/detectors/detectHtmlFeatures.ts`). One kind of text does get read: the contents of
`<style>` elements are lifted out and parsed as CSS, because a page that styles itself inline would
otherwise go unchecked (`src/lib/engine/detectors/extractInlineStyles.ts`).

**The page's address at drain time.** `location.href` comes back with each batch and becomes the
route the batch is attributed to. It is the full URL, query string and fragment included.

**Stylesheet bodies.** `chrome.devtools.inspectedWindow.getResources()` lists what the page loaded,
the DevTools network log supplies the MIME types that listing does not carry, and anything served as
`text/css` or ending in `.css` has its body fetched and decoded. `data:` URLs are skipped, because
such a URL *is* its own content. See `src/extension/devtools-api/resourceBodies.ts` and
`src/extension/collectLive.ts`.

Not every browser implements both of those APIs, and one that logs a stylesheet request may still
refuse to hand back the body. So the page is also asked to read its own: the observer walks
`document.styleSheets`, and for each sheet with an `href` that is not a `data:` URL it calls
`fetch()` on that same address once, from the page's own context, with the page's own cookies and
cache. Nothing else is requested, no address is invented, and a fetch that fails is dropped without a
retry. That call is the one `fetch(` in the source, in the injected snippet in
`src/extension/devtools-api/pageObserver.ts`. A DevTools body wins wherever there is one, and a
stylesheet neither source could read raises a warning in the panel; the warning names no URL.

That is the entire input. CompatLens does not read cookies, `localStorage`, `sessionStorage`, request
or response headers, request bodies, authentication tokens, browsing history, or JavaScript sources.
There is no code path that reaches any of them: `grep` the tree for `chrome.storage`, `localStorage`
or `document.cookie` and you get nothing.

## What it keeps

Markup and CSS go to a Web Worker, are parsed with parse5 and PostCSS, and are dropped the moment
findings come out. Neither the serialised markup nor the parse trees are retained.

What survives a batch is the finding: a feature ID and name, the matched syntax, the risk level, the
URL and tree path and line where it was seen, which browsers it affects, the fallback sentence from
the catalog, and an MDN link. Alongside those the session holds the list of routes it has seen (full
URLs, as above), counts of resources parsed and features matched, and any warnings. A warning raised
by a parser failure names the file that failed, with its query string and fragment removed
(`src/lib/engine/engine.ts`).

All of it lives in the panel's memory and nowhere else. Nothing is written to `chrome.storage`,
nothing is written to disk, nothing survives the panel closing. Your theme, target and filter
choices are ordinary component state and go the same way. The session caps at 5000 occurrences and
tells you in the panel when it has.

The panel displays the page's host in the top bar and a count of routes in the status line. Findings
show a file name, not a full address. Nothing the panel puts on screen carries a query string.

## What leaves the machine

Nothing.

Compatibility data is compiled into the extension at build time from pinned versions of
`@mdn/browser-compat-data`, `web-features` and `baseline-browser-mapping`, so a scan needs no network
access at all. Nothing about your page, your findings or your session is uploaded, and no request
carries anything CompatLens collected.

Two requests can leave the machine, and neither carries data out. One is the page re-fetching a
stylesheet it had already loaded, described above, which reaches only the site you were looking at.
The other is you clicking an MDN link in a finding, which opens in a new tab with
`rel="noreferrer noopener"`.

## Permissions

Neither manifest requests any. No `permissions` key, no `host_permissions`, no `<all_urls>`. Both
declare a manifest version, a name, a version, a description, a devtools page and four icons, and
`manifest.firefox.json` adds a `browser_specific_settings` block holding the add-on id and the
minimum Firefox version. `public/manifest.json` is thirteen lines long and the Firefox one is
nineteen; you can read either whole at a glance.

CompatLens uses `chrome.devtools.panels` to create the panel, then `chrome.devtools.inspectedWindow`
and `chrome.devtools.network` to read. A devtools page gets these without asking for them, and they
reach only the page whose DevTools is open.

Closing DevTools destroys the panel but runs nothing inside the page, so the observer has to notice
on its own. Each drain stamps the time; an observer that goes three seconds without one disconnects
itself and deletes its own global (`src/extension/devtools-api/pageObserver.ts`). Until that fires,
at most one batch of element references is held and never read.

`pnpm package` fails the build if a `permissions` or `host_permissions` key ever appears in either
shipped manifest. It reads the Chrome one back out of `dist/`, so the bytes it checks are the bytes
that go into the archive. That check is `scripts/packageExtension.js`.
