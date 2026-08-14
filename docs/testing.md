# Testing Rules

## Infrastructure

- Use Vitest with happy-dom and Solid Testing Library. Colocate unit tests as
  `X.test.ts` or `X.test.tsx` beside their source.
- Use one Vitest import style consistently within each file.
- Test data, fakes and global setup live in `__mocks__/`, split by domain and
  published through its barrel. Import them as `@mocks`; never inline a copy.
- Use Playwright only for built-panel layout, theme, keyboard, and responsive
  behavior that unit tests cannot verify reliably.

## Standard

- Use zero casts. Build real fixtures with DOM APIs, `Response`, and the typed
  Chrome facade.
- Test behavior and integration. Assert text, roles, labels, attributes, and
  what appears or disappears. Do not assert private state or CSS class names.
- Do not use jest-dom matchers. Use Testing Library queries and native DOM
  properties.
- Do not put comments in a unit test. The test name says what it protects, and a
  helper that needs explaining wants a better name instead.
- A Playwright spec may carry one, because a browser-level constraint has no
  name that can hold it: why a wait targets one selector and not another, or
  what the harness cannot observe from where it stands. The same rule as source
  applies, so it explains why and never restates the code.
- Avoid redundancy. If two tests fail for the same edit, keep the stronger one.
- Keep one test file per source file. A file that declares only types and
  constants is covered by the test of whatever consumes it.
- Break the implementation and watch the relevant test fail before calling the
  test complete, then restore the implementation.
- Require 100 percent line and branch coverage of touched source with behavior
  tests. Run `pnpm test:coverage`.
- Solid compiles a template into branches no source-level test can reach, so
  `src/components/**/*.tsx` is excluded from coverage in one declared place,
  `EXCLUDE_COVERAGE`. Never a V8 ignore comment in a component. The exclusion is
  only honest because components carry no logic: every condition, mapping and
  calculation lives in a `*Utils` module covered at 100 percent, and components
  are still tested for behaviour. A component needing its own branches tested is
  a component doing too much.
- Make meaningful state observable through accessible output or a stable data
  attribute instead of inspecting implementation details.
- A compiler-required runtime guard that genuinely cannot execute may use a
  narrowly scoped V8 ignore comment with the reason. It is not a substitute
  for testing reachable branches.

## What no test covers

No automated test loads the extension into a browser, in either engine.
Playwright cannot reach a DevTools panel's `chrome.devtools` APIs, so the suite
exercises the injected expressions against a real Chromium page and the panel
against a served preview build. The DevTools API surface itself is checked by
hand, on both Chrome and Firefox, before a release.
