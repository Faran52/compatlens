import {
  describe,
  expect,
  it,
} from 'vitest';

import { retiredYearFor } from './retiredUtils';

import type { EngineRun } from '@engine';
import type { RetiredInput } from './retiredUtils';

const runs: Readonly<Record<string, readonly EngineRun[]>> = {
  chrome: [{ engine: 'Blink', from: '28' }],
  edge: [{ engine: 'EdgeHTML', from: '12' }, { engine: 'Blink', from: '79' }],
  ie: [{ engine: 'Trident', from: '8' }],
};

const input = (target: Record<string, string> = {}): RetiredInput => {
  return {
    target,
    runs,
    retired: { Trident: '2022', EdgeHTML: '2021' },
    bcdIdOf: (slot) => {
      return slot === 'edge_legacy' ? 'edge' : slot;
    },
  };
};

describe('retiredYearFor', () => {
  it('badges a retired browser even when it is not targeted', () => {
    expect(retiredYearFor('ie', input())).toBe('2022');
  });

  it('badges Edge Legacy whatever Edge ships today', () => {
    expect(retiredYearFor('edge_legacy', input())).toBe('2021');
  });

  it('leaves a living browser unbadged', () => {
    expect(retiredYearFor('chrome', input())).toBeUndefined();
  });

  it('badges Edge as retired only when targeted at its EdgeHTML years', () => {
    expect(retiredYearFor('edge', input({ edge: '18' }))).toBe('2021');
    expect(retiredYearFor('edge', input({ edge: '121' }))).toBeUndefined();
  });

  it('leaves a browser with no recorded engines unbadged', () => {
    expect(retiredYearFor('opera', input())).toBeUndefined();
  });
});
