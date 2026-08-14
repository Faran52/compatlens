import {
  describe,
  expect,
  it,
} from 'vitest';

import { extractInlineStyles } from './extractInlineStyles';
import { walkElements } from './walkElements';

import type { InlineStyle } from './extractInlineStyles';

const extract = (content: string): InlineStyle[] => {
  return extractInlineStyles(walkElements(content));
};

describe('extractInlineStyles', () => {
  it('finds nothing in a document with no style block', () => {
    expect(extract('<p>hi</p>')).toEqual([]);
  });

  it('extracts a style block and the line its css begins on', () => {
    expect(extract('<head>\n  <style>\n.a { color: red; }\n  </style>\n</head>')).toEqual([{
      content: '\n.a { color: red; }\n  ',
      startLine: 2,
      path: 'html:nth-of-type(1)>head:nth-of-type(1)>style:nth-of-type(1)',
    }]);
  });

  it('reports a single-line block against that same line', () => {
    expect(extract('<p>hi</p>\n<style>.a { color: red; }</style>')[0]?.startLine).toBe(2);
  });

  it('extracts every block in document order', () => {
    expect(extract('<style>.a { color: red; }</style><style>.b { color: blue; }</style>')
      .map((style) => {
        return style.content;
      })).toEqual(['.a { color: red; }', '.b { color: blue; }']);
  });

  it('ignores a block with no rules in it', () => {
    expect(extract('<style>   </style>')).toEqual([]);
  });

  it('extracts a style block from inside a shadow tree', () => {
    const content
      = '<div><template shadowrootmode="open"><style>.a { color: red; }</style></template></div>';

    expect(extract(content).map((style) => {
      return style.content;
    })).toEqual(['.a { color: red; }']);
  });

  it('gives two blocks different paths, so their findings cannot merge', () => {
    const paths = extract('<div><style>.a { color: red; }</style></div>'
      + '<div><style>.b { color: blue; }</style></div>').map((style) => {
      return style.path;
    });

    expect(new Set(paths).size).toBe(2);
  });
});
