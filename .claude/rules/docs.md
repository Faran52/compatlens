---
paths:
  - "*.md"
  - "docs/**/*.md"
  - "CLAUDE.md"
  - ".claude/**/*.md"
---

# Documentation Rules

## Where a fact lives

Each fact has exactly one home, and everything else points at it:

- What the tool does and its limits, plus the `src/` layout: `README.md`
- What it reads, keeps and exports: `docs/privacy.md`
- Type and code standards: `CONTRIBUTING.md`
- Testing rules: `docs/testing.md`
- Dependency versions and scripts: `package.json`

Never restate one of those in another file. Link to it. The rule files under
`.claude/rules/` are pointers for that reason: the last pair that held real
copies drifted apart.

## Keeping documentation true

- Documentation that no longer matches the code is a defect, not a tidy-up.
  Resolve the disagreement rather than inventing a third behaviour.
- A claim about behaviour is a claim to verify. Count the `fetch(` calls before
  saying how many there are; run the command before quoting its output.
- A feature that ships undocumented is unfinished. A limitation that is real and
  unstated is worse.
- No em dashes, in prose or in user-facing strings.

## Claude customisations

- Keep `CLAUDE.md` short; it loads on every session.
- Put standards that only matter for certain files in a path-scoped
  `.claude/rules/*.md`, and carry the `paths` frontmatter, or the rule never
  loads.
- Use skills for task-specific workflows and review checklists, with an explicit
  description naming the trigger phrases.
- `CLAUDE.md`, `AGENTS.md` and `.claude/` are gitignored here. Nothing in them
  ships, so nothing in them may be the only record of a decision.
