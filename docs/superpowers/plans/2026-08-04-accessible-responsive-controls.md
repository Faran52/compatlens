# Accessible Responsive Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep severity and browser filters available through an animated left-side hamburger drawer at narrow DevTools widths, and complete the Findings/Modernise tabs' accessible keyboard contract.

**Architecture:** Extend the domain-free `Tabs` primitive with stable tab/panel associations and a covered keyboard utility. Add a focused `NarrowFilterMenu` partial that reuses `CheckList` and `FilterRail` inside a native modal dialog, with animation logic isolated in a covered utility; `LivePanel` only assembles these controls and matching tab panels.

**Tech Stack:** Solid 1.9, TypeScript 6.0, Tailwind CSS 4, Vitest with happy-dom and Solid Testing Library, Playwright.

## Global Constraints

- Use pnpm only and Node 24; keep all dependency versions unchanged.
- Follow `CLAUDE.md`, `CONTRIBUTING.md`, `.claude/rules/type-standards.md`, and `docs/testing.md`.
- Use arrow functions, single quotes, maximum 120 columns, reactive `props.x` access, and one component per file.
- Do not use casts, `any`, broad `unknown`, suppression comments, test comments, or prop spreading.
- Write each behavior test first, run it to observe the expected failure, then add the minimum production code.
- Keep presentation branches in covered utility modules and retain 100 percent line and branch coverage.
- Do not alter compatibility analysis, selected filter state, target calculation, privacy behavior, permissions, or persistence.
- The drawer appears below 720 pixels; the existing resizable rail remains the only filter surface at 720 pixels and wider.
- The drawer slides in from the left and slides back left on close; `prefers-reduced-motion` makes both transitions immediate.
- Stage only the explicit files changed for each commit.

---

### Task 1: Complete the accessible tabs contract

**Files:**
- Create: `src/components/ui/tabs/utils/tabUtils.ts`
- Create: `src/components/ui/tabs/utils/tabUtils.test.ts`
- Modify: `src/components/ui/tabs/Tabs.tsx`
- Modify: `src/components/ui/tabs/Tabs.test.tsx`
- Modify: `src/components/features/live-panel/LivePanel.tsx`
- Modify: `src/components/features/live-panel/LivePanel.test.tsx`
- Modify: `e2e/panel.spec.ts`

**Interfaces:**
- Consumes: `PanelTab = 'findings' | 'modernise'` and the existing `Tabs` `active`/`onSelect` contract.
- Produces: tab definitions `{ id, tabId, panelId, label, count }`, `tabIdForKey(tabs, activeId, key)`, and two associated tab panels with IDs `findings-panel` and `modernise-panel`.

- [ ] **Step 1: Write failing keyboard-resolution tests**

Create `src/components/ui/tabs/utils/tabUtils.test.ts` with behavior cases that define two typed tabs and assert:

```ts
import {
  describe,
  expect,
  it,
} from 'vitest';

import { tabIdForKey } from './tabUtils';

import type { TabDefinition } from './tabUtils';

const tabs: readonly TabDefinition[] = [
  { id: 'findings', tabId: 'findings-tab', panelId: 'findings-panel', label: 'Findings', count: 18 },
  { id: 'modernise', tabId: 'modernise-tab', panelId: 'modernise-panel', label: 'Modernise', count: 5 },
];

describe('tabIdForKey', () => {
  it.each([
    ['findings', 'ArrowRight', 'modernise'],
    ['modernise', 'ArrowRight', 'findings'],
    ['modernise', 'ArrowLeft', 'findings'],
    ['findings', 'ArrowLeft', 'modernise'],
    ['modernise', 'Home', 'findings'],
    ['findings', 'End', 'modernise'],
  ])('moves from %s with %s to %s', (active, key, expected) => {
    expect(tabIdForKey(tabs, active, key)).toBe(expected);
  });

  it('leaves unrelated keys to the browser', () => {
    expect(tabIdForKey(tabs, 'findings', 'Enter')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the utility test and verify RED**

Run: `pnpm test src/components/ui/tabs/utils/tabUtils.test.ts`

Expected: FAIL because `tabUtils.ts` does not exist.

- [ ] **Step 3: Implement the keyboard utility**

Create `src/components/ui/tabs/utils/tabUtils.ts` with the exported `TabDefinition` interface and a `tabIdForKey` function. Use explicit key branches for `ArrowLeft`, `ArrowRight`, `Home`, and `End`; return the selected tab's `id`, wrap at both ends, and return `undefined` for other keys or an absent active ID. Keep index arithmetic in this covered module.

- [ ] **Step 4: Run the utility test and verify GREEN**

Run: `pnpm test src/components/ui/tabs/utils/tabUtils.test.ts`

Expected: PASS with no stderr or warnings.

- [ ] **Step 5: Write failing component tests for associations and roving focus**

Update `src/components/ui/tabs/Tabs.test.tsx` so its definitions include `tabId` and `panelId`, then add tests that assert:

```ts
it('associates each tab with its panel', () => {
  renderTabs();

  expect(screen.getByRole('tab', { name: /Findings/u }).id).toBe('findings-tab');
  expect(screen.getByRole('tab', { name: /Findings/u }).getAttribute('aria-controls'))
    .toBe('findings-panel');
});

it('keeps only the active tab in the page tab order', () => {
  renderTabs('modernise');

  expect(screen.getByRole('tab', { name: /Modernise/u }).tabIndex).toBe(0);
  expect(screen.getByRole('tab', { name: /Findings/u }).tabIndex).toBe(-1);
});

it('selects and focuses the tab reached by an arrow key', () => {
  const onSelect = renderTabs('findings', vi.fn());
  const modernise = screen.getByRole('tab', { name: /Modernise/u });

  fireEvent.keyDown(screen.getByRole('tab', { name: /Findings/u }), { key: 'ArrowRight' });

  expect(onSelect).toHaveBeenCalledWith('modernise');
  expect(document.activeElement).toBe(modernise);
});
```

Add equivalent Home/End or wraparound behavior only where it is not already proven by `tabUtils.test.ts`; avoid duplicating the same branch at component level.

- [ ] **Step 6: Run the component test and verify RED**

Run: `pnpm test src/components/ui/tabs/Tabs.test.tsx`

Expected: FAIL because tab IDs, panel controls, roving `tabindex`, and keyboard selection are absent.

- [ ] **Step 7: Implement the accessible tab behavior**

Update `Tabs.tsx` to import `TabDefinition` and `tabIdForKey`, publish `TabDefinition` only through the tabs folder boundary if another folder needs the type, and render each button with:

```tsx
aria-controls={tab.panelId}
aria-selected={props.active === tab.id}
id={tab.tabId}
tabindex={props.active === tab.id ? 0 : -1}
```

On `keydown`, resolve the next ID with `tabIdForKey`. When it returns an ID, prevent the default, call `props.onSelect(nextId)`, find the matching `tabId` from `props.tabs`, and focus that element with `document.getElementById(nextTab.tabId)?.focus()`. Leave all unrelated keys untouched.

- [ ] **Step 8: Run the component test and verify GREEN**

Run: `pnpm test src/components/ui/tabs/Tabs.test.tsx`

Expected: PASS with no stderr or warnings.

- [ ] **Step 9: Write failing live-panel association tests**

Update `src/components/features/live-panel/LivePanel.test.tsx` to assert the active view is a named panel:

```ts
it('associates the findings tab with the visible findings panel', () => {
  renderPanel();

  const panel = screen.getByRole('tabpanel', { name: /Findings/u });

  expect(panel.id).toBe('findings-panel');
  expect(panel.getAttribute('aria-labelledby')).toBe('findings-tab');
});
```

Add the corresponding assertion to the existing Modernise render setup.

- [ ] **Step 10: Run the live-panel test and verify RED**

Run: `pnpm test src/components/features/live-panel/LivePanel.test.tsx`

Expected: FAIL because no `tabpanel` exists.

- [ ] **Step 11: Add stable definitions and tab panels**

In `LivePanel.tsx`, build the two tab definitions in a local accessor so counts stay reactive while
IDs remain stable:

```ts
const tabs = (): readonly TabDefinition[] => {
  return [
    {
      id: 'findings',
      tabId: 'findings-tab',
      panelId: 'findings-panel',
      label: 'Findings',
      count: props.session.occurrences.length,
    },
    {
      id: 'modernise',
      tabId: 'modernise-tab',
      panelId: 'modernise-panel',
      label: 'Modernise',
      count: props.session.suggestions.length,
    },
  ];
};
```

Pass `tabs()` to `Tabs`. Wrap each currently rendered view in a `div` with `role="tabpanel"`, its
matching `id`, `aria-labelledby`, and the current flex/overflow classes so layout is unchanged. Keep
inactive views unrendered.

- [ ] **Step 12: Run focused unit tests and verify GREEN**

Run: `pnpm test src/components/ui/tabs src/components/features/live-panel/LivePanel.test.tsx`

Expected: PASS with no stderr or warnings.

- [ ] **Step 13: Add a failing Playwright keyboard flow**

In `e2e/panel.spec.ts`, add a test that focuses the Findings tab, presses `ArrowRight`, and asserts that Modernise is selected, focused, and controls the visible named tabpanel. Run:

`pnpm e2e --grep "moves between tabs"`

Expected: FAIL before the production build contains the complete association and keyboard flow.

- [ ] **Step 14: Run the completed browser flow and task gate**

Run:

```bash
pnpm test src/components/ui/tabs src/components/features/live-panel/LivePanel.test.tsx
pnpm e2e --grep "moves between tabs"
pnpm lint
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 15: Commit Task 1**

```bash
git add src/components/ui/tabs/utils/tabUtils.ts \
  src/components/ui/tabs/utils/tabUtils.test.ts \
  src/components/ui/tabs/Tabs.tsx \
  src/components/ui/tabs/Tabs.test.tsx \
  src/components/features/live-panel/LivePanel.tsx \
  src/components/features/live-panel/LivePanel.test.tsx \
  e2e/panel.spec.ts
git commit -m "fix: complete accessible tab behavior"
```

---

### Task 2: Add the animated narrow filter drawer

**Files:**
- Create: `src/components/features/live-panel/partials/NarrowFilterMenu.tsx`
- Create: `src/components/features/live-panel/partials/NarrowFilterMenu.test.tsx`
- Create: `src/components/features/live-panel/utils/filterMenuUtils.ts`
- Create: `src/components/features/live-panel/utils/filterMenuUtils.test.ts`
- Modify: `src/components/features/live-panel/LivePanel.tsx`
- Modify: `src/components/features/live-panel/LivePanel.test.tsx`
- Modify: `src/styles/tailwind.css`
- Modify: `e2e/panel.spec.ts`
- Regenerate if visually changed: `docs/media/readme-narrow-light.png`
- Regenerate if visually changed: `docs/media/readme-narrow-dark.png`

**Interfaces:**
- Consumes: the existing `CheckList`, `FilterRail`, `severityCheckRowsFor`, `isConnecting`, browser callbacks, `RailInput`, and `CheckListRow` contracts.
- Produces: `NarrowFilterMenu` with the same filter callbacks as the desktop rail, `playFilterMenuExit(element, reducedMotion)`, an `Open filters` hamburger below 720 pixels, and a native left-side modal dialog named `Filters`.

- [ ] **Step 1: Write failing exit-animation tests**

Create `src/components/features/live-panel/utils/filterMenuUtils.test.ts` following the existing drawer utility fake pattern. Assert that `playFilterMenuExit`:

```ts
expect(played[0]?.keyframes).toStrictEqual([
  { transform: 'none', opacity: 1 },
  { transform: 'translateX(-100%)', opacity: 0 },
]);
```

Also assert duration `200`, easing `'cubic-bezier(0.32, 0, 0.67, 0)'`, `fill: 'forwards'`, immediate resolution for reduced motion or an absent element, and resolution when the animation promise rejects.

- [ ] **Step 2: Run the utility test and verify RED**

Run: `pnpm test src/components/features/live-panel/utils/filterMenuUtils.test.ts`

Expected: FAIL because `filterMenuUtils.ts` does not exist.

- [ ] **Step 3: Implement the exit-animation utility**

Create `filterMenuUtils.ts` with narrow `FilterMenuAnimation` and `FilterMenuElement` interfaces, exported constants `FILTER_MENU_EXIT_MS = 200` and `FILTER_MENU_EXIT_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)'`, and `playFilterMenuExit` matching the tested keyframes. Catch a cancelled animation so closing still completes.

- [ ] **Step 4: Run the utility test and verify GREEN**

Run: `pnpm test src/components/features/live-panel/utils/filterMenuUtils.test.ts`

Expected: PASS with 100 percent coverage for the new utility.

- [ ] **Step 5: Write failing narrow-menu behavior tests**

Create `NarrowFilterMenu.test.tsx` with typed rail fixtures from `FilterRail.test.tsx`. Render the component with two severity rows and assert:

- the button has accessible name `Open filters`, `aria-controls="filter-menu"`, and starts with `aria-expanded="false"`;
- activating it opens a dialog named `Filters`, changes expanded to `true`, and focuses `Close filters`;
- the dialog shows `Severity`, `Browsers`, and the existing engine groups;
- checking a browser invokes `onToggleSlot` with that browser;
- the All/None control invokes `onToggleAll`;
- Escape and `Close filters` close the dialog, reset expanded, and return focus to `Open filters`;
- a click whose target is the dialog backdrop closes it, while a click inside does not; and
- `busy` disables the trigger and sets `aria-busy` on the dialog content.

Use native DOM properties and roles; do not assert CSS classes or private signals.

- [ ] **Step 6: Run the narrow-menu test and verify RED**

Run: `pnpm test src/components/features/live-panel/partials/NarrowFilterMenu.test.tsx`

Expected: FAIL because `NarrowFilterMenu.tsx` does not exist.

- [ ] **Step 7: Implement the narrow menu with shared filter controls**

Create `NarrowFilterMenu.tsx` with a typed props interface containing `busy`, `severityRows`, `rail`, `labelOf`, `retiredOf`, `allChecked`, `onToggleAll`, and `onToggleSlot`. Use `createSignal(false)` for `aria-expanded`, typed button/dialog refs, and a native `<dialog id="filter-menu">`.

The trigger is the first item in the narrow toolbar, uses `aria-label="Open filters"`, includes a decorative `☰` with `aria-hidden="true"`, and is hidden at `min-[720px]`. Opening calls `showModal()`, sets expanded, and focuses `Close filters`. Closing awaits `playFilterMenuExit`, calls `dialog.close()`, resets expanded, and focuses the trigger. The `cancel` handler prevents the immediate native close and uses the animated close path. A dialog click closes only when `event.target === event.currentTarget`.

Inside the dialog, render this structure without copying filter state:

```tsx
<div aria-busy={props.busy} class="flex h-full flex-col bg-surface">
  <div class="flex items-center border-b border-hairline p-2">
    <h2 class="font-semibold">Filters</h2>
    <button aria-label="Close filters" class="ml-auto" type="button">Close</button>
  </div>
  <div class="overflow-auto">
    <div class="p-2"><CheckList heading="Severity" rows={props.severityRows} /></div>
    <FilterRail ...explicit props... />
  </div>
</div>
```

- [ ] **Step 8: Run the narrow-menu test and verify GREEN**

Run: `pnpm test src/components/features/live-panel/partials/NarrowFilterMenu.test.tsx`

Expected: PASS with no stderr or warnings.

- [ ] **Step 9: Write a failing live-panel integration test**

In `LivePanel.test.tsx`, assert `Open filters` exists, then open it and verify the shared severity and browser controls invoke the existing callbacks passed to `LivePanel`. Keep assertions behavior-focused and do not duplicate `NarrowFilterMenu.test.tsx` lifecycle cases.

- [ ] **Step 10: Run the live-panel test and verify RED**

Run: `pnpm test src/components/features/live-panel/LivePanel.test.tsx`

Expected: FAIL because `LivePanel` has no narrow menu.

- [ ] **Step 11: Integrate the menu without changing desktop behavior**

Render `NarrowFilterMenu` immediately before the CompatLens brand in the toolbar. Pass the same `severityCheckRowsFor(...)`, rail props, and callbacks used by the existing desktop rail. Keep the existing desktop rail and separator classes unchanged. If the shared props make `LivePanel` repetitive, extract only the severity rows into a local accessor; do not create a second state owner.

- [ ] **Step 12: Add the left-side entry animation**

In `src/styles/tailwind.css`, add `--animate-filter-menu: filter-menu 260ms cubic-bezier(0.32, 0.72, 0, 1)` and:

```css
@keyframes filter-menu {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }

  to {
    opacity: 1;
    transform: none;
  }
}
```

Style the dialog as a left sheet with `m-0 h-full max-h-full w-[min(320px,85vw)] max-w-none`, no default padding, a right border, `motion-safe:animate-filter-menu`, and a theme-aware backdrop. Use the repository's existing color tokens; introduce no new palette or dependency. The global reduced-motion rule already collapses CSS animation duration, while the close utility skips Web Animations when reduced motion is requested.

- [ ] **Step 13: Run focused unit and static checks**

Run:

```bash
pnpm test src/components/features/live-panel/partials/NarrowFilterMenu.test.tsx \
  src/components/features/live-panel/utils/filterMenuUtils.test.ts \
  src/components/features/live-panel/LivePanel.test.tsx
pnpm lint
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 14: Write failing responsive Playwright tests**

Extend `e2e/panel.spec.ts` with tests that:

- at 360 pixels, see `Open filters`, do not see the desktop resize separator, open the dialog, and see Severity/Browsers controls;
- close with Escape and assert focus returns to `Open filters`;
- inspect the opening dialog animation and assert its first transform is `translateX(-100%)`;
- at 720 pixels, do not see `Open filters` and do see `Resize the browser list`; and
- retain zero page-level horizontal overflow at 360 pixels.

Run: `pnpm e2e --grep "filters"`

Expected: FAIL until the responsive production CSS and dialog behavior are complete.

- [ ] **Step 15: Run the responsive browser flow**

Run:

```bash
pnpm e2e --grep "filters"
pnpm e2e --grep "reflows|scrolls a wide grid"
```

Expected: all selected tests PASS.

- [ ] **Step 16: Regenerate and inspect narrow screenshots**

Run `pnpm screenshots`. Inspect `docs/media/readme-narrow-light.png` and `docs/media/readme-narrow-dark.png`; keep the regenerated files only when the new hamburger is visible and the images otherwise reflect the shipped panel. Confirm the drawer itself through the Playwright screenshot attachment or a targeted local screenshot rather than changing unrelated store images.

- [ ] **Step 17: Run the full release gates**

Run:

```bash
pnpm check
pnpm e2e
git diff --check
```

Expected: 100 percent measured line/branch/function/statement coverage, all Playwright tests PASS, production build PASS, and no whitespace errors.

- [ ] **Step 18: Commit Task 2**

Stage only files that actually changed:

```bash
git add src/components/features/live-panel/partials/NarrowFilterMenu.tsx \
  src/components/features/live-panel/partials/NarrowFilterMenu.test.tsx \
  src/components/features/live-panel/utils/filterMenuUtils.ts \
  src/components/features/live-panel/utils/filterMenuUtils.test.ts \
  src/components/features/live-panel/LivePanel.tsx \
  src/components/features/live-panel/LivePanel.test.tsx \
  src/styles/tailwind.css \
  e2e/panel.spec.ts \
  docs/media/readme-narrow-light.png \
  docs/media/readme-narrow-dark.png
git commit -m "feat: add animated narrow filter menu"
```
