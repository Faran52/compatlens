import {
  describe,
  expect,
  it,
} from 'vitest';

import { cx } from '@utils';

describe('cx', () => {
  it('joins the classes it is given', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('drops anything a condition turned off', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns nothing when every class is off', () => {
    expect(cx(false, undefined)).toBe('');
  });
});
