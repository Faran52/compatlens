import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  base64Body,
  first,
  harEntry,
} from '@mocks';

import {
  readContent,
  stylesheetCandidates,
  toInspectedResource,
} from './resourceBodies';

const sheet = (url: string, mimeType: string) => {
  return harEntry({ url, mimeType, content: `/* ${url} */` });
};

const urlsOf = (sources: readonly { url: string }[]): string[] => {
  return sources.map((source) => {
    return source.url;
  });
};

describe('toInspectedResource', () => {
  it('presents a network entry with the same shape as a page resource', async () => {
    const source = toInspectedResource(sheet('https://example.test/a.css', 'text/css'));

    expect(source.url).toBe('https://example.test/a.css');
    await expect(readContent(source)).resolves.toBe('/* https://example.test/a.css */');
  });

  it('reads empty rather than throwing when the log entry carries no reader', async () => {
    const source = toInspectedResource(harEntry({
      url: 'https://example.test/a.css',
      mimeType: 'text/css',
      content: '.a { color: red; }',
      contentApi: false,
    }));

    expect(source.url).toBe('https://example.test/a.css');
    await expect(readContent(source)).resolves.toBe('');
  });
});

describe('readContent', () => {
  it('returns a plain body unchanged', async () => {
    const source = toInspectedResource(sheet('https://example.test/a.css', 'text/css'));

    await expect(readContent(source)).resolves.toBe('/* https://example.test/a.css */');
  });

  it('decodes a base64 body as UTF-8', async () => {
    const entry = harEntry({
      url: 'https://example.test/a.css',
      mimeType: 'text/css',
      content: base64Body('.a { content: "café"; }'),
      encoding: 'base64',
    });

    await expect(readContent(toInspectedResource(entry))).resolves.toBe('.a { content: "café"; }');
  });
});

describe('stylesheetCandidates', () => {
  it('keeps a response typed text/css whatever its path', () => {
    const candidates = stylesheetCandidates([], [sheet('https://example.test/styles', 'text/css')]);

    expect(urlsOf(candidates)).toEqual(['https://example.test/styles']);
  });

  it('keeps a .css path even when the network log never typed it', () => {
    const resource = { url: 'https://example.test/a.css', getContent: () => {
      return undefined;
    } };

    expect(urlsOf(stylesheetCandidates([resource], []))).toEqual(['https://example.test/a.css']);
  });

  it('rejects anything that is neither typed css nor a .css path', () => {
    const candidates = stylesheetCandidates([], [
      sheet('https://example.test/app.js', 'text/javascript'),
    ]);

    expect(candidates).toEqual([]);
  });

  it('rejects a data url because it is its own content', () => {
    const candidates = stylesheetCandidates([], [sheet('data:text/css,.a{}', 'text/css')]);

    expect(candidates).toEqual([]);
  });

  it('rejects a url the browser cannot parse', () => {
    const candidates = stylesheetCandidates([], [sheet('not a url', 'application/octet-stream')]);

    expect(candidates).toEqual([]);
  });

  it('lists a stylesheet once when both listings carry it', () => {
    const url = 'https://example.test/a.css';
    const resource = { url, getContent: () => {
      return undefined;
    } };

    expect(urlsOf(stylesheetCandidates([resource], [sheet(url, 'text/css')]))).toEqual([url]);
  });

  it('prefers the page resource over the network entry for the same url', async () => {
    const url = 'https://example.test/a.css';
    const resource = {
      url,
      getContent: (callback: (content: string, encoding: string) => void) => {
        callback('.from-resource {}', 'text');
      },
    };
    const candidate = first(stylesheetCandidates([resource], [sheet(url, 'text/css')]));

    await expect(readContent(candidate)).resolves.toBe('.from-resource {}');
  });
});
