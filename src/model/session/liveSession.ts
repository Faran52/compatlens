import { emptySession, mergeBatch } from './session';

import type {
  AnalysisReport,
  BrowserTarget,
  FeatureRegistryEntry,
  ModernizationRule,
  ResourceInput,
  SessionReport,
} from '@engine';

interface LiveCaptureResult {
  route: string;
  resources: readonly ResourceInput[];
  warnings: readonly string[];
}

export interface LiveSessionDependencies {
  observe: () => Promise<void>;
  reobserve: () => Promise<void>;
  capture: () => Promise<LiveCaptureResult>;
  analyze: (job: {
    resources: readonly ResourceInput[];
    registry: readonly FeatureRegistryEntry[];
    rules: readonly ModernizationRule[];
    target: BrowserTarget;
    warnings: readonly string[];
  }) => Promise<AnalysisReport>;
  registry: readonly FeatureRegistryEntry[];
  rules: readonly ModernizationRule[];
  target: () => BrowserTarget;
  timestamp: () => string;
}

export interface LiveSession {
  start: () => Promise<void>;
  tick: () => Promise<SessionReport>;
  report: () => SessionReport;
  reset: () => Promise<void>;
}

// A failing batch must say so in the panel; a silent catch is how live mode looks broken for free.
const noteFailure = (warnings: readonly string[], error: unknown): readonly string[] => {
  const message = error instanceof Error ? error.message : 'The page could not be read.';

  return warnings.includes(message) ? warnings : [...warnings, message];
};

// No timer of its own: the caller owns the cadence, which keeps this testable and framework-free.
export const createLiveSession = (dependencies: LiveSessionDependencies): LiveSession => {
  let session = emptySession();

  return {
    start: async () => {
      try {
        await dependencies.observe();
        session = { ...session, watching: true };
      }
      catch (error) {
        session = { ...session, warnings: noteFailure(session.warnings, error) };
      }
    },
    tick: async () => {
      let capture;

      try {
        capture = await dependencies.capture();
      }
      catch (error) {
        session = { ...session, warnings: noteFailure(session.warnings, error) };

        return session;
      }

      if (capture.resources.length === 0 && capture.warnings.length === 0) {
        return session;
      }

      let report;

      try {
        report = await dependencies.analyze({
          resources: capture.resources,
          registry: dependencies.registry,
          rules: dependencies.rules,
          target: dependencies.target(),
          warnings: capture.warnings,
        });
      }
      catch (error) {
        session = { ...session, warnings: noteFailure(session.warnings, error) };

        return session;
      }

      session = mergeBatch(session, report, {
        route: capture.route,
        at: dependencies.timestamp(),
      });

      return session;
    },
    report: () => {
      return session;
    },
    // Changing the target invalidates every verdict, but the page is unchanged and still watched.
    reset: async () => {
      session = { ...emptySession(), watching: session.watching, routes: session.routes };

      try {
        // Without this the queue stays empty on a settled page and no finding ever returns.
        await dependencies.reobserve();
      }
      catch (error) {
        session = { ...session, warnings: noteFailure(session.warnings, error) };
      }
    },
  };
};
