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

export const emptySession = (): SessionReport => {
  return {
    occurrences: [],
    suggestions: [],
    routes: [],
    resources: { total: 0, parsed: 0, failed: 0 },
    coverage: { mappedDetections: 0, registryFeatures: 0 },
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
    routes: session.routes.includes(context.route)
      ? session.routes
      : [...session.routes, context.route],
    resources: {
      total: session.resources.total + report.resources.total,
      parsed: session.resources.parsed + report.resources.parsed,
      failed: session.resources.failed + report.resources.failed,
    },
    coverage: {
      mappedDetections: session.coverage.mappedDetections + report.coverage.mappedDetections,
      registryFeatures: report.coverage.registryFeatures,
    },
    warnings: [...session.warnings, ...report.warnings.filter((warning) => {
      return !session.warnings.includes(warning);
    })],
    watching: session.watching,
    capped,
  };
};
