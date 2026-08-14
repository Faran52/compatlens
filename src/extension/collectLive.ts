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

// The observer is already installed, so only the queue needs the whole document putting back.
export const restartObserving = async (api: ChromeDevToolsFacade): Promise<void> => {
  await reseedPageObserver(api);
};

// A map that will not parse is worth no more than one that would not fetch, so it is dropped here.
const usableSourceMap = (sourceMap: string | undefined, url: string): string | undefined => {
  if (sourceMap === undefined || sourceMap === '') {
    return undefined;
  }

  return isUsableSourceMap(sourceMap, url) ? sourceMap : undefined;
};

// A page-fetch that failed outright never saw the annotation, so the content is what knows.
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
  const maps = new Map<string, string>();

  for (const sheet of fetched) {
    bodies.set(sheet.url, sheet.text);

    if (sheet.map !== undefined) {
      maps.set(sheet.url, sheet.map);
    }
  }

  // Candidates are unique by url, so reading them at once cannot race and saves a round trip each.
  await Promise.all(stylesheetCandidates(inspected, har.entries).map(async (candidate) => {
    const fallback = bodies.get(candidate.url) ?? '';
    const content = await readContent(candidate);

    // DevTools can read a cross-origin body the page itself cannot, so its copy wins where it has one.
    bodies.set(candidate.url, content === '' ? fallback : content);
  }));

  const tally = tallyStylesheets(bodies, maps);
  const warnings: string[] = [];

  // Silence would look the same as a clean page, and a page can legitimately have no stylesheet.
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
