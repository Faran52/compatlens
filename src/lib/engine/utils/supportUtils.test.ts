import {
  describe,
  expect,
  it,
} from 'vitest';

import { compareVersions, resolveSupport } from './supportUtils';

import type {
  BrowserTarget,
  DetectedFeature,
  DetectorKind,
  FeatureRegistryEntry,
} from '../types';

const detection: DetectedFeature = {
  featureId: 'css-has',
  location: {
    url: 'https://example.test/app.css',
    line: 12,
    column: 3,
  },
};

const entryWith = (
  support: FeatureRegistryEntry['support'],
  kind: DetectorKind = 'css-selector',
): FeatureRegistryEntry => {
  return {
    id: 'css-has',
    name: ':has() selector',
    kind,
    syntax: ':has()',
    bcdPath: 'css.selectors.has',
    webFeatureId: 'has',
    defaultRisk: 'breaks',
    fallback: 'Keep a class-based selector fallback.',
    baseline: 'widely',
    mdnUrl: 'https://developer.mozilla.org/docs/Web/CSS/:has',
    support,
    dataVersion: {
      bcd: '8.0.8',
      webFeatures: '3.34.2',
      generatedAt: '2026-07-30T00:00:00.000Z',
    },
  };
};

const fullSupport = entryWith({
  chrome: '105',
  firefox: '121',
  safari: '15.4',
  safari_ios: '15.4',
});

const target = (
  chrome: string,
  firefox: string,
  safari: string,
  safariIos: string,
): BrowserTarget => {
  return {
    chrome,
    firefox,
    safari,
    safari_ios: safariIos,
  };
};

const modernTarget = target('120', '125', '17', '17');

describe('compareVersions', () => {
  it('orders releases by numeric segment rather than by decimal value', () => {
    expect(compareVersions('15.10', '15.4')).toBe(1);
    expect(compareVersions('15.4', '15.10')).toBe(-1);
  });

  it('treats missing trailing segments as zero', () => {
    expect(compareVersions('16', '16.0')).toBe(0);
    expect(compareVersions('16.1', '16')).toBe(1);
  });

  it('reports equal versions as equal', () => {
    expect(compareVersions('121', '121')).toBe(0);
  });
});

describe('resolveSupport', () => {
  it('reports every targeted slot, marking only the ones whose target predates support', () => {
    const finding = resolveSupport(detection, fullSupport, target('120', '115', '16.0', '16.0'));

    expect(finding?.impacts.map((impact) => {
      return [impact.slot, impact.supported];
    })).toEqual([
      ['chrome', true],
      ['firefox', false],
      ['safari', true],
      ['safari_ios', true],
    ]);
  });

  it('omits a finding when every target supports the feature', () => {
    expect(resolveSupport(detection, fullSupport, modernTarget)).toBeNull();
  });

  it('treats a target sitting exactly on the support floor as supported', () => {
    expect(resolveSupport(detection, fullSupport, target('105', '121', '15.4', '15.4'))).toBeNull();
  });

  it('carries the detection location and registry guidance onto the finding', () => {
    const finding = resolveSupport(detection, fullSupport, target('100', '115', '16.0', '16.0'));

    expect(finding).toMatchObject({
      id: 'css-has@https://example.test/app.css:12:3',
      featureId: 'css-has',
      name: ':has() selector',
      kind: 'css-selector',
      sourceKind: 'css',
      syntax: ':has()',
      risk: 'breaks',
      fallback: 'Keep a class-based selector fallback.',
      mdnUrl: 'https://developer.mozilla.org/docs/Web/CSS/:has',
      baseline: 'widely',
      location: detection.location,
    });
  });

  it('keeps the catalog severity but marks it unverified when no support floor is known', () => {
    const finding = resolveSupport(detection, entryWith({}), modernTarget);

    expect(finding?.risk).toBe('breaks');
    expect(finding?.verified).toBe(false);
    expect(finding?.impacts).toEqual([
      { slot: 'chrome', targetVersion: '120', supported: false },
      { slot: 'firefox', targetVersion: '125', supported: false },
      { slot: 'safari', targetVersion: '17', supported: false },
      { slot: 'safari_ios', targetVersion: '17', supported: false },
    ]);
  });

  it('marks a finding verified when every failing slot has a known support floor', () => {
    const finding = resolveSupport(detection, fullSupport, target('120', '115', '16.0', '16.0'));

    expect(finding?.verified).toBe(true);
  });

  it('keeps the detector risk when at least one browser has a known support floor', () => {
    const finding = resolveSupport(
      detection,
      entryWith({ firefox: '121' }),
      target('120', '115', '17', '17'),
    );

    expect(finding?.risk).toBe('breaks');
  });

  it('labels html detectors as html sources', () => {
    const finding = resolveSupport(detection, entryWith({}, 'html-attribute'), modernTarget);

    expect(finding?.sourceKind).toBe('html');
  });

  it('falls back to a zero position when the detection has no line or column', () => {
    const finding = resolveSupport(
      { featureId: 'css-has', location: { url: 'https://example.test/app.css' } },
      entryWith({}),
      modernTarget,
    );

    expect(finding?.id).toBe('css-has@https://example.test/app.css:0:0');
  });
});
