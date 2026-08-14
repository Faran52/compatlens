import {
  describe,
  expect,
  it,
} from 'vitest';

import { extractInlineStyles } from './extractInlineStyles';

import type { ResourceInput } from '../types';

const html = (content: string): ResourceInput => {
  return {
    kind: 'html',
    url: 'https://example.test/',
    content,
  };
};

describe('extractInlineStyles', () => {
  it('finds nothing in a document with no style block', () => {
    expect(extractInlineStyles(html('<p>hi</p>'))).toEqual([]);
  });

  it('extracts a style block and the line its css begins on', () => {
    const resource = html('<head>\n  <style>\n.a { color: red; }\n  </style>\n</head>');

    expect(extractInlineStyles(resource)).toEqual([{
      content: '\n.a { color: red; }\n  ',
      startLine: 2,
      path: 'html:nth-of-type(1)>head:nth-of-type(1)>style:nth-of-type(1)',
    }]);
  });

  it('reports a single-line block against that same line', () => {
    const resource = html('<p>hi</p>\n<style>.a { color: red; }</style>');

    expect(extractInlineStyles(resource)[0]?.startLine).toBe(2);
  });

  it('extracts every block in document order', () => {
    const resource = html('<style>.a { color: red; }</style><style>.b { color: blue; }</style>');

    expect(extractInlineStyles(resource).map((style) => {
      return style.content;
    })).toEqual(['.a { color: red; }', '.b { color: blue; }']);
  });

  it('ignores a block with no rules in it', () => {
    expect(extractInlineStyles(html('<style>   </style>'))).toEqual([]);
  });

  it('extracts a style block from inside a shadow tree', () => {
    const resource = html(
      '<div><template shadowrootmode="open"><style>.a { color: red; }</style></template></div>',
    );

    expect(extractInlineStyles(resource).map((style) => {
      return style.content;
    })).toEqual(['.a { color: red; }']);
  });

  it('gives two blocks different paths, so their findings cannot merge', () => {
    const resource = html('<div><style>.a { color: red; }</style></div>'
      + '<div><style>.b { color: blue; }</style></div>');

    const paths = extractInlineStyles(resource).map((style) => {
      return style.path;
    });

    expect(new Set(paths).size).toBe(2);
  });

  it('marks a block inside a shadow tree so it cannot collide with light DOM', () => {
    const resource = html('<template shadowrootmode="open"><style>.a { color: red; }</style></template>');

    expect(extractInlineStyles(resource)[0]?.path).toContain('::shadow');
  });
});
