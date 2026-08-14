# Testing Rules

Use these rules when touching tests, mocks, or test setup.

## Infrastructure

- Vitest with `happy-dom`. Tests colocate as `X.test.ts` beside their source.
- Vitest globals are available without import. Do not mix bare and imported styles in one file.
- `__mocks__/setupTests.ts` is the run's `setupFiles`, wired from `vitest.config.ts`. It ships
  empty, apart from `TEST_QUERY_OPTIONS` when the project answered `tanstack-query`: it is where a
  global stub is registered, and a project with no modules yet has nothing to stub.
- Global mocks belong beside the setup file under `__mocks__/`, registered from it, and exist
  for **determinism, not for gaps**.
  `happy-dom` supplies `matchMedia` and `requestAnimationFrame`, but its `matchMedia` answers every
  query `false` and its rAF runs on a real timer, so neither the reduced-motion branch nor anything
  frame-driven is reachable without taking control of them.
- There is no framework renderer. A component module builds DOM and is tested by appending its
  output to `document.body` and querying it back, the same assertions a rendering library would
  make, without the library.
- **`lib/` is testable without a browser.** Keep it free of `document` and `chrome`, and its tests
  need no environment at all.
- The extension APIs (`chrome.*` / `browser.*`) do not exist under Vitest. Mock the namespace
  globally in setup with the shape the code actually calls, and assert on the calls.
- A content script and a background worker never share a realm. Test the message contract between
  them as data (build the message, assert the handler's response), not by wiring them together.


## Standard

- **Zero casts, including in tests.** No `as X`, `as unknown as X`, `as never`. Build a fixture the
  real types already satisfy: a schema's `parse`, a real store seeded by dispatching the producing
  action, `document.createElement(...)` for elements, `new Response(...)` for fetch. A type you can
  only satisfy with a cast means the test design is wrong, usually a stub standing where the real
  thing should be.
- **Behaviour and integration only.** Assert what a user or assistive technology observes: text,
  roles, labels, attributes, what appears and disappears. Never assert on a hashed CSS Module class
  name, and never on internal state. If the only difference a prop makes is a class name, there is
  nothing to test, say so and skip it.
- **State that matters must be observable.** If a state change shows up only as a hashed class, the
  fix is to expose it (`data-open={open}`), not to assert on the class and not to skip the branch.
- **Mock only external boundaries.** Libraries, network, timers, platform APIs. Never mock a module
  you own to make an assertion easier; that turns the test into a mirror of the implementation.
- **No jest-dom matchers.** `screen.getByX()` for presence, `queryByX(...) === null` for absence,
  typed element values for form state.
- **No comments.** The test name says what it pins.
- **No redundancy.** If two tests fail for the same edit, keep one.
- **One test file per source file**, colocated, mirroring any split of the source.
- **A test that cannot fail is not a test.** Break the code, watch it go red, then revert. Never
  leave the mutation in the tree.
- **Coverage: 100% line and branch** of the source you touched, reached with behaviour tests rather
  than contrived ones.
- **A type-level guard that cannot fire at runtime** gets `// v8 ignore next N -- reason`, with the
  reason stated. That is for a branch the compiler demands and reality cannot reach, such as a ref
  that is always set before effects run. It is not a way to skip a branch you did not want to test.
