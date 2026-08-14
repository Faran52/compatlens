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

// atob returns bytes as characters; non-ASCII paths need UTF-8 decoding.
const decodeBase64 = (value: string): string => {
  const binary = atob(value);

  return new TextDecoder().decode(Uint8Array.from(binary, (char) => {
    return char.charCodeAt(0);
  }));
};

const annotationOf = (css: string): string | undefined => {
  return [...css.matchAll(ANNOTATION)].pop()?.[1];
};

// A missing map leaves the served position intact and warrants a warning.
export const namesExternalSourceMap = (css: string): boolean => {
  const annotation = annotationOf(css);

  return annotation !== undefined && !annotation.startsWith('data:');
};

// CSS-in-JS dev builds embed maps in injected style blocks.
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

// An invalid map leaves the served position intact.
const traceMapFor = (sourceMap: string, sheetUrl: string): TraceMap | undefined => {
  try {
    return AnyMap(sourceMap, sheetUrl); // not TraceMap, so a sectioned index map resolves too
  }
  catch {
    return undefined;
  }
};

// Validate here so warnings stay with map loading.
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
