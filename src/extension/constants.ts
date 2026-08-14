export const UNREADABLE_STYLESHEET_WARNING = 'Some stylesheets could not be read and were skipped, '
  + 'so any findings in them are missing. A stylesheet served from another origin without CORS '
  + 'headers usually cannot be read at all.';

export const OBSERVER_KEY = '__compatlensObserver';

// Bump whenever the stash changes shape, so an update meets a page an older build instrumented.
export const OBSERVER_STATE_VERSION = 1;

// A churning app can outrun a drain; overflow is counted and reported, never silently dropped.
export const OBSERVER_BATCH_LIMIT = 2000;

// Four missed drains at the panel's 750ms cadence, so a slow tick never looks like a closed panel.
export const OBSERVER_ABANDONED_MS = 3000;

export const OBSERVER_DROPPED_WARNING = 'The page changed faster than CompatLens could read it.';
