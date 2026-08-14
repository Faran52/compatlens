import type { SourceLocation } from '../types';

const withoutQuery = (url: string): string => {
  return url.split(/[?#]/)[0];
};

// Stripped once at the engine boundary so no downstream surface can leak a session token.
export const stripQuery = (url: string): string => {
  try {
    const parsed = new URL(url);

    // A source map names sources under schemes like webpack:, whose origin URL reports as "null".
    return parsed.origin === 'null' ? withoutQuery(url) : `${parsed.origin}${parsed.pathname}`;
  }
  catch {
    return withoutQuery(url);
  }
};

// File name alone: a full address in a dense grid pushes the version columns off screen.
export const fileNameOf = (url: string): string => {
  const path = stripQuery(url);
  const lastSegment = path.split('/').filter((segment) => {
    return segment !== '';
  }).pop();

  if (lastSegment === undefined || lastSegment.includes(':')) {
    return path;
  }

  return lastSegment;
};

// A detection from the rendered DOM has no line, so the colon has to go with it.
export const servedLabelFor = (location: SourceLocation): string => {
  const line = location.line;

  return line === undefined
    ? fileNameOf(location.url)
    : `${fileNameOf(location.url)}:${String(line)}`;
};

// The file a source map points at is the one being edited, so it is the one worth naming.
export const locationLabelFor = (location: SourceLocation): string => {
  const origin = location.origin;

  return origin === undefined
    ? servedLabelFor(location)
    : `${fileNameOf(origin.url)}:${String(origin.line)}`;
};
