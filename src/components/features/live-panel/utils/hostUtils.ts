// The panel's own location is the extension, so the page's host only arrives with the first batch.
export const hostFromRoutes = (routes: readonly string[], fallback: string): string => {
  if (routes.length === 0) {
    return fallback;
  }

  try {
    return new URL(routes[0]).host;
  }
  catch {
    return fallback;
  }
};
