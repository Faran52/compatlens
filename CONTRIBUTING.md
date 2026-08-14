# Contributing

Thanks for looking. CompatLens is a DevTools panel for Chrome and Firefox with no backend and no
accounts. The extension itself makes no request of its own: the only network traffic it causes is
the inspected page re-fetching stylesheets it had already loaded, because some browsers hand
DevTools no stylesheet body at all. Contributions need to keep it that way.

## Getting set up

Node 24 and pnpm 11.20 or newer; `corepack enable` picks up the pinned version.

```bash
pnpm install
pnpm check      # lint, typecheck, tests at 100% coverage, production build
pnpm e2e        # Playwright, against the preview build and the fixtures
pnpm package    # verifies both manifests and writes the Chrome and Firefox archives
```

`pnpm check` has to pass before a change is ready. It is the same command CI runs.

## What will get a change rejected

- Anything that sends data anywhere, stores it outside the panel's own memory, or widens the
  manifest. The manifest requests no permissions and `pnpm package` fails if that changes.
- Suppression comments. No `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`, no
  `/* v8 ignore */` outside the narrow compiler-guard case described below. Where a rule genuinely
  cannot be met, the exemption goes in `eslint.config.js` or `vitest.config.ts` with its reason
  written beside it, so there is one place to review rather than many places to miss.
- Documentation that no longer matches the code. If the two disagree, fix the disagreement rather
  than picking a third behaviour.

## Type and code standards

These are enforced by `pnpm lint` wherever a rule can express them, and by review
where none can. There are no cast exceptions and no `@ts-expect-error` exceptions.

### Components

- Arrow functions only.
- Max line length 120. No `console` except `warn` and `error`.
- Never destructure props, in the signature or the body. Solid's `props` is a
  getter proxy, so reading a field off it once freezes that value and the
  component stops updating. Always read `props.x` at the point of use, and
  never copy props into an object of your own: `const copy = { ...props }`
  freezes every field the same way destructuring does.
- Pass props one by one rather than spreading. `<Child {...props} />` does keep
  its reactivity, because the JSX transform hands the getters through, so this
  is about the call site saying what the child receives rather than about
  correctness.
- One component per file, named after the file.
- Status must use a label or icon with color. Never communicate state through
  color alone.
- Respect `prefers-color-scheme` and `prefers-reduced-motion`.

### Types

- Never use `any`, `unknown`, or `Record<string, unknown>`.
  - `unknown` is allowed only as the input of a narrowing type guard at a
    genuinely dynamic browser or dataset boundary with no upstream type. It
    must be narrowed before use.
- Do not use casts to satisfy a type, including in tests. No `as X`,
  `as unknown as X`, or `as never`.
- Do not use `@ts-ignore`, `@ts-expect-error`, or `eslint-disable` to get past
  a type.
- Trace a type through its consumers instead of assuming it.
- Name object shapes with an `interface` or `type` declaration after imports.
  Do not use inline object type literals or index signatures.
- A folder may publish a barrel `index.ts`. Import across a boundary through the
  barrel, and within a folder by relative path, so a barrel never imports itself.
  Sibling folders under the same barrel import each other relatively, for that
  same reason.
- A barrel publishes what crosses its boundary and nothing else. A name only its
  own folder uses is not exported.
- Do not add alias or backward-compatibility re-exports beyond that barrel.
- Keep the DevTools APIs behind narrow interfaces so the engine and tests never
  depend on the ambient `chrome` global. Chrome and Firefox do not implement the
  same surface, and the facade is where that difference is modelled honestly,
  with optional members rather than casts.

### Comments

- One line, never more. No block comments, no JSDoc, no paragraph above a
  declaration. If it takes a paragraph, the code needs a better name.
- Put it inline at the end of the line it explains where it fits inside the 120
  column limit, and on the line directly above where it does not. Never split
  one comment across two lines to dodge that.
- A comment explains why: the constraint, measurement, or bug behind the code.
  Delete comments that merely restate it, and comments a good name replaces.
  A comment that only labels a section is one to delete.
- No em dashes, in comments or in user-facing strings.
- Do not put comments in test files. Test names carry the meaning.

## Testing

The rules live in [docs/testing.md](docs/testing.md). The short version: colocate unit tests beside
their source, assert behaviour rather than implementation, build fixtures with real DOM and typed
fakes instead of casts, and break the implementation to watch the test fail before calling it done.
