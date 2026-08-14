import postcss from 'postcss';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { createOriginResolver, inlineSourceMapOf } from './sourceMapUtils';

const SHEET = 'https://shop.example.test/assets/app.css';

const SOURCE = '.first {\n  color: red;\n}\n\n.second {\n  anchor-name: --pin;\n}\n';

const CROWDED = '.a { color: red; } .b { anchor-name: --pin; }';

const SECOND_RULE = CROWDED.indexOf('.b') + 1;

const realMap = (): string => {
  const root = postcss.parse(SOURCE, { from: 'app.scss' });

  return root.toResult({ map: { annotation: false, inline: false }, to: 'app.css' }).map.toString();
};

const dataUrl = (map: string): string => {
  return `/*# sourceMappingURL=data:application/json;base64,${btoa(map)} */`;
};

describe('inlineSourceMapOf', () => {
  it('decodes a base64 map written into the stylesheet', () => {
    const map = realMap();

    expect(inlineSourceMapOf(`${SOURCE}\n${dataUrl(map)}`)).toBe(map);
  });

  it('decodes a map written as percent encoded json', () => {
    const map = '{"version":3,"sources":["a.scss"],"names":[],"mappings":"AAAA"}';
    const css = `.a { color: red; }\n/*# sourceMappingURL=data:application/json,${encodeURIComponent(map)} */`;

    expect(inlineSourceMapOf(css)).toBe(map);
  });

  it('reads a map with a character outside ascii', () => {
    const map = '{"version":3,"sources":["café.scss"],"names":[],"mappings":"AAAA"}';
    const bytes = new TextEncoder().encode(map);
    const binary = String.fromCharCode(...bytes);

    expect(inlineSourceMapOf(`.a{}\n/*# sourceMappingURL=data:application/json;base64,${btoa(binary)} */`))
      .toBe(map);
  });

  it('takes the last annotation, since an earlier one may sit inside a string', () => {
    const first = btoa('{"version":3,"sources":["first.scss"],"names":[],"mappings":"AAAA"}');
    const second = '{"version":3,"sources":["second.scss"],"names":[],"mappings":"AAAA"}';
    const css = `/*# sourceMappingURL=data:application/json;base64,${first} */\n`
      + `/*# sourceMappingURL=data:application/json;base64,${btoa(second)} */`;

    expect(inlineSourceMapOf(css)).toBe(second);
  });

  it('leaves an external map to whatever fetches it', () => {
    expect(inlineSourceMapOf('.a{}\n/*# sourceMappingURL=app.css.map */')).toBeUndefined();
  });

  it('finds nothing in a stylesheet that declares no map', () => {
    expect(inlineSourceMapOf('.a { color: red; }')).toBeUndefined();
  });

  it('gives up on an annotation that will not decode', () => {
    expect(inlineSourceMapOf('.a{}\n/*# sourceMappingURL=data:application/json;base64,!!! */'))
      .toBeUndefined();
  });
});

describe('createOriginResolver', () => {
  it('resolves a served position back to the file it was written in', () => {
    const resolver = createOriginResolver(realMap(), SHEET);

    expect(resolver.at(5, 1)).toStrictEqual({
      url: 'https://shop.example.test/assets/app.scss',
      line: 5,
      column: 1,
    });
  });

  it('keeps the column postcss counts from, not the one the map counts from', () => {
    const resolver = createOriginResolver(realMap(), SHEET);

    expect(resolver.at(6, 3)?.column).toBe(3);
  });

  it('stops at the mapping the column falls inside, not the one that starts on it', () => {
    const root = postcss.parse(CROWDED, { from: 'app.scss' });
    const map = root.toResult({ map: { annotation: false, inline: false }, to: 'app.css' })
      .map.toString();
    const resolver = createOriginResolver(map, SHEET);

    expect(resolver.at(1, SECOND_RULE)?.column).toBe(SECOND_RULE);
    expect(resolver.at(1, SECOND_RULE - 1)?.column).toBeLessThan(SECOND_RULE);
  });

  it('resolves through a sectioned index map as well as a plain one', () => {
    const sectioned = JSON.stringify({
      version: 3,
      sections: [{
        offset: { line: 0, column: 0 },
        map: {
          version: 3,
          sources: ['app.scss'],
          names: [],
          mappings: 'AAAA',
        },
      }],
    });

    expect(createOriginResolver(sectioned, SHEET).at(1, 1)?.url)
      .toBe('https://shop.example.test/assets/app.scss');
  });

  it('resolves nothing for a position the map does not cover', () => {
    expect(createOriginResolver(realMap(), SHEET).at(400, 1)).toBeUndefined();
  });

  it('resolves nothing when the stylesheet declared no map', () => {
    expect(createOriginResolver(undefined, SHEET).at(1, 1)).toBeUndefined();
  });

  it('resolves nothing when the map will not parse', () => {
    expect(createOriginResolver('not json', SHEET).at(1, 1)).toBeUndefined();
  });
});
