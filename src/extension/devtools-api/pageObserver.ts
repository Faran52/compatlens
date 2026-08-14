import {
  OBSERVER_ABANDONED_MS,
  OBSERVER_BATCH_LIMIT,
  OBSERVER_KEY,
  OBSERVER_STATE_VERSION,
} from '../constants';

import type { ChromeDevToolsFacade } from './chromeTypes';

export interface ObservedStylesheet {
  url: string;
  text: string;
}

export interface ObservedBatch {
  route: string;
  fragments: readonly string[];
  dropped: number;
  stylesheets: readonly ObservedStylesheet[];
}

// Some browsers hand DevTools no stylesheet body at all, so the page fetches its own from cache.
const COLLECT_STYLESHEETS = `for (const sheet of document.styleSheets) {
    const href = sheet.href; // an inline <style> has none, and its text already arrives as markup

    if (!href || href.startsWith('data:') || state.attempted.has(href)) {
      continue;
    }

    // A body this fetch cannot reach, such as a cross-origin sheet, never becomes reachable later.
    state.attempted.add(href);

    fetch(href).then((response) => response.text()).then((text) => {
      state.sheets.set(href, text);
      // An empty body is what the panel counts as unreadable, so a refusal must not stay silent.
    }).catch(() => { state.sheets.set(href, ''); });
  }`;

// Installed once per document. eval is request/response, so the page stashes and the panel drains.
export const OBSERVER_INSTALL_EXPRESSION = `(() => {
  const existing = window['${OBSERVER_KEY}'];

  // A stash an older build left has the wrong shape; replacing it strands that observer, which
  // then disconnects itself on its next record because nothing is draining it any more.
  if (existing && existing.version === ${String(OBSERVER_STATE_VERSION)}) {
    return true;
  }

  const state = {
    version: ${String(OBSERVER_STATE_VERSION)},
    pending: new Set(),
    dropped: 0,
    drainedAt: Date.now(),
    sheets: new Map(),
    attempted: new Set(),
  };

  const observer = new MutationObserver((records) => {
    // Closing DevTools runs no teardown in the page, so a panel that stopped draining is the signal.
    if (Date.now() - state.drainedAt > ${String(OBSERVER_ABANDONED_MS)}) {
      observer.disconnect();
      delete window['${OBSERVER_KEY}'];

      return;
    }

    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) {
          continue;
        }

        if (state.pending.size >= ${String(OBSERVER_BATCH_LIMIT)}) {
          state.dropped += 1;
          continue;
        }

        state.pending.add(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Whatever already rendered is the first batch: an observer alone only ever reports what is new.
  state.pending.add(document.documentElement);
  window['${OBSERVER_KEY}'] = state;

  ${COLLECT_STYLESHEETS}

  return true;
})()`;

// Changing the target re-judges the whole page, and an observer only ever reports what is new.
export const OBSERVER_RESEED_EXPRESSION = `(() => {
  const state = window['${OBSERVER_KEY}'];

  if (!state) {
    return false;
  }

  state.pending.add(document.documentElement);

  // Re-judging the page means the stylesheets have to come back too, and only this forgets them.
  state.attempted.clear();

  return true;
})()`;

export const OBSERVER_DRAIN_EXPRESSION = `(() => {
  const state = window['${OBSERVER_KEY}'];

  if (!state) {
    return { route: location.href, fragments: [], dropped: 0, stylesheets: [] };
  }

  ${COLLECT_STYLESHEETS}

  // Draining the map hands each fetched sheet over once, however many drains it survives.
  const stylesheets = [...state.sheets].map(([url, text]) => ({ url, text }));

  state.sheets.clear();

  // outerHTML omits shadow trees, so a component built with attachShadow would scan as empty.
  const shadowRootsIn = (node) => {
    const roots = [];

    // The added node is often the host itself, so it has to be asked before its descendants are.
    if (node.shadowRoot) {
      roots.push(node.shadowRoot);
      roots.push(...shadowRootsIn(node.shadowRoot));
    }

    for (const element of node.querySelectorAll('*')) {
      if (element.shadowRoot) {
        roots.push(element.shadowRoot);
        roots.push(...shadowRootsIn(element.shadowRoot));
      }
    }

    return roots;
  };

  const fragments = [];

  for (const node of state.pending) {
    if (node.isConnected) {
      fragments.push(node.outerHTML);

      // A shadow root cannot be serialised inside its host, so it arrives as a fragment of its own.
      for (const root of shadowRootsIn(node)) {
        fragments.push(root.innerHTML);
      }
    }
  }

  const dropped = state.dropped;

  state.pending = new Set();
  state.dropped = 0;
  state.drainedAt = Date.now();

  return { route: location.href, fragments, dropped, stylesheets };
})()`;

const isObservedStylesheet = (value: unknown): value is ObservedStylesheet => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('url' in value) || !('text' in value)) {
    return false;
  }

  return typeof value.url === 'string' && typeof value.text === 'string';
};

const isObservedBatch = (value: unknown): value is ObservedBatch => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('route' in value) || !('fragments' in value) || !('dropped' in value)) {
    return false;
  }

  if (!('stylesheets' in value) || !Array.isArray(value.stylesheets)) {
    return false;
  }

  return typeof value.route === 'string'
    && Array.isArray(value.fragments)
    && typeof value.dropped === 'number'
    && value.stylesheets.every(isObservedStylesheet);
};

const evaluate = async (api: ChromeDevToolsFacade, expression: string): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    api.inspectedWindow.eval(expression, (result, exception) => {
      if (exception?.isException === true) {
        reject(new Error(exception.value ?? 'The inspected page could not be observed.'));

        return;
      }

      resolve(result);
    });
  });
};

export const installPageObserver = async (api: ChromeDevToolsFacade): Promise<void> => {
  await evaluate(api, OBSERVER_INSTALL_EXPRESSION);
};

export const reseedPageObserver = async (api: ChromeDevToolsFacade): Promise<void> => {
  await evaluate(api, OBSERVER_RESEED_EXPRESSION);
};

export const drainPageObserver = async (api: ChromeDevToolsFacade): Promise<ObservedBatch> => {
  const result = await evaluate(api, OBSERVER_DRAIN_EXPRESSION);

  if (!isObservedBatch(result)) {
    throw new Error('The inspected page did not return an observation batch.');
  }

  return result;
};
