import { runInThisContext } from 'node:vm';

import type {
  ChromeDevToolsFacade,
  DevToolsInspectedWindow,
  HarEntry,
  InspectedWindowException,
} from '@extension';

export interface StylesheetFixture {
  url: string;
  mimeType: string;
  content: string;
  encoding?: string;
  contentApi?: boolean; // false models Firefox, which logs an entry it cannot read back
}

export interface ChromeFixtureInput {
  url?: string;
  html?: string; // the rendered dom
  stylesheets?: readonly StylesheetFixture[];
  exception?: InspectedWindowException;
  // Whatever the inspected page handed back, which a guard refuses or narrows; the tests feed malformed ones.
  evalResult?: boolean | object | string | null;
  resourceApi?: boolean; // false models Firefox, which implements no getResources
}

export interface ChromeFixture {
  api: ChromeDevToolsFacade;
  navigate: (url: string) => void;
  listenerCount: () => number;
}

// Chrome base64s the UTF-8 bytes, which btoa alone does not do outside latin1.
export const base64Body = (text: string): string => {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
};

export const harEntry = (fixture: StylesheetFixture): HarEntry => {
  const entry: HarEntry = {
    request: { url: fixture.url },
    response: { content: { mimeType: fixture.mimeType } },
  };

  if (fixture.contentApi !== false) {
    entry.getContent = (callback) => {
      callback(fixture.content, fixture.encoding ?? 'text');
    };
  }

  return entry;
};

export const chromeFixture = (input: ChromeFixtureInput = {}): ChromeFixture => {
  const listeners = new Set<(url: string) => void>();
  const url = input.url ?? 'https://example.test/';
  const html = input.html ?? '<html><body></body></html>';
  const entries = (input.stylesheets ?? []).map(harEntry);
  const sheetResources = (input.stylesheets ?? []).map(
    (fixture) => {
      return {
        url: fixture.url,
        getContent: (callback: (content: string, encoding: string) => void) => {
          callback(fixture.content, fixture.encoding ?? 'text');
        },
      };
    },
  );

  const inspectedWindow: DevToolsInspectedWindow = {
    eval: (_expression, callback) => {
      if (input.exception) {
        callback(undefined, input.exception);

        return;
      }

      callback('evalResult' in input ? input.evalResult : { url, html });
    },
  };

  if (input.resourceApi !== false) {
    inspectedWindow.getResources = (callback) => {
      callback(sheetResources);
    };
  }

  const api: ChromeDevToolsFacade = {
    network: {
      getHAR: (callback) => {
        callback({ entries });
      },
      onNavigated: {
        addListener: (callback) => {
          listeners.add(callback);
        },
        removeListener: (callback) => {
          listeners.delete(callback);
        },
      },
    },
    inspectedWindow,
  };

  return {
    api,
    navigate: (nextUrl) => {
      for (const listener of listeners) {
        listener(nextUrl);
      }
    },
    listenerCount: () => {
      return listeners.size;
    },
  };
};

/**
 * A facade that actually runs what the panel would send. The observer expressions are source text the inspected
 * page executes, so a fake that only records the string proves nothing: an earlier version matched on the source and
 * passed while the shadow walk skipped the added node itself.
 */
export const apiThatRunsTheExpression: ChromeDevToolsFacade = {
  inspectedWindow: {
    /**
     * `node:vm`, not `new Function`, because the expression is an expression: `inspectedWindow.eval` hands the page a
     * source text and answers its completion value, which is what `runInThisContext` does and what the old
     * `new Function(\`return ${expression}\`)()` was approximating around Function taking a body rather than an
     * expression. The globals it resolves against are this test's document and window.
     */
    eval: (expression, callback) => {
      callback(runInThisContext(expression));
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
