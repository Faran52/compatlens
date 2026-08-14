import {
  describe,
  expect,
  it,
} from 'vitest';

import { walkElements } from './walkElements';

const paths = (html: string): string[] => {
  return walkElements(html).map((found) => {
    return found.path;
  });
};

describe('walkElements', () => {
  it('yields every element of the document parse5 implies', () => {
    expect(paths('<p>hi</p>')).toEqual([
      'html:nth-of-type(1)',
      'html:nth-of-type(1)>head:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>p:nth-of-type(1)',
    ]);
  });

  it('numbers siblings of the same tag apart', () => {
    expect(paths('<div></div><div></div>')).toEqual(expect.arrayContaining([
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(2)',
    ]));
  });

  it('counts by tag, so an element between two siblings does not shift them', () => {
    expect(paths('<div></div><span></span><div></div>')).toEqual(expect.arrayContaining([
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>span:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(2)',
    ]));
  });

  it('marks the shadow boundary so shadow and light content cannot collide', () => {
    const found = paths('<div><template shadowrootmode="open"><b></b></template><b></b></div>');

    expect(found.filter((path) => {
      return path.endsWith('b:nth-of-type(1)');
    })).toEqual([
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)'
      + '>template:nth-of-type(1)::shadow>b:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)>b:nth-of-type(1)',
    ]);
  });

  it('skips text and comment nodes', () => {
    expect(paths('text<!-- comment -->more')).toEqual([
      'html:nth-of-type(1)',
      'html:nth-of-type(1)>head:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)',
    ]);
  });

  it('hands each element back with the node it walked', () => {
    expect(walkElements('<dialog></dialog>').map((found) => {
      return found.element.tagName;
    })).toEqual(['html', 'head', 'body', 'dialog']);
  });
});
