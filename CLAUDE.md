# CompatLens

CompatLens is a local-only DevTools extension for Chrome and Firefox that scans
the inspected page's loaded HTML and CSS for cross-browser compatibility risks.
It uses official compatibility datasets compiled into the extension at build
time.

## Source of truth

- What the tool does and its limits: `README.md`
- What it reads, keeps and exports: `docs/privacy.md`
- Type and code rules: `CONTRIBUTING.md`
- Testing rules: `docs/testing.md`
- Dependency versions and scripts: root `package.json`

Read both rule files before implementation. If documentation and code disagree,
stop and resolve the disagreement rather than inventing a third behavior.

## Engineering constraints

- Use pnpm only and Node 24.
- Keep TypeScript pinned to the version declared in `package.json`.
- Use arrow functions. Solid component files are PascalCase; other TypeScript
  files are camelCase; source folders are kebab-case.
- One package, no workspace. Keep `src/lib` framework-free, `src/extension` the
  only DevTools-aware layer, and `src/components` presentation-only.
- Keep all analysis local. Do not add telemetry, accounts, a backend, remote
  runtime code, or broad browser permissions.
- Theme modes are exactly `system`, `light`, and `dark`.
- Run `pnpm check` before committing implementation changes.
- Stage only files you changed, by explicit path.

## Git safety

Do not use `git stash`, `--no-verify`, `--amend`, `git add -A`, `git add --all`,
or `git add .`. Do not overwrite unrelated work. Use a throwaway worktree for
baseline comparisons when needed.
