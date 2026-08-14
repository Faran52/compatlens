import { OCCURRENCE_LIMIT } from './constants';

import type {
  AnalysisReport,
  CaptureContext,
  Occurrence,
  SessionReport,
} from '@engine';

// Tree position, not line: the same feature at the same spot is one occurrence however often seen.
const keyOf = (occurrence: Occurrence): string => {
  return `${occurrence.featureId}|${occurrence.location.url}|${occurrence.location.path ?? ''}`;
};

// A batch re-reports what earlier batches already covered, so every list here merges rather than adds.
const mergeUnique = (kept: readonly string[], arriving: readonly string[]): string[] => {
  return [...new Set([...kept, ...arriving])];
};

export const emptySession = (): SessionReport => {
  return {
    occurrences: [],
    suggestions: [],
    route: '',
    routes: [],
    resources: { seen: [], parsed: [] },
    coverage: { matched: [], registryFeatures: 0 },
    warnings: [],
    watching: false,
    capped: false,
  };
};

export const mergeBatch = (
  session: SessionReport,
  report: AnalysisReport,
  context: CaptureContext,
): SessionReport => {
  const seen = new Set(session.occurrences.map(keyOf));
  const added: Occurrence[] = [];
  let capped = session.capped;

  for (const finding of report.findings) {
    const occurrence: Occurrence = { ...finding, route: context.route, firstSeen: context.at };

    if (seen.has(keyOf(occurrence))) {
      continue;
    }

    if (session.occurrences.length + added.length >= OCCURRENCE_LIMIT) {
      capped = true;
      break;
    }

    seen.add(keyOf(occurrence));
    added.push(occurrence);
  }

  const suggestionIds = new Set(session.suggestions.map((suggestion) => {
    return suggestion.id;
  }));

  return {
    occurrences: [...session.occurrences, ...added],
    suggestions: [
      ...session.suggestions,
      ...report.suggestions.filter((suggestion) => {
        return !suggestionIds.has(suggestion.id);
      }),
    ],
    route: context.route,
    routes: mergeUnique(session.routes, [context.route]),
    resources: {
      seen: mergeUnique(session.resources.seen, report.resources.seen),
      parsed: mergeUnique(session.resources.parsed, report.resources.parsed),
    },
    coverage: {
      matched: mergeUnique(session.coverage.matched, report.coverage.matched),
      registryFeatures: report.coverage.registryFeatures,
    },
    warnings: mergeUnique(session.warnings, report.warnings),
    watching: session.watching,
    capped,
  };
};
