import {
  describe,
  expect,
  it,
} from 'vitest';

import { toggleIn } from './toggleUtils';

describe('toggleIn', () => {
  it('adds a value that was not there', () => {
    expect([...toggleIn(new Set(['a']), 'b')]).toEqual(['a', 'b']);
  });

  it('removes a value that was already there', () => {
    expect([...toggleIn(new Set(['a', 'b']), 'a')]).toEqual(['b']);
  });

  it('leaves the original set untouched', () => {
    const original = new Set(['a']);

    toggleIn(original, 'b');

    expect([...original]).toEqual(['a']);
  });
});
