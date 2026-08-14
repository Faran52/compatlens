import {
  describe,
  expect,
  it,
} from 'vitest';

import { chromeFixture } from '@mocks';

import { subscribeToNavigation } from './pageNavigation';

describe('subscribeToNavigation', () => {
  it('hands over the route the page moved to', () => {
    const { api, navigate } = chromeFixture();
    const seen: string[] = [];

    subscribeToNavigation(api, (url) => {
      seen.push(url);
    });
    navigate('https://shop.example.test/checkout');

    expect(seen).toEqual(['https://shop.example.test/checkout']);
  });

  it('reports every navigation, since findings accumulate across routes', () => {
    const { api, navigate } = chromeFixture();
    const seen: string[] = [];

    subscribeToNavigation(api, (url) => {
      seen.push(url);
    });
    navigate('https://shop.example.test/one');
    navigate('https://shop.example.test/two');

    expect(seen).toEqual(['https://shop.example.test/one', 'https://shop.example.test/two']);
  });

  it('lets the panel stop listening when it goes away', () => {
    const {
      api,
      listenerCount,
      navigate,
    } = chromeFixture();
    const seen: string[] = [];

    const stop = subscribeToNavigation(api, (url) => {
      seen.push(url);
    });

    stop();
    navigate('https://shop.example.test/checkout');

    expect(listenerCount()).toBe(0);
    expect(seen).toEqual([]);
  });
});
