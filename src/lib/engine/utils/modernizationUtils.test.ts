import {
  describe,
  expect,
  it,
} from 'vitest';

import { resolveModernization } from './modernizationUtils';

import type {
  BrowserTarget,
  DetectedFeature,
  FeatureRegistryEntry,
  ModernizationRule,
} from '../types';

const rule: ModernizationRule = {
  id: 'legacy-webkit-appearance',
  kind: 'css-property',
  syntax: '-webkit-appearance',
  replacementId: 'css-appearance',
  advice: 'Drop the prefix and use appearance.',
};

const detection: DetectedFeature = {
  featureId: rule.id,
  location: { url: 'https://example.test/app.css', line: 12, column: 3 },
};

const target: BrowserTarget = { chrome: '120', safari: '17' };

const replacement = (
  support: FeatureRegistryEntry['support'],
  baselineDate?: string,
): FeatureRegistryEntry => {
  const entry: FeatureRegistryEntry = {
    id: 'css-appearance',
    name: 'appearance property',
    kind: 'css-property',
    syntax: 'appearance',
    bcdPath: 'css.properties.appearance',
    webFeatureId: 'appearance',
    defaultRisk: 'degrades',
    fallback: 'Native styling stays.',
    baseline: 'widely',
    mdnUrl: 'https://developer.mozilla.org/appearance',
    support,
    dataVersion: {
      bcd: '8.0.8',
      webFeatures: '3.34.2',
      generatedAt: '2026-07-30T00:00:00.000Z',
    },
  };

  if (baselineDate === undefined) {
    return entry;
  }

  return { ...entry, baselineDate };
};

const supportedEverywhere = { chrome: '1', safari: '1' };

describe('resolveModernization', () => {
  it('suggests the replacement when the target already supports it', () => {
    const suggestion = resolveModernization(
      detection,
      rule,
      replacement(supportedEverywhere),
      target,
    );

    expect(suggestion).toMatchObject({
      ruleId: 'legacy-webkit-appearance',
      syntax: '-webkit-appearance',
      advice: 'Drop the prefix and use appearance.',
      name: 'appearance property',
      replacementSyntax: 'appearance',
      mdnUrl: 'https://developer.mozilla.org/appearance',
    });
  });

  it('stays silent when a targeted browser cannot use the replacement yet', () => {
    const suggestion = resolveModernization(
      detection,
      rule,
      replacement({ chrome: '1', safari: '999' }),
      target,
    );

    expect(suggestion).toBeNull();
  });

  it('stays silent when support for the replacement is unknown', () => {
    expect(resolveModernization(detection, rule, replacement({}), target)).toBeNull();
  });

  it('stays silent when the replacement is not in the catalog', () => {
    expect(resolveModernization(detection, rule, undefined, target)).toBeNull();
  });

  it('carries the baseline date when the replacement has one', () => {
    const suggestion = resolveModernization(
      detection,
      rule,
      replacement(supportedEverywhere, '2024-09-14'),
      target,
    );

    expect(suggestion?.baselineDate).toBe('2024-09-14');
  });

  it('omits the baseline date when the replacement has none', () => {
    const suggestion = resolveModernization(
      detection,
      rule,
      replacement(supportedEverywhere),
      target,
    );

    expect(suggestion === null || 'baselineDate' in suggestion).toBe(false);
  });

  it('identifies the occurrence by rule and position so repeats stay separate', () => {
    const suggestion = resolveModernization(
      detection,
      rule,
      replacement(supportedEverywhere),
      target,
    );

    expect(suggestion?.id).toBe('legacy-webkit-appearance@https://example.test/app.css:12:3');
  });

  it('falls back to zeroes when the detection carries no position', () => {
    const suggestion = resolveModernization(
      { featureId: rule.id, location: { url: 'https://example.test/app.css' } },
      rule,
      replacement(supportedEverywhere),
      target,
    );

    expect(suggestion?.id).toBe('legacy-webkit-appearance@https://example.test/app.css:0:0');
  });
});
