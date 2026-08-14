import {
  describe,
  expect,
  it,
} from 'vitest';

import { hostFromRoutes } from './hostUtils';

describe('hostFromRoutes', () => {
  it('falls back until the first batch reports a route', () => {
    expect(hostFromRoutes([], 'connecting')).toBe('connecting');
  });

  it('takes the host of the first route seen', () => {
    expect(hostFromRoutes(['https://shop.example.test/products'], 'connecting'))
      .toBe('shop.example.test');
  });

  it('falls back when the route is not a usable url', () => {
    expect(hostFromRoutes(['/products'], 'connecting')).toBe('connecting');
  });
});
