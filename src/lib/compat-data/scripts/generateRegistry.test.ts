import {
  describe,
  expect,
  it,
} from 'vitest';

import { first } from '@mocks';

import {
  type BcdFeature,
  type BrowserSupportStatement,
  generateRegistry,
  type RegistrySources,
  type WebFeatureStatus,
} from './generateRegistry';

import type { DetectorDefinition } from '@engine';

const hasDefinition: DetectorDefinition = {
  id: 'css-has',
  name: ':has()',
  kind: 'css-selector',
  syntax: ':has(',
  bcdPath: 'css.selectors.has',
  webFeatureId: 'has',
  defaultRisk: 'breaks',
  fallback: 'Keep a class-based selector fallback.',
};

const scopeDefinition: DetectorDefinition = {
  id: 'css-scope',
  name: '@scope',
  kind: 'css-at-rule',
  syntax: 'scope',
  bcdPath: 'css.at-rules.scope',
  webFeatureId: 'scope',
  defaultRisk: 'breaks',
  fallback: 'Scope styles with a wrapper class instead.',
};

const added = (version: string | boolean | null): readonly BrowserSupportStatement[] => {
  return [{ version_added: version }];
};

const bcdFeature = (
  support: BcdFeature['support'],
  mdnUrl = 'https://developer.mozilla.org/docs/Web/CSS/:has',
): BcdFeature => {
  return { mdnUrl, support };
};

const widelySupported: BcdFeature = bcdFeature({
  chrome: added('105'),
  firefox: added('121'),
  safari: added('15.4'),
  safari_ios: added('15.4'),
});

const sourcesFor = (
  feature: BcdFeature | undefined,
  status: WebFeatureStatus | undefined,
): RegistrySources => {
  return {
    bcdVersion: '8.0.8',
    webFeaturesVersion: '3.34.2',
    generatedAt: '2026-07-30T00:00:00.000Z',
    readBcd: () => {
      return feature;
    },
    readWebFeature: () => {
      return status;
    },
  };
};

const widelyStatus: WebFeatureStatus = {
  baseline: 'high',
  baseline_high_date: '2026-06-19',
  baseline_low_date: '2023-12-19',
};

const generateOne = (
  feature: BcdFeature,
  status: WebFeatureStatus,
  definition: DetectorDefinition = hasDefinition,
) => {
  return first(generateRegistry([definition], sourcesFor(feature, status)));
};

describe('generateRegistry', () => {
  it('joins curated syntax with BCD and WebDX data', () => {
    const entry = generateOne(widelySupported, widelyStatus);

    expect(entry).toEqual({
      ...hasDefinition,
      baseline: 'widely',
      baselineDate: '2026-06-19',
      mdnUrl: 'https://developer.mozilla.org/docs/Web/CSS/:has',
      support: {
        chrome: '105',
        firefox: '121',
        safari: '15.4',
        safari_ios: '15.4',
      },
      dataVersion: {
        bcd: '8.0.8',
        webFeatures: '3.34.2',
        generatedAt: '2026-07-30T00:00:00.000Z',
      },
    });
  });

  it('reports newly available features with their low date', () => {
    const entry = generateOne(widelySupported, {
      baseline: 'low',
      baseline_low_date: '2025-12-12',
    });

    expect(entry.baseline).toBe('newly');
    expect(entry.baselineDate).toBe('2025-12-12');
  });

  it('reports limited availability without a baseline date', () => {
    const entry = generateOne(widelySupported, { baseline: false });

    expect(entry.baseline).toBe('limited');
    expect(Object.hasOwn(entry, 'baselineDate')).toBe(false);
  });

  it('sorts entries by detector id', () => {
    const entries = generateRegistry(
      [scopeDefinition, hasDefinition],
      sourcesFor(widelySupported, widelyStatus),
    );

    expect(entries.map((entry) => {
      return entry.id;
    })).toEqual(['css-has', 'css-scope']);
  });

  it('names the detector when its BCD path is missing', () => {
    expect(() => {
      return generateRegistry([hasDefinition], sourcesFor(undefined, widelyStatus));
    }).toThrow('css-has: no compatibility data at BCD path "css.selectors.has"');
  });

  it('names the detector when its web feature is missing', () => {
    expect(() => {
      return generateRegistry([hasDefinition], sourcesFor(widelySupported, undefined));
    }).toThrow('css-has: no web feature named "has"');
  });

  it('omits a browser with no support statement at all', () => {
    const entry = generateOne(bcdFeature({ chrome: added('105') }), widelyStatus);

    expect(entry.support).toEqual({ chrome: '105' });
  });

  it('omits a browser whose support statement list is empty', () => {
    const entry = generateOne(bcdFeature({ chrome: [], firefox: added('121') }), widelyStatus);

    expect(entry.support).toEqual({ firefox: '121' });
  });

  it.each([
    ['a boolean version', { version_added: true }],
    ['a null version', { version_added: null }],
    ['a non-release version name', { version_added: 'preview' }],
    ['a ranged version', { version_added: '≤37' }],
    ['prefixed support', { version_added: '105', prefix: '-webkit-' }],
    ['renamed support', { version_added: '105', alternative_name: '-webkit-has' }],
    ['removed support', { version_added: '105', version_removed: '120' }],
    ['partial support', { version_added: '105', partial_implementation: true }],
    ['flagged support', { version_added: '105', flags: [{}] }],
  ])('treats %s as unknown rather than supported', (_case, statement: BrowserSupportStatement) => {
    const entry = generateOne(bcdFeature({ chrome: [statement] }), widelyStatus);

    expect(entry.support).toEqual({});
  });

  it('keeps support that is merely unflagged and complete', () => {
    const entry = generateOne(bcdFeature({ chrome: [{ version_added: '105', flags: [] }] }), widelyStatus);

    expect(entry.support).toEqual({ chrome: '105' });
  });
});
