import {
  describe,
  expect,
  it,
} from 'vitest';

import { hostOf } from './hostUtils';

describe('hostOf', () => {
  it('falls back until the first batch reports a route', () => {
    expect(hostOf('', 'connecting')).toBe('connecting');
  });

  it('takes the host of the route it is on', () => {
    expect(hostOf('https://shop.example.test/products', 'connecting')).toBe('shop.example.test');
  });

  it('falls back when the route is not a usable url', () => {
    expect(hostOf('/products', 'connecting')).toBe('connecting');
  });
});
