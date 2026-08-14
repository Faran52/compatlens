import { browserLabels } from '@compat-data';
import {
  BROWSER_SLOT_IDS,
  RISK_LABELS,
  stripQuery,
} from '@engine';

import { RISKS } from './gridUtils';

import type {
  BrowserTarget,
  Occurrence,
  RiskLevel,
  SessionReport,
  SourceLocation,
  Suggestion,
} from '@engine';

interface ExportInput {
  report: SessionReport;
  host: string;
  target: BrowserTarget;
  exportedAt: string;
}

const escapeCell = (value: string): string => {
  return value.replaceAll('|', '\\|');
};

// The query string goes so the path can be matched against a file on disk.
const positionOf = (location: SourceLocation): string => {
  const origin = location.origin;

  if (origin !== undefined) {
    return `${stripQuery(origin.url)}:${String(origin.line)}`;
  }

  const path = stripQuery(location.url);
  const rendered = location.view === 'rendered' ? ' (rendered)' : '';

  if (location.line === undefined) {
    return `${path}${rendered}`;
  }

  return `${path}:${String(location.line)}${rendered}`;
};

const targetLine = (target: BrowserTarget): string => {
  return BROWSER_SLOT_IDS.flatMap((slot) => {
    const version = target[slot];

    return version === undefined ? [] : [`${browserLabels[slot]} ${version}`];
  }).join(', ');
};

const failingOn = (occurrence: Occurrence): string => {
  return occurrence.impacts
    .filter((impact) => {
      return !impact.supported;
    })
    .map((impact) => {
      const from = impact.supportedFrom;

      return from === undefined
        ? `${browserLabels[impact.slot]} never`
        : `${browserLabels[impact.slot]} from ${from}`;
    })
    .join('; ');
};

const findingRows = (occurrences: readonly Occurrence[]): string[] => {
  return occurrences.map((occurrence) => {
    return `| ${escapeCell(positionOf(occurrence.location))} | ${escapeCell(occurrence.name)} `
      + `| \`${escapeCell(occurrence.syntax)}\` | ${escapeCell(failingOn(occurrence))} `
      + `| ${escapeCell(occurrence.fallback)} | ${escapeCell(occurrence.mdnUrl)} |`;
  });
};

const suggestionRows = (suggestions: readonly Suggestion[]): string[] => {
  return suggestions.map((suggestion) => {
    return `| ${escapeCell(positionOf(suggestion.location))} | \`${escapeCell(suggestion.syntax)}\` `
      + `| \`${escapeCell(suggestion.replacementSyntax)}\` | ${escapeCell(suggestion.advice)} `
      + `| ${escapeCell(suggestion.mdnUrl)} |`;
  });
};

const coverageLines = (report: SessionReport): string[] => {
  const lines = [
    `- Resources read: ${String(report.resources.parsed.length)} `
    + `of ${String(report.resources.seen.length)}`,
  ];

  if (!report.watching) {
    lines.push('- **The page was not being watched, so this report is incomplete.**');
  }

  if (report.capped) {
    lines.push('- **The finding limit was reached, so later changes were not recorded.**');
  }

  for (const warning of report.warnings) {
    lines.push(`- **${warning}**`);
  }

  return lines;
};

const sourceMapLines = (occurrences: readonly Occurrence[]): string[] => {
  const unresolved = occurrences.some((occurrence) => {
    return occurrence.sourceKind === 'css' && occurrence.location.origin === undefined;
  });

  if (!unresolved) {
    return [];
  }

  return [
    '> CSS positions are in the stylesheet as served. If it is compiled from Sass, Less or PostCSS,',
    '> enable source maps in your build and map each position back before editing.',
    '',
  ];
};

const sectionFor = (risk: RiskLevel, occurrences: readonly Occurrence[]): string[] => {
  const matching = occurrences.filter((occurrence) => {
    return occurrence.risk === risk;
  });

  if (matching.length === 0) {
    return [];
  }

  return [
    `## ${RISK_LABELS[risk]} (${String(matching.length)})`,
    '',
    '| Source | Feature | Syntax | Fails on | Fallback | Reference |',
    '| --- | --- | --- | --- | --- | --- |',
    ...findingRows(matching),
    '',
  ];
};

const moderniseLines = (suggestions: readonly Suggestion[]): string[] => {
  if (suggestions.length === 0) {
    return [];
  }

  return [
    `## Safe to modernise (${String(suggestions.length)})`,
    '',
    'Every replacement below is already supported by every browser in the target.',
    '',
    '| Source | Legacy | Replacement | Advice | Reference |',
    '| --- | --- | --- | --- | --- |',
    ...suggestionRows(suggestions),
    '',
  ];
};

export const reportToMarkdown = (input: ExportInput): string => {
  return [
    '# CompatLens report',
    '',
    `- Page: ${input.host}`,
    `- Exported: ${input.exportedAt}`,
    `- Target: ${targetLine(input.target)}`,
    `- Findings: ${String(input.report.occurrences.length)}`,
    // First, because a partial read that reads as a clean page is the one failure that matters.
    ...coverageLines(input.report),
    '',
    ...sourceMapLines(input.report.occurrences),
    ...RISKS.flatMap((risk) => {
      return sectionFor(risk, input.report.occurrences);
    }),
    ...moderniseLines(input.report.suggestions),
  ].join('\n');
};

export const exportFileName = (host: string, exportedAt: string): string => {
  return `compatlens-${host.replaceAll(':', '-')}-${exportedAt.slice(0, 10)}.md`;
};
