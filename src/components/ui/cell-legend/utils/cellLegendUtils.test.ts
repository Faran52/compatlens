import {
  describe,
  expect,
  it,
} from 'vitest';

import { LEGEND_ENTRIES } from './cellLegendUtils';

describe('LEGEND_ENTRIES', () => {
  it('explains every state a cell can render', () => {
    expect(LEGEND_ENTRIES.map((entry) => {
      return entry.state;
    })).toStrictEqual(['supported', 'too-late', 'never']);
  });

  it('samples the literal text each state puts in a cell', () => {
    expect(LEGEND_ENTRIES.map((entry) => {
      return entry.sample;
    })).toStrictEqual(['76', 'from 18', 'never']);
  });

  it('gives every entry a distinct meaning', () => {
    const meanings = new Set(LEGEND_ENTRIES.map((entry) => {
      return entry.meaning;
    }));

    expect(meanings.size).toBe(LEGEND_ENTRIES.length);
  });
});
