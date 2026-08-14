import {
  describe,
  expect,
  it,
} from 'vitest';

import { countTitleFor } from './checkListUtils';

describe('countTitleFor', () => {
  it('says what the number counts, since the column has no room to', () => {
    expect(countTitleFor({ value: 5, noun: 'findings at this severity' }))
      .toBe('5 findings at this severity');
  });

  it('reads the same for a row that found nothing, rather than going quiet', () => {
    expect(countTitleFor({ value: 0, noun: 'findings at this severity' }))
      .toBe('0 findings at this severity');
  });
});
