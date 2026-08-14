export const UNREADABLE_STYLESHEET_WARNING = 'Some stylesheets could not be read and were skipped, '
  + 'so any findings in them are missing. A stylesheet served from another origin without CORS '
  + 'headers usually cannot be read at all, and a production CSS-in-JS build inserts its rules '
  + 'without ever putting them in the page.';

export const UNREADABLE_SOURCE_MAP_WARNING = 'A stylesheet named a source map that could not be '
  + 'read, so its findings point at the file as served rather than the one it was written in. A map '
  + 'served from another origin without CORS headers, or not deployed alongside its stylesheet, '
  + 'usually cannot be read at all.';

export const OBSERVER_KEY = '__compatlensObserver';

// Bump whenever the stash changes shape, so an update meets a page an older build instrumented.
export const OBSERVER_STATE_VERSION = 2;

// A churning app can outrun a drain; overflow is counted and reported, never silently dropped.
export const OBSERVER_BATCH_LIMIT = 2000;

// Four missed drains at the panel's 750ms cadence, so a slow tick never looks like a closed panel.
export const OBSERVER_ABANDONED_MS = 3000;

export const OBSERVER_DROPPED_WARNING = 'The page changed faster than CompatLens could read it.';
