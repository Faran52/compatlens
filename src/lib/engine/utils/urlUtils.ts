interface SourceLocation {
  url: string;
  line?: number;
}

// Stripped once at the engine boundary so no downstream surface can leak a session token.
export const stripQuery = (url: string): string => {
  try {
    const parsed = new URL(url);

    return `${parsed.origin}${parsed.pathname}`;
  }
  catch {
    /* v8 ignore next -- split always yields one element; the fallback only satisfies the type. */
    return url.split(/[?#]/)[0] ?? url;
  }
};

// File name alone for a dense list; callers keep the full path for the title.
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
export const locationLabelFor = (location: SourceLocation): string => {
  const line = location.line;

  return line === undefined
    ? fileNameOf(location.url)
    : `${fileNameOf(location.url)}:${String(line)}`;
};
