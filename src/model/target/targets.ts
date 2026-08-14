import { ageWindowTargets, widelyAvailableTarget } from '@compat-data';
import { AGE_WINDOW_YEARS_RANGE } from '@engine';

import { BASELINE_2022_TARGET } from './constants';

import type { AgeWindowYears, BrowserTarget } from '@engine';

export type AgeWindowPreset = `age-${AgeWindowYears}`;

export type TargetPreset = 'widely' | 'baseline-2022' | AgeWindowPreset;

export const isAgeWindow = (value: string): value is AgeWindowPreset => {
  return AGE_WINDOW_YEARS_RANGE.some((years) => {
    return `age-${String(years)}` === value;
  });
};

export const yearsOf = (preset: AgeWindowPreset): string => {
  return preset.slice('age-'.length);
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

  return ageWindowTargets[yearsOf(preset)];
};
