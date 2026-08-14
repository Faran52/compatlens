import { chromeFixture } from '@mocks';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  OBSERVER_ABANDONED_MS,
  OBSERVER_BATCH_LIMIT,
  OBSERVER_KEY,
  OBSERVER_STATE_VERSION,
} from '../constants';

import {
  drainPageObserver,
  installPageObserver,
  OBSERVER_DRAIN_EXPRESSION,
  OBSERVER_INSTALL_EXPRESSION,
  OBSERVER_RESEED_EXPRESSION,
  reseedPageObserver,
} from './pageObserver';

import type { ChromeDevToolsFacade } from './chromeTypes';

interface ObserverState {
  pending: Set<Element>;
  dropped: number;
  sheets: Map<string, string>;
  attempted: Set<string>;
}

const batch = {
  route: 'https://example.test/products',
  fragments: ['<li>one</li>'],
  dropped: 0,
  stylesheets: [],
};

describe('OBSERVER_INSTALL_EXPRESSION', () => {
  it('refuses to install twice over the same document', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain(`const existing = window['${OBSERVER_KEY}']`);
    expect(OBSERVER_INSTALL_EXPRESSION)
      .toContain(`existing.version === ${String(OBSERVER_STATE_VERSION)}`);
  });

  it('stamps the stash so a later build can tell an older shape from its own', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain(`version: ${String(OBSERVER_STATE_VERSION)}`);
  });

  it('watches the whole tree, since an SPA can replace any part of it', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('childList: true, subtree: true');
  });

  it('seeds the queue with the document already on screen', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('state.pending.add(document.documentElement)');
  });

  it('gives up when the panel has stopped draining, since closing DevTools runs no teardown', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('observer.disconnect()');
    expect(OBSERVER_INSTALL_EXPRESSION).toContain(`delete window['${OBSERVER_KEY}']`);
    expect(OBSERVER_INSTALL_EXPRESSION).toContain(String(OBSERVER_ABANDONED_MS));
  });

  it('counts overflow rather than growing without bound', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain(String(OBSERVER_BATCH_LIMIT));
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('state.dropped += 1');
  });

  it('starts the stylesheet fetches at install, before the first drain asks for them', () => {
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('document.styleSheets');
    expect(OBSERVER_INSTALL_EXPRESSION).toContain('fetch(href)');
  });
});

describe('OBSERVER_RESEED_EXPRESSION', () => {
  it('puts the whole document back, since the observer only reports what is new', () => {
    expect(OBSERVER_RESEED_EXPRESSION).toContain('state.pending.add(document.documentElement)');
  });

  it('does nothing when no observer was ever installed', () => {
    expect(OBSERVER_RESEED_EXPRESSION).toContain('if (!state)');
  });

  it('forgets which stylesheets it read, since a new target re-judges all of them', () => {
    expect(OBSERVER_RESEED_EXPRESSION).toContain('state.attempted.clear()');
  });

  it('leaves the observer itself alone rather than installing a second one', () => {
    expect(OBSERVER_RESEED_EXPRESSION).not.toContain('new MutationObserver');
  });
});

describe('reseedPageObserver', () => {
  it('resolves once the page has taken the document back', async () => {
    const { api } = chromeFixture({ evalResult: true });

    await expect(reseedPageObserver(api)).resolves.toBeUndefined();
  });

  it('reports what the page said when the reseed throws', async () => {
    const { api } = chromeFixture({ exception: { isException: true, value: 'page gone' } });

    await expect(reseedPageObserver(api)).rejects.toThrow('page gone');
  });
});

describe('OBSERVER_DRAIN_EXPRESSION', () => {
  it('serialises only the subtrees that arrived, never the document', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('node.outerHTML');
    expect(OBSERVER_DRAIN_EXPRESSION).not.toContain('documentElement.outerHTML');
  });

  it('keeps the host element itself, which a bare getHTML would have dropped', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).not.toContain('node.getHTML');
  });

  it('skips nodes that were removed again before the drain', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('node.isConnected');
  });

  it('marks the drain, which is the only heartbeat the page gets from the panel', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('state.drainedAt = Date.now()');
  });

  it('empties the queue so the next drain starts clean', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('state.pending = new Set()');
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('state.dropped = 0');
  });

  it('walks the stylesheets again, since a page can link one long after install', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('document.styleSheets');
  });

  it('empties the stylesheet map so a sheet never crosses the boundary twice', () => {
    expect(OBSERVER_DRAIN_EXPRESSION).toContain('state.sheets.clear()');
  });
});

describe('installPageObserver', () => {
  it('resolves once the page accepts the observer', async () => {
    const { api } = chromeFixture({ evalResult: true });

    await expect(installPageObserver(api)).resolves.toBeUndefined();
  });

  it('reports what the page said when the injection throws', async () => {
    const { api } = chromeFixture({ exception: { isException: true, value: 'blocked by CSP' } });

    await expect(installPageObserver(api)).rejects.toThrow('blocked by CSP');
  });

  it('reports a usable message when the page gives no reason', async () => {
    const { api } = chromeFixture({ exception: { isException: true } });

    await expect(installPageObserver(api))
      .rejects.toThrow('The inspected page could not be observed.');
  });
});

describe('drainPageObserver', () => {
  it('returns the route and the fragments that arrived', async () => {
    const { api } = chromeFixture({ evalResult: batch });

    await expect(drainPageObserver(api)).resolves.toEqual(batch);
  });

  it('carries the dropped count so overflow is reported, not hidden', async () => {
    const { api } = chromeFixture({ evalResult: { ...batch, dropped: 12 } });
    const result = await drainPageObserver(api);

    expect(result.dropped).toBe(12);
  });

  it('carries the stylesheets the page fetched for itself', async () => {
    const stylesheets = [{ url: 'https://example.test/app.css', text: '.a { color: red; }' }];
    const { api } = chromeFixture({ evalResult: { ...batch, stylesheets } });
    const result = await drainPageObserver(api);

    expect(result.stylesheets).toEqual(stylesheets);
  });

  it.each([
    ['a string', 'nonsense'],
    ['null', null],
    ['a batch with no route', { fragments: [], dropped: 0, stylesheets: [] }],
    ['a batch with no fragments', { route: 'https://example.test/', dropped: 0, stylesheets: [] }],
    ['a batch with no dropped count', { route: 'https://example.test/', fragments: [], stylesheets: [] }],
    ['a batch with no stylesheets', { route: 'https://example.test/', fragments: [], dropped: 0 }],
    ['a route that is not a string', { route: 7, fragments: [], dropped: 0, stylesheets: [] }],
    ['fragments that are not a list', { route: 'https://x.test/', fragments: 'a', dropped: 0, stylesheets: [] }],
    ['a dropped count that is not a number', { route: 'https://x.test/', fragments: [], dropped: 'a', stylesheets: [] }],
    ['stylesheets that are not a list', { ...batch, stylesheets: 'a' }],
    ['a stylesheet that is not an object', { ...batch, stylesheets: ['a'] }],
    ['a stylesheet that is null', { ...batch, stylesheets: [null] }],
    ['a stylesheet with no url', { ...batch, stylesheets: [{ text: '.a {}' }] }],
    ['a stylesheet with no text', { ...batch, stylesheets: [{ url: 'https://x.test/a.css' }] }],
    ['a stylesheet url that is not a string', { ...batch, stylesheets: [{ url: 7, text: '.a {}' }] }],
    ['a stylesheet text that is not a string', { ...batch, stylesheets: [{ url: 'https://x.test/a.css', text: 7 }] }],
  ])('rejects %s', async (_label: string, evalResult: unknown) => {
    const { api } = chromeFixture({ evalResult });

    await expect(drainPageObserver(api))
      .rejects.toThrow('The inspected page did not return an observation batch.');
  });
});

const apiThatRunsTheExpression: ChromeDevToolsFacade = {
  inspectedWindow: {
    eval: (expression, callback) => {
      callback(new Function(`return ${expression}`)());
    },
    getResources: (callback) => {
      callback([]);
    },
  },
  network: {
    getHAR: (callback) => {
      callback({ entries: [] });
    },
    onNavigated: {
      addListener: () => {
        return undefined;
      },
      removeListener: () => {
        return undefined;
      },
    },
  },
};

const seed = (html: string): ObserverState => {
  document.body.innerHTML = html;

  const state: ObserverState = {
    pending: new Set(),
    dropped: 0,
    sheets: new Map(),
    attempted: new Set(),
  };

  for (const child of document.body.children) {
    state.pending.add(child);
  }

  Object.assign(window, { [OBSERVER_KEY]: state });

  return state;
};

describe('draining a real document', () => {
  it('serialises a shadow tree that outerHTML would have dropped', async () => {
    seed('<my-card></my-card>');

    const host = document.querySelector('my-card');

    host?.attachShadow({ mode: 'open' });

    if (host?.shadowRoot) {
      host.shadowRoot.innerHTML = '<div style="backdrop-filter: blur(2px)">inside</div>';
    }

    const drained = await drainPageObserver(apiThatRunsTheExpression);

    expect(host?.outerHTML).not.toContain('backdrop-filter');
    expect(drained.fragments.join('')).toContain('backdrop-filter');
  });

  it('serialises a shadow tree nested inside a descendant host, not just the added node', async () => {
    seed('<section><outer-card></outer-card></section>');

    const outer = document.querySelector('outer-card');

    outer?.attachShadow({ mode: 'open' });

    if (outer?.shadowRoot) {
      outer.shadowRoot.innerHTML = '<inner-card></inner-card>';

      const inner = outer.shadowRoot.querySelector('inner-card');

      inner?.attachShadow({ mode: 'open' });

      if (inner?.shadowRoot) {
        inner.shadowRoot.innerHTML = '<p style="text-wrap: balance">deep</p>';
      }
    }

    expect((await drainPageObserver(apiThatRunsTheExpression)).fragments.join('')).toContain('text-wrap');
  });

  it('falls back to plain markup when nothing has a shadow root', async () => {
    seed('<section><p style="content-visibility: auto">plain</p></section>');

    const drained = await drainPageObserver(apiThatRunsTheExpression);

    expect(drained.fragments.join('')).toContain('content-visibility');
  });

  it('leaves behind a queue the next drain starts clean from', async () => {
    const state = seed('<section>one</section>');

    await drainPageObserver(apiThatRunsTheExpression);

    expect(state.pending.size).toBe(0);
  });
});

const linkStylesheets = (hrefs: readonly (string | undefined)[]): void => {
  Object.defineProperty(document, 'styleSheets', {
    configurable: true,
    value: hrefs.map((href) => {
      return { href };
    }),
  });
};

const stubFetch = (body: string): string[] => {
  const requested: string[] = [];

  vi.stubGlobal('fetch', (url: string) => {
    requested.push(url);

    return Promise.resolve(new Response(body));
  });

  return requested;
};

const settle = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

describe('fetching stylesheets from the page', () => {
  it('hands a stylesheet the page fetched for itself over exactly once', async () => {
    seed('<section>one</section>');
    linkStylesheets(['https://example.test/app.css']);
    stubFetch('.a { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    const first = await drainPageObserver(apiThatRunsTheExpression);
    const second = await drainPageObserver(apiThatRunsTheExpression);

    expect(first.stylesheets).toEqual([
      { url: 'https://example.test/app.css', text: '.a { color: red; }' },
    ]);
    expect(second.stylesheets).toEqual([]);
  });

  it('fetches a stylesheet once, since a body it could not reach stays unreachable', async () => {
    seed('<section>one</section>');
    linkStylesheets(['https://example.test/app.css']);

    const requested = stubFetch('.a { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();
    await drainPageObserver(apiThatRunsTheExpression);

    expect(requested).toEqual(['https://example.test/app.css']);
  });

  it('picks up a stylesheet linked long after the observer was installed', async () => {
    seed('<section>one</section>');
    linkStylesheets([]);

    stubFetch('.late { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    linkStylesheets(['https://example.test/late.css']);
    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    expect((await drainPageObserver(apiThatRunsTheExpression)).stylesheets).toEqual([
      { url: 'https://example.test/late.css', text: '.late { color: red; }' },
    ]);
  });

  it('leaves an inline style element alone, since its text already arrives as markup', async () => {
    seed('<section>one</section>');
    linkStylesheets([undefined]);

    const requested = stubFetch('.a { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    expect(requested).toEqual([]);
  });

  it('leaves a data url stylesheet alone, since such a url is its own content', async () => {
    seed('<section>one</section>');
    linkStylesheets(['data:text/css,.a%20%7B%7D']);

    const requested = stubFetch('.a { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    expect(requested).toEqual([]);
  });

  it('reads every stylesheet again after a reseed, since a new target re-judges them all', async () => {
    seed('<section>one</section>');
    linkStylesheets(['https://example.test/app.css']);
    stubFetch('.a { color: red; }');

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();
    await drainPageObserver(apiThatRunsTheExpression);

    await reseedPageObserver(apiThatRunsTheExpression);
    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    expect((await drainPageObserver(apiThatRunsTheExpression)).stylesheets).toEqual([
      { url: 'https://example.test/app.css', text: '.a { color: red; }' },
    ]);
  });

  it('hands over an empty body for a stylesheet it was not allowed to fetch', async () => {
    seed('<section>one</section>');
    linkStylesheets(['https://cdn.example.test/vendor.css']);
    vi.stubGlobal('fetch', () => {
      return Promise.reject(new Error('blocked by CORS'));
    });

    await drainPageObserver(apiThatRunsTheExpression);
    await settle();

    expect((await drainPageObserver(apiThatRunsTheExpression)).stylesheets).toEqual([
      { url: 'https://cdn.example.test/vendor.css', text: '' },
    ]);
  });
});

describe('installing over a page an older build already instrumented', () => {
  it('replaces a stash the current drain could not have used', async () => {
    seed('<section>one</section>');
    Object.assign(window, {
      [OBSERVER_KEY]: { pending: new Set(), dropped: 0, drainedAt: Date.now() },
    });
    linkStylesheets(['https://example.test/app.css']);
    stubFetch('.a { color: red; }');

    await installPageObserver(apiThatRunsTheExpression);
    await settle();

    expect((await drainPageObserver(apiThatRunsTheExpression)).stylesheets).toEqual([
      { url: 'https://example.test/app.css', text: '.a { color: red; }' },
    ]);
  });

  it('leaves a stash of its own shape alone rather than restarting the queue', async () => {
    const state = seed('<section>one</section>');

    linkStylesheets([]);
    stubFetch('');
    Object.assign(state, { version: OBSERVER_STATE_VERSION });

    await installPageObserver(apiThatRunsTheExpression);

    expect((await drainPageObserver(apiThatRunsTheExpression)).fragments.join(''))
      .toContain('<section>one</section>');
  });
});
