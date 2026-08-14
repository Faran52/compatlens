// The panel's own location is the extension, so the page's host only arrives with a batch.
export const hostOf = (route: string, fallback: string): string => {
  try {
    return new URL(route).host;
  }
  catch {
    return fallback;
  }
};
