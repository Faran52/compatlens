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
  evalResult?: unknown;
  resourceApi?: boolean; // false models Firefox, which implements no getResources
}

export interface ChromeFixture {
  api: ChromeDevToolsFacade;
  navigate: (url: string) => void;
  listenerCount: () => number;
  beginLoad: () => void;
  completeLoad: () => void;
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
  let loaded = true;
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
    eval: (expression, callback) => {
      if (expression === 'document.readyState') {
        callback(loaded ? 'complete' : 'loading');

        return;
      }

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
    beginLoad: () => {
      loaded = false;
    },
    completeLoad: () => {
      loaded = true;
    },
  };
};
