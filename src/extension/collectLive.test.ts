import { chromeFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  captureLive,
  restartObserving,
  startObserving,
} from './collectLive';
import { UNREADABLE_STYLESHEET_WARNING } from './constants';

import type { ObservedStylesheet } from './devtools-api';

const batch = (
  fragments: readonly string[],
  dropped = 0,
  stylesheets: readonly ObservedStylesheet[] = [],
) => {
  return {
    route: 'https://shop.example.test/products',
    fragments,
    dropped,
    stylesheets,
  };
};

describe('startObserving', () => {
  it('installs the observer on the inspected page', async () => {
    const { api } = chromeFixture({ evalResult: true });

    await expect(startObserving(api)).resolves.toBeUndefined();
  });

  it('surfaces a page that refuses the observer', async () => {
    const { api } = chromeFixture({ exception: { isException: true, value: 'no' } });

    await expect(startObserving(api)).rejects.toThrow('no');
  });
});

describe('captureLive', () => {
  it('reads each added subtree as rendered markup at the current route', async () => {
    const { api } = chromeFixture({ evalResult: batch(['<li>one</li>', '<li>two</li>']) });
    const capture = await captureLive(api);

    expect(capture.route).toBe('https://shop.example.test/products');
    expect(capture.resources).toEqual([
      {
        kind: 'html',
        url: 'https://shop.example.test/products',
        content: '<li>one</li>',
        view: 'rendered',
      },
      {
        kind: 'html',
        url: 'https://shop.example.test/products',
        content: '<li>two</li>',
        view: 'rendered',
      },
    ]);
  });

  it('reads the stylesheets alongside the markup that arrived', async () => {
    const { api } = chromeFixture({
      evalResult: batch(['<li>one</li>']),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources.filter((resource) => {
      return resource.kind === 'css';
    })).toEqual([
      { kind: 'css', url: 'https://shop.example.test/app.css', content: '.a { color: red; }' },
    ]);
  });

  it('reads the stylesheets from the network log alone when there is no resource api', async () => {
    const { api } = chromeFixture({
      resourceApi: false,
      evalResult: batch(['<li>one</li>']),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources.filter((resource) => {
      return resource.kind === 'css';
    })).toEqual([
      { kind: 'css', url: 'https://shop.example.test/app.css', content: '.a { color: red; }' },
    ]);
  });

  it('says a stylesheet was skipped rather than failing when the log carries no reader', async () => {
    const { api } = chromeFixture({
      resourceApi: false,
      evalResult: batch(['<li>one</li>']),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
        contentApi: false,
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources).toHaveLength(1);
    expect(capture.warnings).toEqual([UNREADABLE_STYLESHEET_WARNING]);
  });

  it('skips a stylesheet whose body came back empty, and says it did', async () => {
    const { api } = chromeFixture({
      evalResult: batch(['<li>one</li>']),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '',
        mimeType: 'text/css',
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources).toHaveLength(1);
    expect(capture.warnings).toEqual([UNREADABLE_STYLESHEET_WARNING]);
  });

  it('reads the copy the page fetched itself when devtools hands back no body', async () => {
    const { api } = chromeFixture({
      resourceApi: false,
      evalResult: batch(
        ['<li>one</li>'],
        0,
        [{ url: 'https://shop.example.test/app.css', text: '.a { color: red; }' }],
      ),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
        contentApi: false,
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources.filter((resource) => {
      return resource.kind === 'css';
    })).toEqual([
      { kind: 'css', url: 'https://shop.example.test/app.css', content: '.a { color: red; }' },
    ]);
    expect(capture.warnings).toEqual([]);
  });

  it('prefers the devtools body over the copy the page fetched of the same stylesheet', async () => {
    const { api } = chromeFixture({
      evalResult: batch(
        ['<li>one</li>'],
        0,
        [{ url: 'https://shop.example.test/app.css', text: '.page { color: blue; }' }],
      ),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.devtools { color: red; }',
        mimeType: 'text/css',
      }],
    });
    const capture = await captureLive(api);

    expect(capture.resources.filter((resource) => {
      return resource.kind === 'css';
    })).toEqual([
      { kind: 'css', url: 'https://shop.example.test/app.css', content: '.devtools { color: red; }' },
    ]);
  });

  it('warns when the only copy of a stylesheet is one the page was refused', async () => {
    const { api } = chromeFixture({
      resourceApi: false,
      evalResult: batch(
        ['<li>one</li>'],
        0,
        [{ url: 'https://cdn.example.test/vendor.css', text: '' }],
      ),
    });
    const capture = await captureLive(api);

    expect(capture.resources).toHaveLength(1);
    expect(capture.warnings).toEqual([UNREADABLE_STYLESHEET_WARNING]);
  });

  it('reads a stylesheet the page fetched that no devtools source listed', async () => {
    const { api } = chromeFixture({
      evalResult: batch(
        ['<li>one</li>'],
        0,
        [{ url: 'https://cdn.example.test/vendor.css', text: '.v { color: red; }' }],
      ),
    });
    const capture = await captureLive(api);

    expect(capture.resources.filter((resource) => {
      return resource.kind === 'css';
    })).toEqual([
      { kind: 'css', url: 'https://cdn.example.test/vendor.css', content: '.v { color: red; }' },
    ]);
  });

  it('reads a stylesheet that arrives on a drain the markup had already left', async () => {
    const { api } = chromeFixture({
      evalResult: batch(
        [],
        0,
        [{ url: 'https://cdn.example.test/vendor.css', text: '.v { color: red; }' }],
      ),
    });
    const capture = await captureLive(api);

    expect(capture.resources).toEqual([
      { kind: 'css', url: 'https://cdn.example.test/vendor.css', content: '.v { color: red; }' },
    ]);
  });

  it('stays quiet about a page that simply has no stylesheet of its own', async () => {
    const { api } = chromeFixture({ evalResult: batch(['<li>one</li>']) });

    expect((await captureLive(api)).warnings).toEqual([]);
  });

  it('stays quiet when every stylesheet came back readable', async () => {
    const { api } = chromeFixture({
      evalResult: batch(['<li>one</li>']),
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });

    expect((await captureLive(api)).warnings).toEqual([]);
  });

  it('does no stylesheet work at all when the page has been still', async () => {
    const { api } = chromeFixture({ evalResult: batch([]) });
    const capture = await captureLive(api);

    expect(capture.resources).toEqual([]);
    expect(capture.warnings).toEqual([]);
  });

  it('still reports overflow when everything added was dropped', async () => {
    const { api } = chromeFixture({ evalResult: batch([], 9) });
    const capture = await captureLive(api);

    expect(capture.resources).toEqual([]);
    expect(capture.warnings[0]).toContain('9 changes were not read');
  });

  it('says so when the page changed faster than it could be read', async () => {
    const { api } = chromeFixture({ evalResult: batch(['<li>one</li>'], 37) });
    const capture = await captureLive(api);

    expect(capture.warnings).toEqual([
      'The page changed faster than CompatLens could read it. 37 changes were not read.',
    ]);
  });
});

describe('restartObserving', () => {
  it('hands the page back to an observer that is already installed', async () => {
    const { api } = chromeFixture({ evalResult: true });

    await expect(restartObserving(api)).resolves.toBeUndefined();
  });

  it('reports a page that can no longer be reached', async () => {
    const { api } = chromeFixture({ exception: { isException: true, value: 'page gone' } });

    await expect(restartObserving(api)).rejects.toThrow('page gone');
  });
});
