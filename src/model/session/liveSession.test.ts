import { blockedFindingFixture, degradedFindingFixture } from '@mocks';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createLiveSession } from './liveSession';

import type {
  AnalysisReport,
  Finding,
  ResourceInput,
} from '@engine';
import type { LiveSessionDependencies } from './liveSession';

const errorShapedButNotAnError: Error = { name: 'PageFailure', message: 'nope' };

const fragment = (content: string): ResourceInput => {
  return { kind: 'html', url: 'https://shop.example.test/products', content, view: 'rendered' };
};

const reportWith = (findings: readonly Finding[]): AnalysisReport => {
  return {
    findings,
    suggestions: [],
    resources: { seen: ['/a.css'], parsed: ['/a.css'] },
    coverage: {
      matched: findings.map((finding) => {
        return finding.featureId;
      }),
      registryFeatures: 34,
    },
    warnings: [],
    durationMs: 1,
  };
};

const sheet = (content: string): ResourceInput => {
  return { kind: 'css', url: 'https://shop.example.test/app.css', content };
};

const sessionWith = (overrides: Partial<LiveSessionDependencies> = {}) => {
  const dependencies: LiveSessionDependencies = {
    observe: () => {
      return Promise.resolve();
    },
    reobserve: () => {
      return Promise.resolve();
    },
    capture: () => {
      return Promise.resolve({
        route: 'https://shop.example.test/products',
        resources: [fragment('<li>one</li>')],
        warnings: [],
      });
    },
    analyze: () => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    },
    registry: [],
    rules: [],
    target: () => {
      return { chrome: '120' };
    },
    timestamp: () => {
      return '2026-07-31T10:00:00.000Z';
    },
    ...overrides,
  };

  return { session: createLiveSession(dependencies), dependencies };
};

describe('createLiveSession stylesheet reuse', () => {
  const stylesheetOnly = (analyze: LiveSessionDependencies['analyze']) => {
    return sessionWith({
      analyze,
      capture: () => {
        return Promise.resolve({
          route: 'https://shop.example.test/products',
          resources: [sheet('.a { color: red; }')],
          warnings: [],
        });
      },
    });
  };

  it('parses a stylesheet once, however many drains hand it back unchanged', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    });
    const { session } = stylesheetOnly(analyze);

    await session.tick();
    await session.tick();
    await session.tick();

    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('parses it again as soon as the page rewrites it', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    });
    const bodies = ['.a { color: red; }', '.a { color: red; }', '.a { color: blue; }'];
    let drain = 0;
    const { session } = sessionWith({
      analyze,
      capture: () => {
        const content = bodies[drain] ?? '';

        drain += 1;

        return Promise.resolve({
          route: 'https://shop.example.test/products',
          resources: [sheet(content)],
          warnings: [],
        });
      },
    });

    await session.tick();
    await session.tick();
    await session.tick();

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('judges every stylesheet again when the target changes', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    });
    const { session } = stylesheetOnly(analyze);

    await session.tick();
    await session.reset();
    await session.tick();

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('retries a stylesheet whose analysis failed rather than retiring it', async () => {
    let calls = 0;
    const analyze = vi.fn(() => {
      calls += 1;

      return calls === 1
        ? Promise.reject(new Error('worker died'))
        : Promise.resolve(reportWith([blockedFindingFixture]));
    });
    const { session } = stylesheetOnly(analyze);

    await session.tick();

    expect((await session.tick()).occurrences).toHaveLength(1);
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('analyses an unchanged body again once the map it names has caught up', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    });
    const body = '.a { color: red; }';
    const maps: (string | undefined)[] = [undefined, '{"version":3,"sources":["a.scss"]}'];
    let drain = 0;
    const { session } = sessionWith({
      analyze,
      capture: () => {
        const sourceMap = maps[drain];

        drain += 1;

        return Promise.resolve({
          route: 'https://shop.example.test/products',
          resources: [sourceMap === undefined
            ? sheet(body)
            : { ...sheet(body), sourceMap }],
          warnings: [],
        });
      },
    });

    await session.tick();
    await session.tick();

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('keeps the findings a skipped drain would have re-reported', async () => {
    const { session } = stylesheetOnly(() => {
      return Promise.resolve(reportWith([blockedFindingFixture]));
    });

    await session.tick();

    expect((await session.tick()).occurrences).toHaveLength(1);
  });
});

describe('createLiveSession', () => {
  it('starts empty before anything has been observed', () => {
    const { session } = sessionWith();

    expect(session.report().occurrences).toEqual([]);
  });

  it('installs the observer when it starts', async () => {
    const observe = vi.fn(() => {
      return Promise.resolve();
    });
    const { session } = sessionWith({ observe });

    await session.start();

    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('records what a tick found, tagged with route and time', async () => {
    const { session } = sessionWith();
    const report = await session.tick();

    expect(report.occurrences).toHaveLength(1);
    expect(report.occurrences[0]?.route).toBe('https://shop.example.test/products');
    expect(report.occurrences[0]?.firstSeen).toBe('2026-07-31T10:00:00.000Z');
  });

  it('accumulates across ticks rather than replacing', async () => {
    const analyze = vi.fn()
      .mockResolvedValueOnce(reportWith([blockedFindingFixture]))
      .mockResolvedValueOnce(reportWith([degradedFindingFixture]));
    const { session } = sessionWith({ analyze });

    await session.tick();
    const report = await session.tick();

    expect(report.occurrences).toHaveLength(2);
  });

  it('does no analysis at all when the page has been still', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([]));
    });
    const { session } = sessionWith({
      analyze,
      capture: () => {
        return Promise.resolve({ route: 'https://x.test/', resources: [], warnings: [] });
      },
    });

    await session.tick();

    expect(analyze).not.toHaveBeenCalled();
  });

  it('still analyses when there is a warning but nothing to scan', async () => {
    const analyze = vi.fn(() => {
      return Promise.resolve(reportWith([]));
    });
    const { session } = sessionWith({
      analyze,
      capture: () => {
        return Promise.resolve({ route: 'https://x.test/', resources: [], warnings: ['dropped'] });
      },
    });

    await session.tick();

    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('asks for the target afresh each tick, so a change takes effect', async () => {
    const target = vi.fn(() => {
      return { chrome: '120' };
    });
    const { session } = sessionWith({ target });

    await session.tick();
    await session.tick();

    expect(target).toHaveBeenCalledTimes(2);
  });

  it('throws away everything when reset, since a new target invalidates every verdict', async () => {
    const { session } = sessionWith();

    await session.tick();
    await session.reset();

    expect(session.report().occurrences).toEqual([]);
  });
});

describe('createLiveSession failures', () => {
  it('records why the observer could not be installed', async () => {
    const { session } = sessionWith({
      observe: () => {
        return Promise.reject(new Error('blocked by CSP'));
      },
    });

    await session.start();

    expect(session.report().warnings).toEqual(['blocked by CSP']);
  });

  it('records why a capture failed rather than dying silently', async () => {
    const { session } = sessionWith({
      capture: () => {
        return Promise.reject(new Error('the page went away'));
      },
    });
    const report = await session.tick();

    expect(report.warnings).toEqual(['the page went away']);
  });

  it('records why analysis failed', async () => {
    const { session } = sessionWith({
      analyze: () => {
        return Promise.reject(new Error('worker died'));
      },
    });
    const report = await session.tick();

    expect(report.warnings).toEqual(['worker died']);
  });

  it('describes a failure that was not an Error at all', async () => {
    const { session } = sessionWith({
      capture: () => {
        return Promise.reject(errorShapedButNotAnError);
      },
    });
    const report = await session.tick();

    expect(report.warnings).toEqual(['The page could not be read.']);
  });

  it('says the same thing once however often it recurs', async () => {
    const { session } = sessionWith({
      capture: () => {
        return Promise.reject(new Error('the page went away'));
      },
    });

    await session.tick();
    const report = await session.tick();

    expect(report.warnings).toHaveLength(1);
  });
});

describe('createLiveSession watching', () => {
  it('reports watching once the observer is installed', async () => {
    const { session } = sessionWith();

    await session.start();

    expect(session.report().watching).toBe(true);
  });

  it('stays not watching when the observer could not be installed', async () => {
    const { session } = sessionWith({
      observe: () => {
        return Promise.reject(new Error('blocked'));
      },
    });

    await session.start();

    expect(session.report().watching).toBe(false);
  });
});

describe('createLiveSession reset', () => {
  it('keeps watching when the target changes, since the observer is still installed', async () => {
    const { session } = sessionWith();

    await session.start();
    await session.tick();
    await session.reset();

    expect(session.report().watching).toBe(true);
    expect(session.report().occurrences).toEqual([]);
  });

  it('hands the whole page back to the observer, which only ever reports what is new', async () => {
    const reobserve = vi.fn(() => {
      return Promise.resolve();
    });
    const { session } = sessionWith({ reobserve });

    await session.tick();
    await session.reset();

    expect(reobserve).toHaveBeenCalledTimes(1);
  });

  it('keeps the route it already knows, since the page did not change, only the target', async () => {
    const { session } = sessionWith();

    await session.tick();
    await session.reset();

    expect(session.report().routes).toEqual(['https://shop.example.test/products']);
  });

  it('reports a reseed that failed rather than waiting forever for findings', async () => {
    const { session } = sessionWith({
      reobserve: () => {
        return Promise.reject(new Error('the page went away'));
      },
    });

    await session.tick();
    await session.reset();

    expect(session.report().warnings).toEqual(['the page went away']);
  });
});
