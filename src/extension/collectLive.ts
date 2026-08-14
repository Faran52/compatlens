import { OBSERVER_DROPPED_WARNING, UNREADABLE_STYLESHEET_WARNING } from './constants';
import {
  drainPageObserver,
  installPageObserver,
  readContent,
  readHar,
  readResources,
  reseedPageObserver,
  stylesheetCandidates,
} from './devtools-api';

import type { ResourceInput } from '@engine';
import type { ChromeDevToolsFacade, ObservedStylesheet } from './devtools-api';

interface LiveCapture {
  route: string;
  resources: readonly ResourceInput[];
  warnings: readonly string[];
}

interface StylesheetRead {
  sheets: ResourceInput[];
  warnings: string[];
}

export const startObserving = async (api: ChromeDevToolsFacade): Promise<void> => {
  await installPageObserver(api);
};

// The observer is already installed, so only the queue needs the whole document putting back.
export const restartObserving = async (api: ChromeDevToolsFacade): Promise<void> => {
  await reseedPageObserver(api);
};

// Stylesheets do not mutate the way markup does, so they are read once per capture, not observed.
const readStylesheets = async (
  api: ChromeDevToolsFacade,
  fetched: readonly ObservedStylesheet[],
): Promise<StylesheetRead> => {
  const [inspected, har] = await Promise.all([
    readResources(api.inspectedWindow),
    readHar(api.network),
  ]);
  const bodies = new Map<string, string>();

  for (const sheet of fetched) {
    bodies.set(sheet.url, sheet.text);
  }

  for (const candidate of stylesheetCandidates(inspected, har.entries)) {
    const fallback = bodies.get(candidate.url) ?? '';
    const content = await readContent(candidate);

    // DevTools can read a cross-origin body the page itself cannot, so its copy wins where it has one.
    bodies.set(candidate.url, content === '' ? fallback : content);
  }

  const sheets: ResourceInput[] = [];
  let unreadable = 0;

  for (const [url, content] of bodies) {
    if (content === '') {
      unreadable += 1;
      continue;
    }

    sheets.push({ kind: 'css', url, content });
  }

  // Silence would look the same as a clean page, and a page can legitimately have no stylesheet.
  return { sheets, warnings: unreadable === 0 ? [] : [UNREADABLE_STYLESHEET_WARNING] };
};

export const captureLive = async (api: ChromeDevToolsFacade): Promise<LiveCapture> => {
  const batch = await drainPageObserver(api);
  const markup = batch.fragments.map((content) => {
    return { kind: 'html', url: batch.route, content, view: 'rendered' } satisfies ResourceInput;
  });
  // A page-fetched sheet lands drains after the markup did, so an idle drain still has work to do.
  const idle = markup.length === 0 && batch.stylesheets.length === 0;
  const css = idle ? { sheets: [], warnings: [] } : await readStylesheets(api, batch.stylesheets);
  const dropped = batch.dropped === 0
    ? []
    : [`${OBSERVER_DROPPED_WARNING} ${String(batch.dropped)} changes were not read.`];

  return {
    route: batch.route,
    resources: [...markup, ...css.sheets],
    warnings: [...dropped, ...css.warnings],
  };
};
