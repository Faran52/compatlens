import { AnyMap, originalPositionFor } from '@jridgewell/trace-mapping';

import type { TraceMap } from '@jridgewell/trace-mapping';
import type { OriginPosition } from '../types';

export interface OriginResolver {
  at: (line: number, column: number) => OriginPosition | undefined;
}

const NO_ORIGIN: OriginResolver = {
  at: () => {
    return undefined;
  },
};

const ANNOTATION = /\/\*#\s*sourceMappingURL=(\S+?)\s*\*\//gu;

// atob yields one char per byte, and a source path outside ASCII needs those bytes read as UTF-8.
const decodeBase64 = (value: string): string => {
  const binary = atob(value);

  return new TextDecoder().decode(Uint8Array.from(binary, (char) => {
    return char.charCodeAt(0);
  }));
};

const annotationOf = (css: string): string | undefined => {
  return [...css.matchAll(ANNOTATION)].pop()?.[1];
};

// A sheet naming a map file the page never fetched keeps its served position, and should say so.
export const namesExternalSourceMap = (css: string): boolean => {
  const annotation = annotationOf(css);

  return annotation !== undefined && !annotation.startsWith('data:');
};

// A dev build of styled-components or emotion writes its map into the style block it injects.
export const inlineSourceMapOf = (css: string): string | undefined => {
  const annotation = annotationOf(css);

  if (annotation?.startsWith('data:') !== true) {
    return undefined; // an external .map has to be fetched before the engine ever sees it
  }

  const base64 = annotation.indexOf(';base64,');

  try {
    return base64 === -1
      ? decodeURIComponent(annotation.slice(annotation.indexOf(',') + 1))
      : decodeBase64(annotation.slice(base64 + ';base64,'.length));
  }
  catch {
    return undefined;
  }
};

// A map that will not parse is the same as no map: the served position is still true.
const traceMapFor = (sourceMap: string, sheetUrl: string): TraceMap | undefined => {
  try {
    return AnyMap(sourceMap, sheetUrl); // not TraceMap, so a sectioned index map resolves too
  }
  catch {
    return undefined;
  }
};

// Checked before the map is handed on, so a map that will not parse is caught where warnings live.
export const isUsableSourceMap = (sourceMap: string, sheetUrl: string): boolean => {
  return traceMapFor(sourceMap, sheetUrl) !== undefined;
};

export const createOriginResolver = (
  sourceMap: string | undefined,
  sheetUrl: string,
): OriginResolver => {
  const map = sourceMap === undefined ? undefined : traceMapFor(sourceMap, sheetUrl);

  if (map === undefined) {
    return NO_ORIGIN;
  }

  return {
    at: (line, column) => {
      // PostCSS counts columns from one and source maps count them from zero.
      const found = originalPositionFor(map, { line, column: column - 1 });

      if (found.source === null) {
        return undefined;
      }

      return { url: found.source, line: found.line, column: found.column + 1 };
    },
  };
};
