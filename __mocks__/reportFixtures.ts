import type {
  AnalysisReport,
  Finding,
  RiskLevel,
  Suggestion,
} from '@engine';

const FIXTURE_HOST = 'shop.example.test';

const FIXTURE_RESOURCES: readonly string[] = [
  `https://${FIXTURE_HOST}/products`,
  `https://${FIXTURE_HOST}/assets/app.css`,
  `https://${FIXTURE_HOST}/assets/theme.css`,
];

const finding = (
  id: string,
  name: string,
  risk: RiskLevel,
  overrides: Partial<Finding> = {},
): Finding => {
  const syntax = id.replace(/^(?:css|html)-/, '');

  return {
    id,
    featureId: id,
    name,
    kind: 'css-property',
    sourceKind: 'css',
    syntax,
    risk,
    verified: true,
    fallback: `Fallback guidance for ${name}.`,
    mdnUrl: `https://developer.mozilla.org/docs/Web/CSS/${id}`,
    baseline: 'limited',
    location: {
      url: `https://${FIXTURE_HOST}/assets/app.css`,
      line: 12,
      column: 3,
    },
    impacts: [{
      slot: 'firefox',
      targetVersion: '128',
      supportedFrom: '147',
      supported: false,
    }],
    ...overrides,
  };
};

export const blockedFindingFixture = finding('css-anchor-name', 'CSS anchor positioning', 'breaks');

export const degradedFindingFixture = finding('css-backdrop-filter', 'backdrop-filter property', 'degrades', {
  baseline: 'newly',
});

const reviewFindingFixture = finding('css-scroll-timeline-name', 'scroll-timeline-name property', 'degrades', {
  impacts: [{
    slot: 'firefox',
    targetVersion: '128',
    supported: false,
  }],
});

const findingsFixture: readonly Finding[] = [
  blockedFindingFixture,
  finding('css-oklch', 'oklch() color', 'breaks', {
    kind: 'css-value',
    syntax: 'oklch()',
    location: {
      url: `https://${FIXTURE_HOST}/assets/theme.css`,
      line: 4,
      column: 5,
    },
  }),
  finding('html-popover', 'popover attribute', 'breaks', {
    kind: 'html-attribute',
    sourceKind: 'html',
    syntax: '[popover]',
    location: {
      url: `https://${FIXTURE_HOST}/products`,
      line: 42,
      column: 7,
    },
    impacts: [{
      slot: 'safari',
      targetVersion: '16',
      supportedFrom: '17',
      supported: false,
    }],
  }),
  degradedFindingFixture,
  reviewFindingFixture,
];

const suggestionFixture: Suggestion = {
  id: 'legacy-webkit-backdrop-filter@https://shop.example.test/app.css:31:3',
  ruleId: 'legacy-webkit-backdrop-filter',
  syntax: '-webkit-backdrop-filter',
  advice: 'Drop the prefix and use backdrop-filter.',
  name: 'backdrop-filter property',
  replacementSyntax: 'backdrop-filter',
  mdnUrl: 'https://developer.mozilla.org/docs/Web/CSS/backdrop-filter',
  baselineDate: '2024-09-16',
  location: { url: `https://${FIXTURE_HOST}/app.css`, line: 31, column: 3 },
};

export const reportFixture: AnalysisReport = {
  suggestions: [suggestionFixture],
  findings: findingsFixture,
  resources: {
    seen: FIXTURE_RESOURCES,
    parsed: FIXTURE_RESOURCES,
  },
  coverage: {
    matched: ['css-anchor-name', 'css-oklch', 'html-popover', 'css-backdrop-filter'],
    registryFeatures: 30,
  },
  warnings: [],
  durationMs: 84,
};
