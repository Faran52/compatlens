import type { ModernizationRule } from '@engine';

// Each replacementId must name a curated detector, which is what makes the suggestion target-aware.
export const modernizationRules: readonly ModernizationRule[] = [
  {
    id: 'legacy-webkit-appearance',
    kind: 'css-property',
    syntax: '-webkit-appearance',
    replacementId: 'css-appearance',
    advice: 'Drop the prefix and use appearance.',
  },
  {
    id: 'legacy-moz-appearance',
    kind: 'css-property',
    syntax: '-moz-appearance',
    replacementId: 'css-appearance',
    advice: 'Drop the prefix and use appearance.',
  },
  {
    id: 'legacy-webkit-clip-path',
    kind: 'css-property',
    syntax: '-webkit-clip-path',
    replacementId: 'css-clip-path',
    advice: 'Drop the prefix and use clip-path.',
  },
  {
    id: 'legacy-webkit-backdrop-filter',
    kind: 'css-property',
    syntax: '-webkit-backdrop-filter',
    replacementId: 'css-backdrop-filter',
    advice: 'Drop the prefix and use backdrop-filter.',
  },
  {
    id: 'legacy-webkit-any',
    kind: 'css-selector',
    syntax: ':-webkit-any()',
    replacementId: 'css-is',
    advice: 'Replace :-webkit-any() with the standard :is().',
  },
  {
    id: 'legacy-matches-selector',
    kind: 'css-selector',
    syntax: ':matches()',
    replacementId: 'css-is',
    advice: 'Replace the withdrawn :matches() with :is().',
  },
  {
    id: 'legacy-webkit-sticky',
    kind: 'css-value',
    syntax: '-webkit-sticky',
    replacementId: 'css-position-sticky',
    advice: 'Drop the prefix and use position: sticky.',
  },
];
