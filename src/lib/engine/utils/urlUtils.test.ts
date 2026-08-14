import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  fileNameOf,
  locationLabelFor,
  stripQuery,
} from './urlUtils';

describe('stripQuery', () => {
  it('drops the query and the fragment', () => {
    expect(stripQuery('https://shop.example.test/a.css?v=3#top'))
      .toBe('https://shop.example.test/a.css');
  });

  it('keeps a source map scheme whole, having no origin to rebuild the address from', () => {
    expect(stripQuery('webpack://app/./src/_buttons.scss?v=3'))
      .toBe('webpack://app/./src/_buttons.scss');
  });

  it('keeps a file url whole for the same reason', () => {
    expect(stripQuery('file:///Users/dev/app/src/_buttons.scss'))
      .toBe('file:///Users/dev/app/src/_buttons.scss');
  });

  it('keeps a url that carries neither', () => {
    expect(stripQuery('https://shop.example.test/a.css')).toBe('https://shop.example.test/a.css');
  });

  it('still removes the secret-bearing part of a url it cannot parse', () => {
    expect(stripQuery('not a url?session=secret#top')).toBe('not a url');
  });

  it('returns an unparseable url with nothing to strip unchanged', () => {
    expect(stripQuery('not a url')).toBe('not a url');
  });
});

describe('fileNameOf', () => {
  it('reduces a url to its file name', () => {
    expect(fileNameOf('https://shop.example.test/assets/app.css?v=3')).toBe('app.css');
  });

  it('labels a root document with its host', () => {
    expect(fileNameOf('https://shop.example.test/')).toBe('shop.example.test');
    expect(fileNameOf('https://shop.example.test')).toBe('shop.example.test');
  });

  it('labels an extensionless path with its last segment', () => {
    expect(fileNameOf('https://shop.example.test/products?session=secret')).toBe('products');
  });

  it('keeps an unparseable value readable', () => {
    expect(fileNameOf('inline-style')).toBe('inline-style');
  });

  it('never presents a bare scheme as if it were a file name', () => {
    expect(fileNameOf('https://')).toBe('https://');
  });

  it('handles a url with nothing in it', () => {
    expect(fileNameOf('')).toBe('');
  });
});

describe('locationLabelFor', () => {
  it('puts the line beside the file the finding came from', () => {
    expect(locationLabelFor({ url: 'https://shop.example.test/assets/app.css', line: 31 }))
      .toBe('app.css:31');
  });

  it('names the file alone when the finding came from the rendered dom', () => {
    expect(locationLabelFor({ url: 'https://shop.example.test/assets/app.css' }))
      .toBe('app.css');
  });

  it('names the file a source map resolved rather than the one that was served', () => {
    expect(locationLabelFor({
      url: 'https://shop.example.test/assets/app.css',
      line: 1200,
      origin: { url: 'https://shop.example.test/src/_buttons.scss', line: 42, column: 3 },
    })).toBe('_buttons.scss:42');
  });
});
