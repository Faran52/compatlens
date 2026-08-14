import postcss from 'postcss';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { detectCssFeatures } from './detectCssFeatures';

import type {
  DetectorKind,
  FeatureRegistryEntry,
  ResourceInput,
} from '../types';

const entry = (id: string, kind: DetectorKind, syntax: string): FeatureRegistryEntry => {
  return {
    id,
    name: id,
    kind,
    syntax,
    bcdPath: `bcd.${id}`,
    webFeatureId: id,
    defaultRisk: 'breaks',
    fallback: `Fallback guidance for ${id}.`,
    baseline: 'limited',
    mdnUrl: `https://developer.mozilla.org/${id}`,
    support: {},
    dataVersion: {
      bcd: '8.0.8',
      webFeatures: '3.34.2',
      generatedAt: '2026-07-30T00:00:00.000Z',
    },
  };
};

const registry: readonly FeatureRegistryEntry[] = [
  entry('css-scope', 'css-at-rule', 'scope'),
  entry('css-has', 'css-selector', ':has()'),
  entry('css-nesting', 'css-selector', '&'),
  entry('css-anchor-name', 'css-property', 'anchor-name'),
  entry('css-oklch', 'css-value', 'oklch()'),
  entry('css-subgrid', 'css-value', 'subgrid'),
  entry('html-dialog', 'html-element', 'dialog'),
];

const css = (content: string): ResourceInput => {
  return {
    kind: 'css',
    url: 'https://example.test/app.css',
    content,
  };
};

const featureIds = (resource: ResourceInput): string[] => {
  return detectCssFeatures(resource, registry).map((detection) => {
    return detection.featureId;
  });
};

describe('detectCssFeatures', () => {
  it('detects CSS at-rules, selectors, properties and values in document order', () => {
    const resource = css('@scope (.card) { .card:has(img) { color: oklch(60% .2 20); } }');

    expect(featureIds(resource)).toEqual(['css-scope', 'css-has', 'css-oklch']);
  });

  it('does not treat a rule inside an at-rule as nesting', () => {
    expect(featureIds(css('@media screen { .card:has(img) { color: red; } }'))).toEqual(['css-has']);
  });

  it('reports the source url, line and column of each detection', () => {
    const resource = css('.card {\n  anchor-name: --card;\n}');

    expect(detectCssFeatures(resource, registry)).toEqual([
      {
        featureId: 'css-anchor-name',
        location: {
          url: 'https://example.test/app.css',
          line: 2,
          column: 3,
        },
      },
    ]);
  });

  it('detects a bare keyword value', () => {
    expect(featureIds(css('.grid { grid-template-columns: subgrid; }'))).toEqual(['css-subgrid']);
  });

  it('detects nesting written with an explicit nesting selector', () => {
    expect(featureIds(css('.card { &:hover { color: red; } }'))).toEqual(['css-nesting']);
  });

  it('detects nesting written without a nesting selector', () => {
    expect(featureIds(css('.card { .title { color: red; } }'))).toEqual(['css-nesting']);
  });

  it('reports a selector feature once per rule however many times it appears', () => {
    expect(featureIds(css('.a:has(img), .b:has(svg) { color: red; }'))).toEqual(['css-has']);
  });

  it('reports a value feature once per declaration however many times it appears', () => {
    const resource = css('.a { background: linear-gradient(oklch(1 0 0), oklch(0 0 0)); }');

    expect(featureIds(resource)).toEqual(['css-oklch']);
  });

  it('ignores at-rules, selectors, properties and values with no detector', () => {
    expect(featureIds(css('@media screen { .a:hover { color: red; } }'))).toEqual([]);
  });

  it('ignores comments and strings inside declaration values', () => {
    expect(featureIds(css('.a { content: "subgrid"; /* oklch( */ }'))).toEqual([]);
  });

  it('throws on malformed CSS so the caller can report the resource as failed', () => {
    expect(() => {
      return detectCssFeatures(css('.a { color: }}}'), registry);
    }).toThrow();
  });

  it('points a finding at the file the stylesheet was compiled from', () => {
    const source = '.a {\n  anchor-name: --pin;\n}\n';
    const map = postcss.parse(source, { from: 'app.scss' })
      .toResult({ map: { annotation: false, inline: false }, to: 'app.css' })
      .map.toString();
    const resource: ResourceInput = { ...css(source), sourceMap: map };

    expect(detectCssFeatures(resource, registry)[0]?.location.origin).toStrictEqual({
      url: 'https://example.test/app.scss',
      line: 2,
      column: 3,
    });
  });

  it('reads a map the stylesheet carries in its own text, as an injected style block does', () => {
    const source = '.a {\n  anchor-name: --pin;\n}\n';
    const map = postcss.parse(source, { from: 'app.scss' })
      .toResult({ map: { annotation: false, inline: false }, to: 'app.css' })
      .map.toString();
    const annotated = `${source}/*# sourceMappingURL=data:application/json;base64,${btoa(map)} */`;

    expect(detectCssFeatures(css(annotated), registry)[0]?.location.origin).toStrictEqual({
      url: 'https://example.test/app.scss',
      line: 2,
      column: 3,
    });
  });

  it('leaves the served position alone when the stylesheet declares no map', () => {
    const found = detectCssFeatures(css('.a { anchor-name: --pin; }'), registry);

    expect(found[0]?.location.origin).toBeUndefined();
  });
});
