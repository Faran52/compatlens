---
paths:
  - "src/**/*.{ts,tsx}"
  - "vite.config.ts"
  - "tsconfig.json"
---

# Repository Structure

The layout and the rule for where a helper goes live in
[README.md](../../README.md), under "## Architecture", so contributors and agents
read the same file. Read it before adding, moving or renaming a source file.

The short version, which that section states in full: a component reusable by
nature belongs in `src/components/ui` even with one consumer; `partials/` holds
only components bound to their parent's data, each justifiable in one sentence;
`src/utils` takes a helper with no domain type in its signature; a `utils/`
folder beside a component takes real logic; and a type or literal constant
belongs in the component file itself.

Keep the rules themselves out of this file: two copies drift, and the last pair
did.
