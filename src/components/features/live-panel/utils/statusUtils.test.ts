import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  emptyMessageFor,
  isConnecting,
  phaseOf,
  statusLineFor,
} from './statusUtils';

import type { SessionReport } from '@engine';

const SEEN: readonly string[] = ['/a.css', '/b.css', '/c.css'];

const MATCHED: readonly string[] = Array.from({ length: 30 }, (_, index) => {
  return `feature-${String(index)}`;
});

const report = (fields: Partial<SessionReport>): SessionReport => {
  return {
    occurrences: [],
    suggestions: [],
    route: '',
    routes: [],
    resources: { seen: [], parsed: [] },
    coverage: { matched: [], registryFeatures: 0 },
    warnings: [],
    watching: true,
    capped: false,
    ...fields,
  };
};

describe('statusLineFor', () => {
  it('says nothing is being watched when the observer is not installed', () => {
    expect(statusLineFor(report({ watching: false }))).toBe('not watching');
  });

  it('counts a single route and a single feature in the singular', () => {
    expect(statusLineFor(report({
      routes: ['/'],
      resources: { seen: ['/a.css'], parsed: ['/a.css'] },
      coverage: { matched: ['css-has'], registryFeatures: 40 },
    }))).toBe('watching · 1 route · 1 of 1 read · 1 feature matched');
  });

  it('counts several of each in the plural', () => {
    expect(statusLineFor(report({
      routes: ['/', '/orders'],
      resources: { seen: SEEN, parsed: SEEN.slice(0, 2) },
      coverage: { matched: MATCHED, registryFeatures: 40 },
    }))).toBe('watching · 2 routes · 2 of 3 read · 30 features matched');
  });

  it('says it is still connecting before the page has ever been read', () => {
    expect(statusLineFor(report({}))).toBe('connecting');
  });

  it('counts none in the plural once a route is known', () => {
    expect(statusLineFor(report({ routes: ['/'] })))
      .toBe('watching · 1 route · 0 of 0 read · 0 features matched');
  });
});

describe('phaseOf', () => {
  it('is stalled when the observer was never installed', () => {
    expect(phaseOf(report({ watching: false }))).toBe('stalled');
  });

  it('is connecting while watching but before the first read', () => {
    expect(phaseOf(report({}))).toBe('connecting');
  });

  it('is watching once a route has come back', () => {
    expect(phaseOf(report({ routes: ['/'] }))).toBe('watching');
  });
});

describe('emptyMessageFor', () => {
  it('says the page is being read rather than implying it came back clean', () => {
    expect(emptyMessageFor(report({}))).toBe(
      'Reading the page. Findings will appear as soon as it has been read.',
    );
  });

  it('says the target is clean only once the page has actually been read', () => {
    expect(emptyMessageFor(report({ routes: ['/'] })))
      .toBe('Nothing to fix for this target yet. Use the page and findings will appear.');
  });

  it('says plainly when nothing is being watched at all', () => {
    expect(emptyMessageFor(report({ watching: false })))
      .toBe('Not watching this page yet. Reload the page, or reopen DevTools on it.');
  });
});

describe('isConnecting', () => {
  it('holds the filters back until the page has been read', () => {
    expect(isConnecting(report({}))).toBe(true);
  });

  it('releases them once a route is known', () => {
    expect(isConnecting(report({ routes: ['/'] }))).toBe(false);
  });

  it('releases them when the panel is not watching, so the reason stays readable', () => {
    expect(isConnecting(report({ watching: false }))).toBe(false);
  });
});
