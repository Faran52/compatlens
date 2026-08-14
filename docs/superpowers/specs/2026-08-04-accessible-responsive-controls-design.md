# Accessible Responsive Controls Design

## Goal

Keep every CompatLens control available when DevTools is narrow, and complete the keyboard and
assistive-technology contract for the Findings and Modernise tabs.

## Scope

This change has two related parts:

1. Add a narrow-layout filter menu that opens from the left.
2. Complete the existing tabs' WAI-ARIA interaction and panel associations.

The desktop filter rail, compatibility analysis, target calculation, privacy boundary, persisted
state, and finding presentation do not change.

## Narrow Filter Menu

At viewport widths below 720 pixels, the permanent filter rail and resize separator remain hidden.
A hamburger button appears at the left edge of the panel toolbar, immediately before the CompatLens
name. Its accessible name is `Open filters`. The button exposes the menu state with `aria-expanded`
and names the controlled menu with `aria-controls`.

Activating the button opens a native modal `dialog` styled as a drawer from the left. The drawer
reuses the existing Severity checklist and `FilterRail`; it does not maintain a second filter state
or duplicate filtering logic. The drawer is wide enough for the existing browser labels and counts,
capped so that part of the findings view remains visible behind the native backdrop.

The drawer header is `Filters` and includes a `Close filters` button. It closes when the user:

- activates `Close filters`;
- presses Escape; or
- activates the backdrop outside the drawer.

Opening the drawer moves focus to `Close filters`. The native modal keeps focus inside the drawer,
blocks pointer input to the page behind it, closes on Escape, and restores focus to the hamburger
button. The drawer has an accessible name. Reduced-motion mode removes the slide transition without
changing the interaction.

At 720 pixels and wider, the hamburger button and drawer are absent from layout and the existing
resizable filter rail remains unchanged.

## Tabs

The existing Findings and Modernise buttons remain visually unchanged. Each tab receives a stable
ID, `aria-controls`, `aria-selected`, and roving `tabindex`. Each rendered view is a `tabpanel` with
a stable ID and `aria-labelledby` pointing back to its tab.

Keyboard behavior follows the automatic-activation tabs pattern:

- Left Arrow and Right Arrow move focus and selection, wrapping at either end.
- Home selects the first tab.
- End selects the last tab.
- Pointer activation continues to select the pressed tab.
- Only the active tab is in the page tab order.

The inactive view remains unrendered, as it is today. Counts stay part of each tab's accessible name.

## Component Boundaries

The existing finding `Drawer` remains unchanged because it is a non-modal detail sheet. A dedicated
responsive filter component owns the hamburger button, native dialog lifecycle, backdrop activation,
and existing filter content so `LivePanel` does not absorb another large interaction block.

The generic tabs component owns tab IDs, panel IDs, roving focus, and keyboard selection. The live
panel supplies the two matching tab panels. Interaction calculations that introduce branches live
in covered utility modules rather than Solid templates.

## Error and Edge Behavior

The narrow menu uses the same `aria-busy` and disabled interaction state as the desktop rail while
the page is connecting. Opening or closing the menu does not change selected browsers, severities,
targets, findings, sorting, or the active tab. Switching to a wide viewport while the drawer is open
closes the narrow interaction surface and leaves the desktop rail available.

## Testing

Unit tests cover:

- hamburger visibility hooks, labels, expanded state, and shared filter callbacks;
- drawer focus entry, Escape, backdrop close, and focus restoration;
- tab and panel ID associations;
- one-tab-stop behavior;
- Arrow, Home, and End selection including wraparound; and
- unchanged pointer selection.

Playwright covers the behavior CSS and DOM emulation cannot prove reliably:

- the hamburger is available and the permanent rail is hidden at 360 pixels;
- opening the left drawer exposes Severity and Browsers controls;
- Escape closes it and restores focus;
- the hamburger is hidden and the permanent rail is available at 720 pixels and wider; and
- tab keyboard navigation selects and associates the visible panel.

Run `pnpm check` and `pnpm e2e`. Touched source retains 100 percent line and branch coverage.

## Documentation

The behavior does not change what CompatLens reads, keeps, exports, or sends, so `docs/privacy.md`
does not change. The public product scope does not change, so `README.md` does not require a behavior
update. Regenerate narrow screenshots only if the final visual change makes the checked-in image
misrepresent the shipped toolbar.
