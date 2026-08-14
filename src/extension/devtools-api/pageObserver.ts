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
  map?: string; // absent where the sheet named no map, empty where it named one that could not be read
}

interface ObservedBatch {
  route: string;
  fragments: readonly string[];
  dropped: number;
  stylesheets: readonly ObservedStylesheet[];
}

// Some DevTools omit stylesheet bodies, so fetch the page copy.
const COLLECT_STYLESHEETS = `let sheetIndex = 0;

  for (const sheet of document.styleSheets) {
    const href = sheet.href; // an inline <style> has none, and its text usually arrives as markup

    sheetIndex += 1;

    if (!href) {
      const owner = sheet.ownerNode;
      let inserted = 0;

      // CSS-in-JS can insert rules while leaving the element empty.
      try { inserted = sheet.cssRules.length; } catch { inserted = 0; }

      if (inserted > 0 && owner && owner.textContent.trim() === '') {
        state.sheets.set('inserted-stylesheet:' + sheetIndex, { text: '', map: undefined });
      }

      continue;
    }

    if (href.startsWith('data:') || state.attempted.has(href)) {
      continue;
    }

      // Cross-origin bodies this fetch cannot reach will not become reachable later.
    state.attempted.add(href);

      // fetch resolves 404s, whose bodies are not stylesheets.
    const readBody = (response) => {
      return response.ok ? response.text() : Promise.reject(new Error('not ok'));
    };

    fetch(href).then(readBody).then((text) => {
      const marker = 'sourceMappingURL=';
      const at = text.lastIndexOf(marker);
      const close = at === -1 ? -1 : text.indexOf('*/', at);
      const declared = at === -1
        ? ''
        : text.slice(at + marker.length, close === -1 ? text.length : close).trim();
      let mapUrl = '';
      let named = false;

      // Inline maps already travel with the stylesheet text.
      if (declared !== '' && declared.slice(0, 5) !== 'data:') {
        named = true;

        try { mapUrl = new URL(declared, href).href; } catch { mapUrl = ''; }
      }

      if (mapUrl === '') {
        state.sheets.set(href, { text: text, map: named ? '' : undefined });

        return undefined;
      }

      // A sheet waits for its map because each drain hands it over once.
      return fetch(mapUrl).then(readBody).then((map) => {
        state.sheets.set(href, { text: text, map: map });
      }).catch(() => {
        state.sheets.set(href, { text: text, map: '' });
      });
      // The panel counts an empty body as unreadable, so preserve the refusal.
    }).catch(() => { state.sheets.set(href, { text: '', map: undefined }); });
  }`;

// eval is request/response, so the page stashes and the panel drains.
export const OBSERVER_INSTALL_EXPRESSION = `(() => {
  const existing = window['${OBSERVER_KEY}'];

  // Leave an older stash intact so its observer can disconnect on the next record.
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
    // Closing DevTools runs no page teardown, so stalled draining is the signal.
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

  // An observer only reports new nodes, so include what has already rendered.
  state.pending.add(document.documentElement);
  window['${OBSERVER_KEY}'] = state;

  ${COLLECT_STYLESHEETS}

  return true;
})()`;

// A target change re-judges the whole page; observers only report new nodes.
export const OBSERVER_RESEED_EXPRESSION = `(() => {
  const state = window['${OBSERVER_KEY}'];

  if (!state) {
    return false;
  }

  state.pending.add(document.documentElement);

  // A new target needs stylesheets re-judged too, so only this clears them.
  state.attempted.clear();

  return true;
})()`;

export const OBSERVER_DRAIN_EXPRESSION = `(() => {
  const state = window['${OBSERVER_KEY}'];

  if (!state) {
    return { route: location.href, fragments: [], dropped: 0, stylesheets: [] };
  }

  ${COLLECT_STYLESHEETS}

  // Draining hands each fetched sheet over once.
  const stylesheets = [...state.sheets].map(([url, sheet]) => ({
    url,
    text: sheet.text,
    map: sheet.map,
  }));

  state.sheets.clear();

  // outerHTML omits shadow trees, so scan them separately.
  const shadowRootsIn = (node) => {
    const roots = [];

    // An added node can be the host itself, so inspect it before descendants.
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

      // Shadow roots cannot serialize inside their hosts, so send separate fragments.
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

  // eval drops undefined properties; in-process callers do not.
  if ('map' in value && value.map !== undefined && typeof value.map !== 'string') {
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
