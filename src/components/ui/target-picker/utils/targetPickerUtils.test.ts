import {
  describe,
  expect,
  it,
} from 'vitest';

import { yearsAfterStep } from './targetPickerUtils';

describe('yearsAfterStep', () => {
  it('moves one year at a time in either direction', () => {
    expect(yearsAfterStep(4, 1)).toBe(5);
    expect(yearsAfterStep(4, -1)).toBe(3);
  });

  it('refuses to step below the shortest window offered', () => {
    expect(yearsAfterStep(1, -1)).toBeUndefined();
  });

  it('refuses to step past the longest window offered', () => {
    expect(yearsAfterStep(15, 1)).toBeUndefined();
  });
});
