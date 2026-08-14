---
name: verify-rules
description: 'Review a diff for CLAUDE.md, CONTRIBUTING.md and docs/testing.md violations that ESLint and tsc cannot catch. Use when finishing code changes, before a commit, or when the user says "verify the rules", "check my diff against the rules", or "run the verifier".'
---

# verify-rules

The semantic second pass after implementation. `pnpm lint` and `pnpm typecheck` catch syntax and
types; this catches rule drift, documentation that no longer matches the code, and tests that cannot
fail. Report by default; edit only after the user approves.

## Scope

- Review unstaged and staged diffs, not the whole repository.
- Flag new violations in touched hunks and touched surfaces. Untouched legacy debt is accepted debt.
- This runs alongside `pnpm check`, never instead of it.

## Workflow

1. **Scope the diff:** `git diff --name-only`, `git diff`, `git diff --staged`.
2. **Load details:** read `CONTRIBUTING.md`, `docs/testing.md`, and the layout rule in `README.md`.
3. **Inspect hunks:** review touched paths, following consumers when a change can silently break one.
4. **Prove the tests hold:** for each behaviour claimed, break the implementation and confirm the
   relevant test fails, then restore. A test that passes against broken code is the finding.
5. **Report findings:** bugs first, grouped by file, with `file:line`, the rule, and a concrete fix.
6. **Wait for approval:** offer all, some, or none. Do not edit before the user chooses.
7. **Verify fixes:** rerun `pnpm check` and, where the change touches the panel, `pnpm e2e`.

## Report Format

| # | File | Rule | Finding | Fix |
|---|---|---|---|---|

If clean, say so plainly and name any verification that was not run.

## Review Map

| Area | What to look for |
|---|---|
| Honesty | A page reported clean that was not fully read. Any new instance is a release blocker. |
| Comments | More than one line, restating code, a label, a paragraph above a declaration, an em dash. |
| Tests | A comment in a unit test, an assertion on a class name or private state, a test that cannot fail. |
| Coverage | A branch executed but not asserted. 100% is not proof; mutate the line and rerun. |
| Types | Any cast, `any`, or `unknown` outside a narrowing guard at a browser or dataset boundary. |
| Suppressions | `eslint-disable`, `@ts-expect-error`, or a new `/* v8 ignore */`. |
| Solid | Destructured or copied `props`, or logic inside a coverage-excluded `.tsx`. |
| Placement | A helper with no domain type outside `src/utils`; a type declared away from its component. |
| Barrels | An export nothing outside the folder imports, or a name crossing a boundary unpublished. |
| Docs | A claim in `README.md`, `docs/privacy.md` or `CONTRIBUTING.md` the code no longer satisfies. |
| Permissions | Anything widening the manifest, adding a fetch, or sending data anywhere. |

## Decision Rules

- A pre-existing, untouched violation is not a required fix; say it is pre-existing.
- If a touched change exposes a broken consumer, the consumer is part of the touched surface.
- Verify a claim before reporting it. Run the command, read the file, mutate the code.
- If a rule seems wrong, say so explicitly. Never suggest a suppression, a cast, or `--no-verify`.
