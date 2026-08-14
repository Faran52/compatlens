import { blockedFindingFixture, degradedFindingFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { emptySession, mergeBatch } from './session';

import type { AnalysisReport, Finding } from '@engine';

const context = { route: 'https://shop.example.test/products', at: '2026-07-31T10:00:00.000Z' };

const other = { route: 'https://shop.example.test/checkout', at: '2026-07-31T10:01:00.000Z' };

const reportWith = (findings: readonly Finding[], overrides: Partial<AnalysisReport> = {}): AnalysisReport => {
  return {
    findings,
    suggestions: [],
    resources: { total: 1, parsed: 1, failed: 0 },
    coverage: { mappedDetections: findings.length, registryFeatures: 34 },
    warnings: [],
    durationMs: 1,
    ...overrides,
  };
};

describe('emptySession', () => {
  it('starts with nothing recorded and nothing capped', () => {
    const session = emptySession();

    expect(session.occurrences).toEqual([]);
    expect(session.routes).toEqual([]);
    expect(session.capped).toBe(false);
  });
});

describe('mergeBatch', () => {
  it('records where and when a finding was first seen', () => {
    const session = mergeBatch(emptySession(), reportWith([blockedFindingFixture]), context);

    expect(session.occurrences[0]?.route).toBe(context.route);
    expect(session.occurrences[0]?.firstSeen).toBe(context.at);
  });

  it('keeps the first sighting when the same occurrence arrives again', () => {
    const first = mergeBatch(emptySession(), reportWith([blockedFindingFixture]), context);
    const second = mergeBatch(first, reportWith([blockedFindingFixture]), other);

    expect(second.occurrences).toHaveLength(1);
    expect(second.occurrences[0]?.route).toBe(context.route);
  });

  it('accumulates findings that are genuinely new', () => {
    const first = mergeBatch(emptySession(), reportWith([blockedFindingFixture]), context);
    const second = mergeBatch(first, reportWith([degradedFindingFixture]), other);

    expect(second.occurrences).toHaveLength(2);
  });

  it('records each route once, in the order it was first visited', () => {
    const first = mergeBatch(emptySession(), reportWith([blockedFindingFixture]), context);
    const second = mergeBatch(first, reportWith([degradedFindingFixture]), other);
    const third = mergeBatch(second, reportWith([]), context);

    expect(third.routes).toEqual([context.route, other.route]);
  });

  it('adds up resources and detections across batches', () => {
    const first = mergeBatch(emptySession(), reportWith([blockedFindingFixture]), context);
    const second = mergeBatch(first, reportWith([degradedFindingFixture]), other);

    expect(second.resources).toEqual({ total: 2, parsed: 2, failed: 0 });
    expect(second.coverage.mappedDetections).toBe(2);
    expect(second.coverage.registryFeatures).toBe(34);
  });

  it('keeps a warning once however many batches repeat it', () => {
    const warnings = ['Could not parse https://x.test/a.css'];
    const first = mergeBatch(emptySession(), reportWith([], { warnings }), context);
    const second = mergeBatch(first, reportWith([], { warnings }), other);

    expect(second.warnings).toEqual(warnings);
  });

  it('collects suggestions without repeating one already recorded', () => {
    const suggestion = {
      id: 'legacy@a.css:1:1',
      ruleId: 'legacy',
      syntax: '-webkit-appearance',
      advice: 'Drop the prefix.',
      name: 'appearance property',
      replacementSyntax: 'appearance',
      mdnUrl: 'https://developer.mozilla.org/appearance',
      location: { url: 'https://x.test/a.css', line: 1 },
    };
    const first = mergeBatch(emptySession(), reportWith([], { suggestions: [suggestion] }), context);
    const second = mergeBatch(first, reportWith([], { suggestions: [suggestion] }), other);

    expect(second.suggestions).toHaveLength(1);
  });

  it('reports when the cap is reached rather than truncating in silence', () => {
    const many = Array.from({ length: 5001 }, (_, index) => {
      return {
        ...blockedFindingFixture,
        location: { ...blockedFindingFixture.location, path: `html>body>div:nth-of-type(${String(index)})` },
      };
    });
    const session = mergeBatch(emptySession(), reportWith(many), context);

    expect(session.capped).toBe(true);
    expect(session.occurrences).toHaveLength(5000);
  });

  it('stays capped once it has been capped', () => {
    const many = Array.from({ length: 5001 }, (_, index) => {
      return {
        ...blockedFindingFixture,
        location: { ...blockedFindingFixture.location, path: `html>body>div:nth-of-type(${String(index)})` },
      };
    });
    const first = mergeBatch(emptySession(), reportWith(many), context);
    const second = mergeBatch(first, reportWith([]), other);

    expect(second.capped).toBe(true);
  });
});

describe('watching', () => {
  it('starts not watching, since nothing has confirmed the observer yet', () => {
    expect(emptySession().watching).toBe(false);
  });

  it('keeps the watching flag across merges', () => {
    const started = { ...emptySession(), watching: true };

    expect(mergeBatch(started, reportWith([]), context).watching).toBe(true);
  });
});
