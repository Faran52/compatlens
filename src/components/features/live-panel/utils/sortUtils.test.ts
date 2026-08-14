import { SORT_BY_LEAD } from '@components/ui';
import { blockedFindingFixture, degradedFindingFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { compareOccurrences, sortKeyFor } from './sortUtils';

import type { BrowserImpact, Occurrence } from '@engine';

const occurrence = (overrides: Partial<Occurrence>): Occurrence => {
  return { ...blockedFindingFixture, route: '/', firstSeen: 'now', ...overrides };
};

const breaks = occurrence({ name: 'zeta', risk: 'breaks' });
const degrades = occurrence({ ...degradedFindingFixture, name: 'alpha', risk: 'degrades' });

const sorted = (key: Parameters<typeof compareOccurrences>[0], items: Occurrence[]): string[] => {
  return [...items].sort(compareOccurrences(key)).map((item) => {
    return item.name;
  });
};

describe('compareOccurrences', () => {
  it('puts what breaks ahead of what degrades', () => {
    expect(sorted('severity', [degrades, breaks])).toEqual(['zeta', 'alpha']);
  });

  it('falls back to the feature name at equal severity', () => {
    const other = occurrence({ name: 'aaa', risk: 'breaks' });

    expect(sorted('severity', [breaks, other])).toEqual(['aaa', 'zeta']);
  });

  it('sorts by feature name when asked', () => {
    expect(sorted('feature', [breaks, degrades])).toEqual(['alpha', 'zeta']);
  });

  it('ranks what fails on a chosen browser first', () => {
    const fails = occurrence({
      name: 'fails',
      impacts: [{ slot: 'safari', targetVersion: '17', supportedFrom: '18', supported: false }],
    });
    const passes = occurrence({
      name: 'passes',
      impacts: [{ slot: 'safari', targetVersion: '18', supportedFrom: '18', supported: true }],
    });

    expect(sorted('safari', [passes, fails])).toEqual(['fails', 'passes']);
  });

  it('falls back to severity among rows that all fail on that browser', () => {
    const impacts: readonly BrowserImpact[] = [
      { slot: 'safari', targetVersion: '17', supportedFrom: '18', supported: false },
    ];
    const bad = occurrence({ name: 'zzz', risk: 'breaks', impacts });
    const mild = occurrence({ name: 'aaa', risk: 'degrades', impacts });

    expect(sorted('safari', [mild, bad])).toEqual(['zzz', 'aaa']);
  });

  it('falls back to name when severity ties on a browser sort', () => {
    const impacts: readonly BrowserImpact[] = [
      { slot: 'safari', targetVersion: '17', supportedFrom: '18', supported: false },
    ];
    const one = occurrence({ name: 'bbb', risk: 'breaks', impacts });
    const two = occurrence({ name: 'aaa', risk: 'breaks', impacts });

    expect(sorted('safari', [one, two])).toEqual(['aaa', 'bbb']);
  });
});

describe('sortKeyFor', () => {
  it('reads the lead column as a sort by feature name', () => {
    expect(sortKeyFor(SORT_BY_LEAD)).toBe('feature');
  });

  it('keeps a browser column as a sort by that browser', () => {
    expect(sortKeyFor('safari_ios')).toBe('safari_ios');
  });

  it('falls back to severity for a key no column owns', () => {
    expect(sortKeyFor('not-a-column')).toBe('severity');
  });
});
