import { chromeFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { readHar, readResources } from './pageResources';

describe('readHar', () => {
  it('hands back the entries the network log is holding', async () => {
    const { api } = chromeFixture({
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });

    const har = await readHar(api.network);

    expect(har.entries.map((entry) => {
      return entry.request.url;
    })).toEqual(['https://shop.example.test/app.css']);
  });

  it('hands back an empty log rather than nothing when the page loaded quietly', async () => {
    const { api } = chromeFixture();

    expect((await readHar(api.network)).entries).toEqual([]);
  });
});

describe('readResources', () => {
  it('lists what the inspected window is holding', async () => {
    const { api } = chromeFixture({
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });

    expect((await readResources(api.inspectedWindow)).map((resource) => {
      return resource.url;
    })).toEqual(['https://shop.example.test/app.css']);
  });

  it('lists nothing for a page that loaded no stylesheet', async () => {
    const { api } = chromeFixture();

    expect(await readResources(api.inspectedWindow)).toEqual([]);
  });

  it('lists nothing on a browser whose inspected window has no resource api', async () => {
    const { api } = chromeFixture({
      resourceApi: false,
      stylesheets: [{
        url: 'https://shop.example.test/app.css',
        content: '.a { color: red; }',
        mimeType: 'text/css',
      }],
    });

    expect(await readResources(api.inspectedWindow)).toEqual([]);
  });
});
