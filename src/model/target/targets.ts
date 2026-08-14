import { ageWindowTargets, widelyAvailableTarget } from '@compat-data';
import { AGE_WINDOW_YEARS_RANGE } from '@engine';

import { BASELINE_2022_TARGET } from './constants';

import type { AgeWindowYears, BrowserTarget } from '@engine';

type AgeWindowPreset = `age-${AgeWindowYears}`;

export type TargetPreset = 'widely' | 'baseline-2022' | AgeWindowPreset;

export const isAgeWindow = (value: string): value is AgeWindowPreset => {
  return AGE_WINDOW_YEARS_RANGE.some((years) => {
    return `age-${String(years)}` === value;
  });
};

// Generic over the year, so the caller gets back the same literal the preset carried rather than a bare string.
export const yearsOf = <Y extends AgeWindowYears>(preset: `age-${Y}`): `${Y}` => {
  return preset.slice('age-'.length) as `${Y}`;
};

export const isTargetPreset = (value: string | undefined): value is TargetPreset => {
  if (value === undefined) {
    return false;
  }

  return value === 'widely' || value === 'baseline-2022' || isAgeWindow(value);
};

export const resolveTargetPreset = (preset: TargetPreset): BrowserTarget => {
  if (preset === 'widely') {
    return widelyAvailableTarget;
  }

  if (preset === 'baseline-2022') {
    return BASELINE_2022_TARGET;
  }

  // No fallback, because the lookup cannot miss: the table is keyed by the same year union the preset carries, so
  // the type says every key is present rather than leaving a branch nothing reaches.
  return ageWindowTargets[yearsOf(preset)];
};
