import { AGE_WINDOW_YEARS_RANGE } from '@engine';

import type { AgeWindowYears } from '@engine';

// The range decides where the steppers stop, so neither end of it is written down twice.
export const yearsAfterStep = (
  years: AgeWindowYears,
  step: number,
): AgeWindowYears | undefined => {
  return AGE_WINDOW_YEARS_RANGE.find((year) => {
    return year === years + step;
  });
};
