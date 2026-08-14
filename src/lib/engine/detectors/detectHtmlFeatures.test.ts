import {
  describe,
  expect,
  it,
} from 'vitest';

import { detectHtmlFeatures } from './detectHtmlFeatures';

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
  entry('html-dialog', 'html-element', 'dialog'),
  entry('html-body', 'html-element', 'body'),
  entry('html-popover', 'html-attribute', '[popover]'),
  entry('html-popovertarget', 'html-attribute', 'button[popovertarget]'),
  entry('html-details-name', 'html-attribute', 'details[name]'),
  entry('html-declarative-shadow-dom', 'html-attribute', 'template[shadowrootmode]'),
  entry('html-broken-syntax', 'html-attribute', 'not a selector'),
  entry('css-has', 'css-selector', ':has('),
];

const html = (content: string): ResourceInput => {
  return {
    kind: 'html',
    url: 'https://example.test/',
    content,
  };
};

const featureIds = (content: string): string[] => {
  return detectHtmlFeatures(html(content), registry).map((detection) => {
    return detection.featureId;
  });
};

describe('detectHtmlFeatures', () => {
  it('detects elements and attributes without reading attribute values', () => {
    const content = '<button popovertarget="menu">Open</button><div id="menu" popover></div>';

    expect(featureIds(content)).toEqual(['html-body', 'html-popovertarget', 'html-popover']);
  });

  it('reports the source url, line and column of an attribute', () => {
    const detections = detectHtmlFeatures(html('<p>hi</p>\n<div popover></div>'), registry);

    expect(detections).toContainEqual({
      featureId: 'html-popover',
      location: {
        url: 'https://example.test/',
        line: 2,
        column: 6,
        path: 'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)',
      },
    });
  });

  it('detects an element by tag name', () => {
    expect(featureIds('<dialog open>hello</dialog>')).toEqual(['html-body', 'html-dialog']);
  });

  it('scopes an attribute detector to its element', () => {
    expect(featureIds('<details name="group"></details>')).toEqual([
      'html-body',
      'html-details-name',
    ]);
  });

  it('ignores a scoped attribute on a different element', () => {
    expect(featureIds('<input name="email">')).toEqual(['html-body']);
  });

  it('walks into declarative shadow root content', () => {
    const content = '<div><template shadowrootmode="open"><dialog></dialog></template></div>';

    expect(featureIds(content)).toEqual([
      'html-body',
      'html-declarative-shadow-dom',
      'html-dialog',
    ]);
  });

  it('omits line and column for an element the parser had to imply', () => {
    const detections = detectHtmlFeatures(html('<p>hi</p>'), registry);

    expect(detections).toEqual([
      {
        featureId: 'html-body',
        location: {
          url: 'https://example.test/',
          path: 'html:nth-of-type(1)>body:nth-of-type(1)',
        },
      },
    ]);
  });

  it('ignores text and comment nodes', () => {
    expect(featureIds('text<!-- popover -->more')).toEqual(['html-body']);
  });

  it('addresses each occurrence by its position in the tree', () => {
    const detections = detectHtmlFeatures(
      html('<div><dialog></dialog></div><div><dialog></dialog></div>'),
      registry,
    );

    expect(detections
      .filter((detection) => {
        return detection.featureId === 'html-dialog';
      })
      .map((detection) => {
        return detection.location.path;
      })).toEqual([
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(1)>dialog:nth-of-type(1)',
      'html:nth-of-type(1)>body:nth-of-type(1)>div:nth-of-type(2)>dialog:nth-of-type(1)',
    ]);
  });

  it('marks the shadow boundary so shadow and light content cannot collide', () => {
    const detections = detectHtmlFeatures(
      html('<div><template shadowrootmode="open"><dialog></dialog></template></div>'),
      registry,
    );

    expect(detections.find((detection) => {
      return detection.featureId === 'html-dialog';
    })?.location.path).toContain('::shadow>dialog:nth-of-type(1)');
  });

  it('ignores detectors whose syntax is not an attribute selector', () => {
    expect(featureIds('<span not></span>')).toEqual(['html-body']);
  });
});
