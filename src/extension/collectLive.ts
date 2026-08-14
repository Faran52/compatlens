import { isUsableSourceMap, namesExternalSourceMap } from '@engine';

import {
  OBSERVER_DROPPED_WARNING,
  UNREADABLE_SOURCE_MAP_WARNING,
  UNREADABLE_STYLESHEET_WARNING,
} from './constants';
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

interface StylesheetTally {
  sheets: ResourceInput[];
  unreadable: number;
  unreadableMaps: number;
}

export const startObserving = async (api: ChromeDevToolsFacade): Promise<void> => {
  await installPageObserver(api);
};

// The observer is installed, so only its queue needs the document restored.
export const restartObserving = async (api: ChromeDevToolsFacade): Promise<void> => {
  await reseedPageObserver(api);
};

// An unreadable map is no better than an unfetched one.
const usableSourceMap = (sourceMap: string | undefined, url: string): string | undefined => {
  if (sourceMap === undefined || sourceMap === '') {
    return undefined;
  }

  return isUsableSourceMap(sourceMap, url) ? sourceMap : undefined;
};

// Only the fetched content knows whether a failed request saw a map annotation.
const namedAMap = (content: string, sourceMap: string | undefined): boolean => {
  return sourceMap !== undefined || namesExternalSourceMap(content);
};

const tallyStylesheets = (
  bodies: ReadonlyMap<string, string>,
  maps: ReadonlyMap<string, string>,
): StylesheetTally => {
  const sheets: ResourceInput[] = [];
  let unreadable = 0;
  let unreadableMaps = 0;

  for (const [url, content] of bodies) {
    if (content === '') {
      unreadable += 1;
      continue;
    }

    const sheet: ResourceInput = { kind: 'css', url, content };
    const declared = maps.get(url);
    const sourceMap = usableSourceMap(declared, url);

    if (sourceMap === undefined && namedAMap(content, declared)) {
      unreadableMaps += 1;
    }

    sheets.push(sourceMap === undefined ? sheet : { ...sheet, sourceMap });
  }

  return { sheets, unreadable, unreadableMaps };
};

// Stylesheets are read once per capture because they are not observed like markup.
const readStylesheets = async (
  api: ChromeDevToolsFacade,
  fetched: readonly ObservedStylesheet[],
): Promise<StylesheetRead> => {
  const [inspected, har] = await Promise.all([
    readResources(api.inspectedWindow),
    readHar(api.network),
  ]);
  const bodies = new Map<string, string>();
  const maps = new Map<string, string>();

  for (const sheet of fetched) {
    bodies.set(sheet.url, sheet.text);

    if (sheet.map !== undefined) {
      maps.set(sheet.url, sheet.map);
    }
  }

  // Unique URLs can be read concurrently without racing.
  await Promise.all(stylesheetCandidates(inspected, har.entries).map(async (candidate) => {
    const fallback = bodies.get(candidate.url) ?? '';
    const content = await readContent(candidate);

    // DevTools can read cross-origin bodies the page cannot.
    bodies.set(candidate.url, content === '' ? fallback : content);
  }));

  const tally = tallyStylesheets(bodies, maps);
  const warnings: string[] = [];

  // Silence looks clean, while no stylesheets can be legitimate.
  if (tally.unreadable > 0) {
    warnings.push(UNREADABLE_STYLESHEET_WARNING);
  }

  if (tally.unreadableMaps > 0) {
    warnings.push(UNREADABLE_SOURCE_MAP_WARNING);
  }

  return { sheets: tally.sheets, warnings };
};

export const captureLive = async (api: ChromeDevToolsFacade): Promise<LiveCapture> => {
  const batch = await drainPageObserver(api);
  const markup = batch.fragments.map((content) => {
    return { kind: 'html', url: batch.route, content, view: 'rendered' } satisfies ResourceInput;
  });
  // Page-fetched sheets can arrive after markup, so idle drains still have work.
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
