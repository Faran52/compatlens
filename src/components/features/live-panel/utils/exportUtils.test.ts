import { blockedFindingFixture } from '@mocks';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { exportFileName, reportToMarkdown } from './exportUtils';

import type {
  BrowserTarget,
  Occurrence,
  SessionReport,
  Suggestion,
} from '@engine';

const TARGET: BrowserTarget = { chrome: '121', firefox: '128' };

const occurrence = (overrides: Partial<Occurrence> = {}): Occurrence => {
  return {
    ...blockedFindingFixture,
    route: '/products',
    firstSeen: '2026-08-04T00:00:00.000Z',
    ...overrides,
  };
};

const suggestion: Suggestion = {
  id: 'float-to-flex',
  ruleId: 'float-to-flex',
  syntax: 'float:',
  advice: 'Use flexbox instead.',
  name: 'flexbox',
  replacementSyntax: 'display: flex',
  mdnUrl: 'https://developer.mozilla.org/docs/Web/CSS/flex',
  location: { url: 'https://shop.example.test/assets/app.css', line: 40 },
};

const report = (overrides: Partial<SessionReport> = {}): SessionReport => {
  return {
    occurrences: [occurrence()],
    suggestions: [],
    route: '/products',
    routes: ['/products'],
    resources: { seen: ['/a.css', '/b.css'], parsed: ['/a.css', '/b.css'] },
    coverage: { matched: ['css-anchor-name'], registryFeatures: 34 },
    warnings: [],
    watching: true,
    capped: false,
    ...overrides,
  };
};

const markdownFor = (overrides: Partial<SessionReport> = {}): string => {
  return reportToMarkdown({
    report: report(overrides),
    host: 'shop.example.test',
    target: TARGET,
    exportedAt: '2026-08-04T10:30:00.000Z',
  });
};

describe('reportToMarkdown', () => {
  it('names the page, the target versions and the finding count', () => {
    const markdown = markdownFor();

    expect(markdown).toContain('- Page: shop.example.test');
    expect(markdown).toContain('- Target: Chrome 121, Firefox 128');
    expect(markdown).toContain('- Findings: 1');
  });

  it('leaves untargeted browsers out of the target line', () => {
    expect(markdownFor()).not.toContain('Safari');
  });

  it('gives each finding a source position, a syntax and the browsers it fails on', () => {
    const markdown = markdownFor();

    expect(markdown).toContain('## Breaks (1)');
    expect(markdown).toContain('https://shop.example.test/assets/app.css:12');
    expect(markdown).toContain('Firefox from 147');
  });

  it('says never for a browser that has no supported version', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        impacts: [{ slot: 'firefox', targetVersion: '128', supported: false }],
      })],
    });

    expect(markdown).toContain('Firefox never');
  });

  it('leaves out a browser the finding does not fail on', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        impacts: [
          { slot: 'chrome', targetVersion: '121', supportedFrom: '100', supported: true },
          { slot: 'firefox', targetVersion: '128', supportedFrom: '147', supported: false },
        ],
      })],
    });

    expect(markdown).toContain('Firefox from 147');
    expect(markdown).not.toContain('Chrome from 100');
  });

  it('drops the query string so the path matches a file on disk', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        location: { url: 'https://shop.example.test/app.css?v=9f2c', line: 12 },
      })],
    });

    expect(markdown).toContain('https://shop.example.test/app.css:12');
    expect(markdown).not.toContain('v=9f2c');
  });

  it('marks a finding read from the rendered page rather than a file', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        location: { url: 'https://shop.example.test/', view: 'rendered' },
      })],
    });

    expect(markdown).toContain('https://shop.example.test/ (rendered)');
  });

  it('escapes a pipe so it cannot break the table', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({ name: 'a | b' })],
    });

    expect(markdown).toContain('a \\| b');
  });

  it('escapes a pipe in a selector, which is where one is actually written', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        syntax: '[lang|="en"]',
        fallback: 'Use a | b instead.',
        mdnUrl: 'https://developer.mozilla.org/a|b',
        location: { url: 'https://shop.example.test/a|b.css', line: 3 },
      })],
    });

    expect(markdown).toContain('[lang\\|="en"]');
    expect(markdown).toContain('Use a \\| b instead.');
    expect(markdown).toContain('https://developer.mozilla.org/a\\|b');
    expect(markdown).toContain('a\\|b.css:3');
  });

  it('escapes a pipe in every modernisation cell too', () => {
    const markdown = markdownFor({
      suggestions: [{
        ...suggestion,
        syntax: ':-webkit-any(a|b)',
        replacementSyntax: ':is(a|b)',
        advice: 'Replace a | b.',
        mdnUrl: 'https://developer.mozilla.org/is|any',
      }],
    });

    expect(markdown).toContain(':-webkit-any(a\\|b)');
    expect(markdown).toContain(':is(a\\|b)');
    expect(markdown).toContain('Replace a \\| b.');
    expect(markdown).toContain('https://developer.mozilla.org/is\\|any');
  });

  it('separates degraded findings from breaking ones', () => {
    const markdown = markdownFor({
      occurrences: [occurrence(), occurrence({ id: 'other', risk: 'degrades' })],
    });

    expect(markdown).toContain('## Breaks (1)');
    expect(markdown).toContain('## Degrades (1)');
  });

  it('leaves out a severity nothing was found for', () => {
    expect(markdownFor()).not.toContain('## Degrades');
  });

  it('lists the modernisations when there are any', () => {
    const markdown = markdownFor({ suggestions: [suggestion] });

    expect(markdown).toContain('## Safe to modernise (1)');
    expect(markdown).toContain('display: flex');
  });

  it('leaves out the modernise section when there is nothing to modernise', () => {
    expect(markdownFor()).not.toContain('Safe to modernise');
  });

  it('says the report is incomplete when the page was not being watched', () => {
    expect(markdownFor({ watching: false })).toContain('not being watched');
  });

  it('says so when the finding limit was reached', () => {
    expect(markdownFor({ capped: true })).toContain('finding limit was reached');
  });

  it('carries every warning through', () => {
    expect(markdownFor({ warnings: ['One stylesheet could not be read'] }))
      .toContain('One stylesheet could not be read');
  });

  it('claims nothing about coverage it did not have', () => {
    expect(markdownFor()).toContain('- Resources read: 2 of 2');
  });

  it('points at source maps when the findings came from stylesheets', () => {
    expect(markdownFor()).toContain('enable source maps');
  });

  it('hands over the file a source map resolved rather than the stylesheet as served', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        location: {
          url: 'https://shop.example.test/assets/app.css',
          line: 1200,
          origin: { url: 'https://shop.example.test/src/_buttons.scss', line: 42, column: 3 },
        },
      })],
    });

    expect(markdown).toContain('https://shop.example.test/src/_buttons.scss:42');
    expect(markdown).not.toContain('app.css:1200');
  });

  it('drops the source map note once every stylesheet finding resolved', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({
        location: {
          url: 'https://shop.example.test/assets/app.css',
          line: 1200,
          origin: { url: 'https://shop.example.test/src/_buttons.scss', line: 42, column: 3 },
        },
      })],
    });

    expect(markdown).not.toContain('enable source maps');
  });

  it('stays quiet about source maps when nothing came from a stylesheet', () => {
    const markdown = markdownFor({
      occurrences: [occurrence({ sourceKind: 'html' })],
    });

    expect(markdown).not.toContain('enable source maps');
  });
});

describe('exportFileName', () => {
  it('names the file after the page and the day', () => {
    expect(exportFileName('shop.example.test', '2026-08-04T10:30:00.000Z'))
      .toBe('compatlens-shop.example.test-2026-08-04.md');
  });

  it('keeps a port out of the file name', () => {
    expect(exportFileName('127.0.0.1:4174', '2026-08-04T10:30:00.000Z'))
      .toBe('compatlens-127.0.0.1-4174-2026-08-04.md');
  });
});
