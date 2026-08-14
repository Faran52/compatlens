import { blockedFindingFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  countBySeverity,
  failingOn,
  failuresIn,
  impactFor,
  sectionsFor,
  severityCheckRowsFor,
  visibleOccurrences,
} from './gridUtils';

import type {
  BrowserImpact,
  Occurrence,
  RiskLevel,
} from '@engine';

const occurrence = (name: string, risk: RiskLevel, impacts: readonly BrowserImpact[]): Occurrence => {
  return { ...blockedFindingFixture, name, risk, impacts, route: '/', firstSeen: 'now' };
};

const fails: readonly BrowserImpact[] = [
  { slot: 'chrome', targetVersion: '1', supportedFrom: '2', supported: false },
];

const passes: readonly BrowserImpact[] = [
  { slot: 'chrome', targetVersion: '9', supportedFrom: '2', supported: true },
];

const all: readonly Occurrence[] = [
  occurrence('zeta', 'degrades', fails),
  occurrence('alpha', 'breaks', fails),
  occurrence('beta', 'breaks', passes),
];

const every = new Set<RiskLevel>(['breaks', 'degrades']);

describe('sectionsFor', () => {
  it('puts what breaks ahead of what degrades', () => {
    expect(sectionsFor(all, every, 'feature').map((section) => {
      return section.risk;
    })).toEqual(['breaks', 'degrades']);
  });

  it('sorts the rows inside each section', () => {
    expect(sectionsFor(all, every, 'feature')[0].occurrences.map((item) => {
      return item.name;
    })).toEqual(['alpha', 'beta']);
  });

  it('drops a severity the developer filtered out', () => {
    expect(sectionsFor(all, new Set<RiskLevel>(['breaks']), 'feature')).toHaveLength(1);
  });

  it('drops a severity that has no rows', () => {
    expect(sectionsFor([occurrence('a', 'breaks', fails)], every, 'feature')).toHaveLength(1);
  });
});

describe('countBySeverity', () => {
  it('counts the rows at one severity', () => {
    expect(countBySeverity(all, 'breaks')).toBe(2);
    expect(countBySeverity(all, 'degrades')).toBe(1);
  });
});

describe('severityCheckRowsFor', () => {
  const rowsFor = (risks: ReadonlySet<RiskLevel>) => {
    return severityCheckRowsFor({ occurrences: all, risks, onToggle: () => {
      return undefined;
    } });
  };

  it('offers a labelled row per severity, worst first', () => {
    expect(rowsFor(every).map((row) => {
      return row.label;
    })).toStrictEqual(['Breaks', 'Degrades']);
  });

  it('checks only the severities in the filter', () => {
    expect(rowsFor(new Set<RiskLevel>(['breaks'])).map((row) => {
      return row.checked;
    })).toStrictEqual([true, false]);
  });

  it('keeps an unchecked severity counting its findings', () => {
    const rows = rowsFor(new Set<RiskLevel>([]));

    expect(rows.map((row) => {
      return row.active;
    })).toStrictEqual([true, true]);
    expect(rows.map((row) => {
      return row.count?.value;
    })).toStrictEqual([2, 1]);
  });

  it('toggles the severity of the row that was clicked', () => {
    const toggled: RiskLevel[] = [];
    const rows = severityCheckRowsFor({
      occurrences: all,
      risks: every,
      onToggle: (risk) => {
        toggled.push(risk);
      },
    });

    rows[1].onToggle();

    expect(toggled).toStrictEqual(['degrades']);
  });
});

describe('failingOn', () => {
  it('keeps only the findings that fail on a browser in the list', () => {
    expect(failingOn(all, ['chrome']).map((occurrence) => {
      return occurrence.name;
    })).toStrictEqual(['zeta', 'alpha']);
  });

  it('drops every finding when no browser in the list is affected', () => {
    expect(failingOn(all, ['safari'])).toStrictEqual([]);
  });

  it('drops every finding when nothing is targeted at all', () => {
    expect(failingOn(all, [])).toStrictEqual([]);
  });
});

describe('failuresIn', () => {
  it('counts findings that fail on any browser in the column', () => {
    expect(failuresIn(all, ['chrome'])).toBe(2);
  });

  it('counts nothing for a column no finding touches', () => {
    expect(failuresIn(all, ['safari'])).toBe(0);
  });
});

describe('visibleOccurrences', () => {
  it('keeps only the severities the reader has left checked', () => {
    expect(visibleOccurrences(all, new Set<RiskLevel>(['breaks'])).map((occurrence) => {
      return occurrence.name;
    })).toStrictEqual(['alpha', 'beta']);
  });

  it('keeps nothing when every severity is unchecked', () => {
    expect(visibleOccurrences(all, new Set<RiskLevel>())).toStrictEqual([]);
  });
});

describe('impactFor', () => {
  it('hands back the impact the finding recorded for that browser', () => {
    expect(impactFor(occurrence('alpha', 'breaks', fails), 'chrome')).toStrictEqual(fails[0]);
  });

  it('reads a browser no failure was recorded for as supported', () => {
    expect(impactFor(occurrence('alpha', 'breaks', fails), 'safari'))
      .toStrictEqual({ slot: 'safari', targetVersion: '', supported: true });
  });
});
