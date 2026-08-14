import type { HarEntry, InspectedResource } from './chromeTypes';

const hasCssPathname = (url: string): boolean => {
  try {
    return new URL(url).pathname.endsWith('.css');
  }
  catch {
    return false;
  }
};

const isStylesheet = (url: string, mimeType: string | undefined): boolean => {
  if (url.startsWith('data:')) { // its own content, so a finding would export page bytes
    return false;
  }

  if (mimeType === 'text/css') {
    return true;
  }

  return hasCssPathname(url);
};

export const toInspectedResource = (entry: HarEntry): InspectedResource => {
  return {
    url: entry.request.url,
    getContent: (callback) => {
      // Firefox logs the request but attaches no reader, so an empty body is the honest answer.
      if (entry.getContent === undefined) {
        callback('', 'text');

        return;
      }

      entry.getContent(callback);
    },
  };
};

const decodeBase64 = (content: string): string => {
  const bytes = Uint8Array.from(atob(content), (character) => {
    return character.charCodeAt(0);
  });

  return new TextDecoder().decode(bytes);
};

export const readContent = async (source: InspectedResource): Promise<string> => {
  return new Promise((resolve) => {
    source.getContent((content, encoding) => {
      resolve(encoding === 'base64' ? decodeBase64(content) : content);
    });
  });
};

export const stylesheetCandidates = (
  resources: readonly InspectedResource[],
  entries: readonly HarEntry[],
): InspectedResource[] => {
  const mimeTypes = new Map<string, string>();

  for (const entry of entries) { // the HAR types an extensionless text/css response
    mimeTypes.set(entry.request.url, entry.response.content.mimeType);
  }

  const candidates: InspectedResource[] = [];
  const seen = new Set<string>();

  for (const source of [...resources, ...entries.map(toInspectedResource)]) {
    if (seen.has(source.url)) {
      continue;
    }

    seen.add(source.url);

    if (isStylesheet(source.url, mimeTypes.get(source.url))) {
      candidates.push(source);
    }
  }

  return candidates;
};
