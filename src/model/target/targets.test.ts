import {
  describe,
  expect,
  it,
} from 'vitest';

import { ageWindowTargets, widelyAvailableTarget } from '@compat-data';

import {
  isAgeWindow,
  isTargetPreset,
  resolveTargetPreset,
  yearsOf,
} from './targets';

describe('isAgeWindow', () => {
  it('accepts every window the range declares, from one year to fifteen', () => {
    expect(['age-1', 'age-2', 'age-7', 'age-15'].every(isAgeWindow)).toBe(true);
  });

  it.each([['age-0'], ['age-16'], ['widely'], ['']])('rejects %s', (value: string) => {
    expect(isAgeWindow(value)).toBe(false);
  });
});

describe('yearsOf', () => {
  it('reads the year count out of the preset', () => {
    expect(yearsOf('age-12')).toBe('12');
  });
});

describe('resolveTargetPreset', () => {
  it('resolves the fixed Baseline 2022 target reproducibly', () => {
    expect(resolveTargetPreset('baseline-2022')).toEqual({
      chrome: '108',
      firefox: '108',
      safari: '16',
      safari_ios: '16',
    });
  });

  it('resolves Widely Available from the pinned dataset snapshot', () => {
    expect(resolveTargetPreset('widely')).toEqual(widelyAvailableTarget);
  });

  it.each([
    ['age-2'],
    ['age-5'],
    ['age-7'],
    ['age-10'],
  ])('resolves %s from the generated windows', (window: string) => {
    if (!isAgeWindow(window)) {
      throw new Error(`${window} is not an age window`);
    }

    expect(resolveTargetPreset(window)).toEqual(ageWindowTargets[yearsOf(window)]);
  });

  it('never targets a browser with no release inside the window', () => {
    expect(resolveTargetPreset('age-10')).not.toHaveProperty('ie');
  });

  it('widens the floor as the window grows', () => {
    const recent = resolveTargetPreset('age-2').chrome;
    const older = resolveTargetPreset('age-10').chrome;

    expect(recent).toBeDefined();
    expect(older).toBeDefined();
    expect(Number(recent)).toBeGreaterThan(Number(older));
  });
});

describe('isTargetPreset', () => {
  it('accepts the named presets and every age window', () => {
    expect(['widely', 'baseline-2022', 'age-7'].every(isTargetPreset)).toBe(true);
  });

  it.each([['baseline-2015'], ['age-16'], ['custom'], [''], [undefined]])(
    'rejects %s',
    (value: string | undefined) => {
      expect(isTargetPreset(value)).toBe(false);
    },
  );
});
