import {
  describe,
  expect,
  it,
} from 'vitest';

import { analyzeResources } from './engine';

import type {
  BrowserTarget,
  DetectorKind,
  FeatureRegistryEntry,
  ModernizationRule,
  ResourceInput,
  RiskLevel,
} from './types';

const entry = (
  id: string,
  kind: DetectorKind,
  syntax: string,
  defaultRisk: RiskLevel,
  support: FeatureRegistryEntry['support'],
): FeatureRegistryEntry => {
  return {
    id,
    name: id,
    kind,
    syntax,
    bcdPath: `bcd.${id}`,
    webFeatureId: id,
    defaultRisk,
    fallback: `Fallback guidance for ${id}.`,
    baseline: 'limited',
    mdnUrl: `https://developer.mozilla.org/${id}`,
    support,
    dataVersion: {
      bcd: '8.0.8',
      webFeatures: '3.34.2',
      generatedAt: '2026-07-30T00:00:00.000Z',
    },
  };
};

const unsupportedEverywhere = {
  chrome: '999',
  firefox: '999',
  safari: '999',
  safari_ios: '999',
};

const registry: readonly FeatureRegistryEntry[] = [
  entry('css-has', 'css-selector', ':has()', 'breaks', unsupportedEverywhere),
  entry('css-backdrop-filter', 'css-property', 'backdrop-filter', 'degrades', unsupportedEverywhere),
  entry('css-oklch', 'css-value', 'oklch()', 'breaks', unsupportedEverywhere),
  entry('css-timeline', 'css-property', 'scroll-timeline-name', 'breaks', {}),
  entry('html-dialog', 'html-element', 'dialog', 'breaks', unsupportedEverywhere),
  entry('html-body', 'html-element', 'body', 'breaks', unsupportedEverywhere),
  entry('css-subgrid', 'css-value', 'subgrid', 'breaks', {
    chrome: '1',
    firefox: '1',
    safari: '1',
    safari_ios: '1',
  }),
];

const modernRule: ModernizationRule = {
  id: 'legacy-webkit-backdrop-filter',
  kind: 'css-property',
  syntax: '-webkit-backdrop-filter',
  replacementId: 'css-subgrid',
  advice: 'Drop the prefix.',
};

const unusableRule: ModernizationRule = {
  id: 'legacy-webkit-any',
  kind: 'css-selector',
  syntax: ':-webkit-any()',
  replacementId: 'css-has',
  advice: 'Use :is() instead.',
};

const secondRule: ModernizationRule = {
  id: 'legacy-webkit-clip-path',
  kind: 'css-property',
  syntax: '-webkit-clip-path',
  replacementId: 'css-subgrid',
  advice: 'Drop the prefix.',
};

const target: BrowserTarget = {
  chrome: '120',
  firefox: '120',
  safari: '17',
  safari_ios: '17',
};

const steadyClock = (): (() => number) => {
  let calls = 0;

  return () => {
    calls += 1;

    return calls === 1 ? 1000 : 1042;
  };
};

const analyze = (
  resources: readonly ResourceInput[],
  warnings: readonly string[] = [],
  rules: readonly ModernizationRule[] = [],
) => {
  return analyzeResources({
    resources,
    registry,
    rules,
    target,
    warnings,
    now: steadyClock(),
  });
};

const cssResource = (url: string, content: string): ResourceInput => {
  return {
    kind: 'css',
    url,
    content,
  };
};

describe('analyzeResources', () => {
  it('sorts findings by risk, then source url, then line, then feature name', () => {
    const report = analyze([
      cssResource('https://example.test/b.css', '.a { backdrop-filter: blur(2px); }'),
      cssResource('https://example.test/a.css', '.a:has(img) { color: oklch(1 0 0); }'),
    ]);

    expect(report.findings.map((finding) => {
      return [finding.risk, finding.location.url, finding.featureId];
    })).toEqual([
      ['breaks', 'https://example.test/a.css', 'css-has'],
      ['breaks', 'https://example.test/a.css', 'css-oklch'],
      ['degrades', 'https://example.test/b.css', 'css-backdrop-filter'],
    ]);
  });

  it('orders what breaks ahead of what merely degrades', () => {
    const report = analyze([
      cssResource('https://example.test/a.css', '.a { scroll-timeline-name: --s; }'),
      cssResource('https://example.test/b.css', '.b { backdrop-filter: blur(2px); }'),
    ]);

    expect(report.findings.map((finding) => {
      return finding.risk;
    })).toEqual(['breaks', 'degrades']);
  });

  it('orders two equally risky findings by source url', () => {
    const report = analyze([
      cssResource('https://example.test/z.css', '.z:has(img) { color: red; }'),
      cssResource('https://example.test/a.css', '.a:has(img) { color: red; }'),
    ]);

    expect(report.findings.map((finding) => {
      return finding.location.url;
    })).toEqual(['https://example.test/a.css', 'https://example.test/z.css']);
  });

  it('orders two findings on the same url by line and then by name', () => {
    const report = analyze([
      cssResource('https://example.test/a.css', '.b:has(i) { color: oklch(1 0 0); }\n.a:has(i) { }'),
    ]);

    expect(report.findings.map((finding) => {
      return [finding.location.line, finding.featureId];
    })).toEqual([[1, 'css-has'], [1, 'css-oklch'], [2, 'css-has']]);
  });

  it('omits a finding when every target browser supports the feature', () => {
    const report = analyze([
      cssResource('https://example.test/a.css', '.g { grid-template-columns: subgrid; }'),
    ]);

    expect(report.findings).toEqual([]);
    expect(report.coverage.matched).toEqual(['css-subgrid']);
  });

  it('reports one finding for the same feature at the same location twice', () => {
    const report = analyze([
      cssResource('https://example.test/a.css', '.a { backdrop-filter: blur(1px); }'),
      cssResource('https://example.test/a.css', '.a { backdrop-filter: blur(1px); }'),
    ]);

    expect(report.findings).toHaveLength(1);
    expect(report.coverage.matched).toEqual(['css-backdrop-filter']);
  });

  it('keeps findings from other resources when one fails to parse', () => {
    const report = analyze([
      cssResource('https://example.test/broken.css', '.a { color: }}}'),
      cssResource('https://example.test/good.css', '.a:has(img) { color: red; }'),
    ]);

    expect(report.findings.map((finding) => {
      return finding.featureId;
    })).toEqual(['css-has']);
    expect(report.resources).toEqual({
      seen: ['https://example.test/broken.css', 'https://example.test/good.css'],
      parsed: ['https://example.test/good.css'],
    });
    expect(report.warnings[0]).toContain('Could not parse https://example.test/broken.css');
  });

  it('keeps the query string out of a warning, which the panel renders verbatim', () => {
    const report = analyzeResources({
      resources: [
        cssResource('https://shop.example.test/app.css?session=abc123#frag', '.a { color: }}}'),
      ],
      registry: [],
      rules: [],
      target: { chrome: '120' },
      warnings: [],
      now: () => {
        return 0;
      },
    });

    expect(report.warnings[0]).toContain('https://shop.example.test/app.css');
    expect(report.warnings[0]).not.toContain('session=abc123');
  });

  it('analyzes html resources with the html detector', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<dialog></dialog>',
      },
    ]);

    expect(report.findings.map((finding) => {
      return finding.featureId;
    })).toEqual(['html-body', 'html-dialog']);
  });

  it('sorts a finding the parser could not position ahead of positioned findings', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<p>hi</p>\n<dialog></dialog>',
      },
    ]);

    expect(report.findings.map((finding) => {
      return [finding.featureId, finding.location.line];
    })).toEqual([['html-body', undefined], ['html-dialog', 2]]);
  });

  it('finds css features inside an inline style block', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<head>\n  <style>\n.a:has(img) { backdrop-filter: blur(2px); }\n</style>\n</head>',
      },
    ]);

    expect(report.findings
      .filter((finding) => {
        return finding.sourceKind === 'css';
      })
      .map((finding) => {
        return [finding.featureId, finding.location.line];
      })).toEqual([['css-has', 3], ['css-backdrop-filter', 3]]);
  });

  it('keeps two inline blocks apart, which sharing a null path would have merged', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<div><style>.a:has(img) { color: red; }</style></div>'
          + '<div><style>.b:has(img) { color: blue; }</style></div>',
      },
    ]);

    const paths = report.findings
      .filter((finding) => {
        return finding.featureId === 'css-has';
      })
      .map((finding) => {
        return finding.location.path;
      });

    expect(paths).toHaveLength(2);
    expect(new Set(paths).size).toBe(2);
  });

  it('reports an inline style finding against its line in the host document', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<p>a</p>\n<p>b</p>\n<p>c</p>\n<style>\n\n.a:has(img) { color: red; }\n</style>',
      },
    ]);

    expect(report.findings.find((finding) => {
      return finding.featureId === 'css-has';
    })?.location.line).toBe(6);
  });

  it('keeps html findings when an inline style block cannot be parsed', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<dialog></dialog><style>.a { color: }}}</style>',
      },
    ]);

    expect(report.findings.map((finding) => {
      return finding.featureId;
    })).toEqual(['html-body', 'html-dialog']);
    expect(report.resources.parsed).toEqual(['https://example.test/']);
  });

  it('records which view of the document each finding came from', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<dialog></dialog>',
        view: 'source',
      },
    ]);

    expect(report.findings.map((finding) => {
      return finding.location.view;
    })).toEqual(['source', 'source']);
  });

  it('treats a resource with no stated view as the served source', () => {
    const report = analyze([
      cssResource('https://example.test/a.css', '.a:has(img) { color: red; }'),
    ]);

    expect(report.findings[0]?.location.view).toBe('source');
  });

  it('reports a feature found in both views once, keeping the source line', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<p>a</p>\n<p>b</p>\n<dialog></dialog>',
        view: 'source',
      },
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<dialog></dialog>',
        view: 'rendered',
      },
    ]);
    const dialogs = report.findings.filter((finding) => {
      return finding.featureId === 'html-dialog';
    });

    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]?.location).toMatchObject({ line: 3, view: 'source' });
  });

  it('keeps a feature only script built, which the served source never had', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<p>nothing here</p>',
        view: 'source',
      },
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<dialog></dialog>',
        view: 'rendered',
      },
    ]);
    const dialogs = report.findings.filter((finding) => {
      return finding.featureId === 'html-dialog';
    });

    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]?.location.view).toBe('rendered');
  });

  it('keeps a third use script added when the source already had two', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: '<div><dialog></dialog></div><div><dialog></dialog></div>',
        view: 'source',
      },
      {
        kind: 'html',
        url: 'https://example.test/',
        content:
          '<div><dialog></dialog></div><div><dialog></dialog></div><div><dialog></dialog></div>',
        view: 'rendered',
      },
    ]);
    const dialogs = report.findings.filter((finding) => {
      return finding.featureId === 'html-dialog';
    });

    expect(dialogs).toHaveLength(3);
    expect(dialogs.map((finding) => {
      return finding.location.view;
    })).toEqual(['source', 'source', 'rendered']);
  });

  it('reports every occurrence once when the rendered view added nothing', () => {
    const markup = '<div><dialog></dialog></div><div><dialog></dialog></div>';
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/',
        content: markup,
        view: 'source',
      },
      {
        kind: 'html',
        url: 'https://example.test/',
        content: markup,
        view: 'rendered',
      },
    ]);

    expect(report.findings.filter((finding) => {
      return finding.featureId === 'html-dialog';
    })).toHaveLength(2);
  });

  it('does not suppress a rendered finding using a different document as evidence', () => {
    const report = analyze([
      {
        kind: 'html',
        url: 'https://example.test/one',
        content: '<dialog></dialog>',
        view: 'source',
      },
      {
        kind: 'html',
        url: 'https://example.test/two',
        content: '<dialog></dialog>',
        view: 'rendered',
      },
    ]);

    expect(report.findings.filter((finding) => {
      return finding.featureId === 'html-dialog';
    })).toHaveLength(2);
  });

  it('keeps warnings raised by the caller alongside its own', () => {
    const report = analyze([cssResource('https://example.test/a.css', '.a { color: }}}')], [
      'Some loaded stylesheets may be missing.',
    ]);

    expect(report.warnings).toHaveLength(2);
    expect(report.warnings[0]).toBe('Some loaded stylesheets may be missing.');
  });

  it('measures duration with the injected clock and reports registry size', () => {
    const report = analyze([]);

    expect(report.durationMs).toBe(42);
    expect(report.coverage.registryFeatures).toBe(7);
    expect(report.resources).toEqual({ seen: [], parsed: [] });
  });
});

describe('analyzeResources modernization', () => {
  it('suggests a replacement the target already supports', () => {
    const report = analyze(
      [{ kind: 'css', url: 'https://x.test/a.css', content: '.a { -webkit-backdrop-filter: blur(2px); }' }],
      [],
      [modernRule],
    );

    expect(report.suggestions.map((suggestion) => {
      return suggestion.syntax;
    })).toEqual(['-webkit-backdrop-filter']);
  });

  it('stays silent when the replacement is not safe for the target yet', () => {
    const report = analyze(
      [{ kind: 'css', url: 'https://x.test/a.css', content: '.a:-webkit-any(.b) { color: red; }' }],
      [],
      [unusableRule],
    );

    expect(report.suggestions).toEqual([]);
  });

  it('reports no suggestions when no rules are supplied', () => {
    const report = analyze(
      [{ kind: 'css', url: 'https://x.test/a.css', content: '.a { -webkit-backdrop-filter: blur(2px); }' }],
    );

    expect(report.suggestions).toEqual([]);
  });

  it('keeps legacy syntax out of the risk findings and the coverage count', () => {
    const report = analyze(
      [{ kind: 'css', url: 'https://x.test/a.css', content: '.a { -webkit-backdrop-filter: blur(2px); }' }],
      [],
      [modernRule],
    );

    expect(report.findings).toEqual([]);
    expect(report.coverage.matched).toEqual([]);
  });

  it('reports each occurrence of the same legacy syntax separately', () => {
    const report = analyze(
      [{
        kind: 'css',
        url: 'https://x.test/a.css',
        content: '.a { -webkit-backdrop-filter: blur(2px); }\n.b { -webkit-backdrop-filter: blur(4px); }',
      }],
      [],
      [modernRule],
    );

    expect(report.suggestions.map((suggestion) => {
      return suggestion.location.line;
    })).toEqual([1, 2]);
  });

  it('orders suggestions by resource then line', () => {
    const report = analyze(
      [
        { kind: 'css', url: 'https://x.test/b.css', content: '.b { -webkit-backdrop-filter: blur(1px); }' },
        { kind: 'css', url: 'https://x.test/a.css', content: '\n.a { -webkit-backdrop-filter: blur(1px); }' },
      ],
      [],
      [modernRule],
    );

    expect(report.suggestions.map((suggestion) => {
      return [suggestion.location.url, suggestion.location.line];
    })).toEqual([
      ['https://x.test/a.css', 2],
      ['https://x.test/b.css', 1],
    ]);
  });
});

describe('analyzeResources suggestion ordering', () => {
  it('breaks a tie on the same line by legacy syntax', () => {
    const report = analyze(
      [{
        kind: 'css',
        url: 'https://x.test/a.css',
        content: '.a { -webkit-clip-path: circle(50%); -webkit-backdrop-filter: blur(2px); }',
      }],
      [],
      [modernRule, secondRule],
    );

    expect(report.suggestions.map((suggestion) => {
      return suggestion.syntax;
    })).toEqual(['-webkit-backdrop-filter', '-webkit-clip-path']);
  });
});
