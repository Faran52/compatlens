---
paths:
  - "**/*.test.{ts,tsx}"
  - "__mocks__/**/*"
  - "vitest.config.ts"
  - "e2e/**/*"
---

# Testing Rules

The rules live in [docs/testing.md](../../docs/testing.md), so contributors and
agents read the same file. Read it before writing or changing a test.

This file exists only to carry the `paths` above, which decide when that
document gets loaded. Keep the rules themselves out of it: two copies drift, and
the last pair did.
