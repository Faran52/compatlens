import type { DetectorDefinition } from '@engine';

// syntax per kind: tag, "element[attribute]", at-rule name, selector, property or value token.
export const curatedDetectors: readonly DetectorDefinition[] = [
  {
    id: 'html-dialog',
    name: '<dialog> element',
    kind: 'html-element',
    syntax: 'dialog',
    bcdPath: 'html.elements.dialog',
    webFeatureId: 'dialog',
    defaultRisk: 'breaks',
    fallback: 'Without support the dialog renders inline and never traps focus, so ship a scripted '
      + 'modal fallback or keep the dialog hidden until you confirm support.',
  },
  {
    id: 'html-details-name',
    name: '<details name> exclusive accordion',
    kind: 'html-attribute',
    syntax: 'details[name]',
    bcdPath: 'html.elements.details.name',
    webFeatureId: 'details-name',
    defaultRisk: 'degrades',
    fallback: 'Older browsers ignore the grouping and let every panel open at once, which is '
      + 'usable but not exclusive. Close siblings in script if exclusivity matters.',
  },
  {
    id: 'html-inert',
    name: 'inert attribute',
    kind: 'html-attribute',
    syntax: '[inert]',
    bcdPath: 'html.global_attributes.inert',
    webFeatureId: 'inert',
    defaultRisk: 'breaks',
    fallback: 'Without inert, keyboard focus escapes into content you meant to disable. Manage '
      + 'tabindex and pointer-events for that subtree as well.',
  },
  {
    id: 'html-loading-lazy',
    name: 'loading attribute',
    kind: 'html-attribute',
    syntax: 'img[loading]',
    bcdPath: 'html.elements.img.loading',
    webFeatureId: 'loading-lazy',
    defaultRisk: 'degrades',
    fallback: 'Unsupported browsers load the resource eagerly. The page still works, it just '
      + 'costs more bandwidth on first paint.',
  },
  {
    id: 'html-fetchpriority',
    name: 'fetchpriority attribute',
    kind: 'html-attribute',
    syntax: 'img[fetchpriority]',
    bcdPath: 'html.elements.img.fetchpriority',
    webFeatureId: 'fetch-priority',
    defaultRisk: 'degrades',
    fallback: 'The hint is ignored and the browser picks its own priority. Order critical markup '
      + 'and preload tags so the default priority is already close to what you want.',
  },
  {
    id: 'html-popover',
    name: 'popover attribute',
    kind: 'html-attribute',
    syntax: '[popover]',
    bcdPath: 'html.global_attributes.popover',
    webFeatureId: 'popover',
    defaultRisk: 'breaks',
    fallback: 'Without support the element is never hidden and never promoted to the top layer, '
      + 'so it renders in place on load. Hide it with CSS and toggle it in script instead.',
  },
  {
    id: 'html-popovertarget',
    name: 'popovertarget attribute',
    kind: 'html-attribute',
    syntax: 'button[popovertarget]',
    bcdPath: 'html.elements.button.popovertarget',
    webFeatureId: 'popover',
    defaultRisk: 'breaks',
    fallback: 'The button does nothing at all without support. Add a scripted click handler that '
      + 'toggles the target.',
  },
  {
    id: 'html-declarative-shadow-dom', // only fires because the collector serialises shadow trees back into the markup.
    name: 'declarative shadow DOM',
    kind: 'html-attribute',
    syntax: 'template[shadowrootmode]',
    bcdPath: 'html.elements.template.shadowrootmode',
    webFeatureId: 'declarative-shadow-dom',
    defaultRisk: 'breaks',
    fallback: 'The template stays inert and its content never renders, so the component is simply '
      + 'missing. Attach the shadow root in script as a fallback.',
  },

  {
    id: 'css-has',
    name: ':has() selector',
    kind: 'css-selector',
    syntax: ':has(',
    bcdPath: 'css.selectors.has',
    webFeatureId: 'has',
    defaultRisk: 'breaks',
    fallback: 'The whole rule is dropped when :has() is unknown. Keep a class-based selector that '
      + 'script or the server applies to the same element.',
  },
  {
    id: 'css-focus-visible',
    name: ':focus-visible selector',
    kind: 'css-selector',
    syntax: ':focus-visible',
    bcdPath: 'css.selectors.focus-visible',
    webFeatureId: 'focus-visible',
    defaultRisk: 'breaks',
    fallback: 'Keyboard users lose the focus ring entirely, which is an accessibility failure. '
      + 'Pair it with a plain :focus rule.',
  },
  {
    id: 'css-modal',
    name: ':modal selector',
    kind: 'css-selector',
    syntax: ':modal',
    bcdPath: 'css.selectors.modal',
    webFeatureId: 'modal',
    defaultRisk: 'degrades',
    fallback: 'The rule is dropped and the modal keeps its default styling. Target the dialog by '
      + 'its open attribute instead.',
  },
  {
    id: 'css-nesting',
    name: 'CSS nesting',
    kind: 'css-selector',
    syntax: '&',
    bcdPath: 'css.selectors.nesting',
    webFeatureId: 'nesting',
    defaultRisk: 'breaks',
    fallback: 'Nested rules are discarded wholesale, so the styles never apply. Flatten them at '
      + 'build time.',
  },

  {
    id: 'css-container',
    name: '@container query',
    kind: 'css-at-rule',
    syntax: 'container',
    bcdPath: 'css.at-rules.container',
    webFeatureId: 'container-queries',
    defaultRisk: 'breaks',
    fallback: 'Everything inside the block is ignored, so the component keeps its unqueried '
      + 'layout. Make that base layout the acceptable one and treat the query as an enhancement.',
  },
  {
    id: 'css-layer',
    name: '@layer cascade layer',
    kind: 'css-at-rule',
    syntax: 'layer',
    bcdPath: 'css.at-rules.layer',
    webFeatureId: 'cascade-layers',
    defaultRisk: 'breaks',
    fallback: 'The block is dropped and the layered rules disappear, which usually reverses the '
      + 'cascade you designed. Order stylesheets by specificity as a fallback.',
  },
  {
    id: 'css-scope',
    name: '@scope block',
    kind: 'css-at-rule',
    syntax: 'scope',
    bcdPath: 'css.at-rules.scope',
    webFeatureId: 'scope',
    defaultRisk: 'breaks',
    fallback: 'Scoped rules are ignored entirely. Reach the same elements with a wrapper class '
      + 'and descendant selectors.',
  },
  {
    id: 'css-starting-style',
    name: '@starting-style block',
    kind: 'css-at-rule',
    syntax: 'starting-style',
    bcdPath: 'css.at-rules.starting-style',
    webFeatureId: 'starting-style',
    defaultRisk: 'degrades',
    fallback: 'The entry animation is skipped and the element appears at its final state, which '
      + 'is abrupt but never broken.',
  },

  {
    id: 'css-anchor-name',
    name: 'anchor-name property',
    kind: 'css-property',
    syntax: 'anchor-name',
    bcdPath: 'css.properties.anchor-name',
    webFeatureId: 'anchor-positioning',
    defaultRisk: 'breaks',
    fallback: 'Anchor positioning is ignored and the element falls back to normal positioned '
      + 'layout, usually in the wrong place. Give it usable static coordinates.',
  },
  {
    id: 'css-position-anchor',
    name: 'position-anchor property',
    kind: 'css-property',
    syntax: 'position-anchor',
    bcdPath: 'css.properties.position-anchor',
    webFeatureId: 'anchor-positioning',
    defaultRisk: 'breaks',
    fallback: 'Without an anchor reference the element positions against its containing block '
      + 'instead. Provide static offsets that are acceptable on their own.',
  },
  {
    id: 'css-position-area',
    name: 'position-area property',
    kind: 'css-property',
    syntax: 'position-area',
    bcdPath: 'css.properties.position-area',
    webFeatureId: 'anchor-positioning',
    defaultRisk: 'breaks',
    fallback: 'The declaration is dropped and the element keeps its inset values, which are often '
      + 'unset. Set explicit inset properties too.',
  },
  {
    id: 'css-interpolate-size',
    name: 'interpolate-size property',
    kind: 'css-property',
    syntax: 'interpolate-size',
    bcdPath: 'css.properties.interpolate-size',
    webFeatureId: 'interpolate-size',
    defaultRisk: 'degrades',
    fallback: 'Transitions to and from intrinsic sizes snap instead of animating. The end states '
      + 'are still correct.',
  },
  {
    id: 'css-view-transition-name',
    name: 'view-transition-name property',
    kind: 'css-property',
    syntax: 'view-transition-name',
    bcdPath: 'css.properties.view-transition-name',
    webFeatureId: 'view-transitions',
    defaultRisk: 'degrades',
    fallback: 'The transition is skipped and the new state appears immediately. Confirm the '
      + 'instant swap is not visually jarring.',
  },
  {
    id: 'css-scroll-timeline-name',
    name: 'scroll-timeline-name property',
    kind: 'css-property',
    syntax: 'scroll-timeline-name',
    bcdPath: 'css.properties.scroll-timeline-name',
    webFeatureId: 'scroll-driven-animations',
    defaultRisk: 'degrades',
    fallback: 'Support here is uneven and partly behind flags, so check what the animation looks '
      + 'like when the timeline never advances.',
  },
  {
    id: 'css-backdrop-filter',
    name: 'backdrop-filter property',
    kind: 'css-property',
    syntax: 'backdrop-filter',
    bcdPath: 'css.properties.backdrop-filter',
    webFeatureId: 'backdrop-filter',
    defaultRisk: 'degrades',
    fallback: 'The backdrop is not blurred, so overlay text can lose contrast against whatever is '
      + 'behind it. Set a solid or semi-opaque background as well.',
  },
  {
    id: 'css-content-visibility',
    name: 'content-visibility property',
    kind: 'css-property',
    syntax: 'content-visibility',
    bcdPath: 'css.properties.content-visibility',
    webFeatureId: 'content-visibility',
    defaultRisk: 'degrades',
    fallback: 'Rendering is not skipped, so the page paints everything up front. Correct, just '
      + 'slower.',
  },
  {
    id: 'css-contain-intrinsic-size',
    name: 'contain-intrinsic-size property',
    kind: 'css-property',
    syntax: 'contain-intrinsic-size',
    bcdPath: 'css.properties.contain-intrinsic-size',
    webFeatureId: 'contain-intrinsic-size',
    defaultRisk: 'degrades',
    fallback: 'Placeholder sizing is ignored, which can shift layout as skipped content renders. '
      + 'Reserve space with width and height.',
  },
  {
    id: 'css-field-sizing',
    name: 'field-sizing property',
    kind: 'css-property',
    syntax: 'field-sizing',
    bcdPath: 'css.properties.field-sizing',
    webFeatureId: 'field-sizing',
    defaultRisk: 'degrades',
    fallback: 'The control keeps its default fixed size instead of growing with its value. Set a '
      + 'width that reads well when it cannot adapt.',
  },

  {
    id: 'css-color-mix',
    name: 'color-mix() function',
    kind: 'css-value',
    syntax: 'color-mix(',
    bcdPath: 'css.types.color.color-mix',
    webFeatureId: 'color-mix',
    defaultRisk: 'breaks',
    fallback: 'The declaration is invalid and dropped, so the property falls back to its inherited '
      + 'or initial value. Declare a literal color first, then override it with color-mix().',
  },
  {
    id: 'css-oklch',
    name: 'oklch() color',
    kind: 'css-value',
    syntax: 'oklch(',
    bcdPath: 'css.types.color.oklch',
    webFeatureId: 'oklab',
    defaultRisk: 'breaks',
    fallback: 'The declaration is dropped, which can leave text and background the same color. '
      + 'Declare an sRGB equivalent on the line above.',
  },
  {
    id: 'css-subgrid',
    name: 'subgrid value',
    kind: 'css-value',
    syntax: 'subgrid',
    bcdPath: 'css.properties.grid-template-columns.subgrid',
    webFeatureId: 'subgrid',
    defaultRisk: 'breaks',
    fallback: 'The track list is invalid and the nested grid stops aligning to its parent. Repeat '
      + 'the parent track definition on the child as a fallback.',
  },
  {
    id: 'css-text-wrap-balance',
    name: 'text-wrap: balance',
    kind: 'css-value',
    syntax: 'balance',
    bcdPath: 'css.properties.text-wrap.balance',
    webFeatureId: 'text-wrap-balance',
    defaultRisk: 'degrades',
    fallback: 'Headings wrap normally instead of being balanced, which is only a typographic '
      + 'difference.',
  },
  {
    id: 'css-appearance',
    name: 'appearance property',
    kind: 'css-property',
    syntax: 'appearance',
    bcdPath: 'css.properties.appearance',
    webFeatureId: 'appearance',
    defaultRisk: 'degrades',
    fallback: 'The control keeps its native platform styling, so custom borders and arrows on '
      + 'selects and checkboxes are ignored.',
  },
  {
    id: 'css-clip-path',
    name: 'clip-path property',
    kind: 'css-property',
    syntax: 'clip-path',
    bcdPath: 'css.properties.clip-path',
    webFeatureId: 'clip-path',
    defaultRisk: 'degrades',
    fallback: 'The element renders unclipped as a full rectangle, which can cover content the '
      + 'clip was hiding.',
  },
  {
    id: 'css-is',
    name: ':is() selector',
    kind: 'css-selector',
    syntax: ':is(',
    bcdPath: 'css.selectors.is',
    webFeatureId: 'is',
    defaultRisk: 'breaks',
    fallback: 'The whole rule is dropped, not just the one selector, so write the branches out '
      + 'separately where support matters.',
  },
  {
    id: 'css-position-sticky',
    name: 'position: sticky',
    kind: 'css-value',
    syntax: 'sticky',
    bcdPath: 'css.properties.position.sticky',
    webFeatureId: 'sticky-positioning',
    defaultRisk: 'degrades',
    fallback: 'The element falls back to static positioning and scrolls away instead of pinning.',
  },
];
