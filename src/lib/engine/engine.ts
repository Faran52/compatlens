import { RISK_ORDER } from './constants';
import { detectCssFeatures } from './detectors/detectCssFeatures';
import { detectHtmlFeatures } from './detectors/detectHtmlFeatures';
import { extractInlineStyles, type InlineStyle } from './detectors/extractInlineStyles';
import { type PositionedElement, walkElements } from './detectors/walkElements';
import { resolveModernization } from './utils/modernizationUtils';
import { resolveSupport } from './utils/supportUtils';
import { stripQuery } from './utils/urlUtils';

import type {
  AnalysisReport,
  BrowserTarget,
  DetectedFeature,
  FeatureRegistryEntry,
  Finding,
  ModernizationRule,
  ResourceInput,
  ResourceView,
  SourceLocation,
  Suggestion,
  SyntaxDefinition,
} from './types';

interface AnalyzeResourcesInput {
  resources: readonly ResourceInput[];
  registry: readonly FeatureRegistryEntry[];
  rules: readonly ModernizationRule[];
  target: BrowserTarget;
  warnings: readonly string[];
  now: () => number;
}

interface Located {
  location: SourceLocation;
}

interface ResolveContext {
  entriesById: Map<string, FeatureRegistryEntry>;
  rulesById: Map<string, ModernizationRule>;
  target: BrowserTarget;
}

interface DetectionResult {
  finding: Finding | null;
  suggestion: Suggestion | null;
  mapped: boolean;
}

interface ResourceOutcome {
  findings: Finding[];
  suggestions: Suggestion[];
  matched: string[];
}

// parse5 gives no position for an implied element; sort it to the start of the resource.
const lineOf = (location: SourceLocation): number => {
  return location.line ?? 0;
};

const columnOf = (location: SourceLocation): number => {
  return location.column ?? 0;
};

const locationKey = (location: SourceLocation, view: ResourceView): string => {
  return `${location.url}|${view}|${location.path ?? ''}`
    + `|${String(lineOf(location))}|${String(columnOf(location))}`;
};

// Tree position, not line: the two views of a document number their lines differently.
const occurrenceKey = (finding: Finding): string => {
  return `${finding.featureId}|${finding.location.url}|${finding.location.path ?? ''}`;
};

const suggestionKey = (suggestion: Suggestion): string => {
  return `${suggestion.ruleId}|${suggestion.location.url}|${suggestion.location.path ?? ''}`;
};

// An occurrence in both views reports once against the source; script-only uses survive.
const withoutRenderedDuplicates = <T extends Located>(
  items: readonly T[],
  keyOf: (item: T) => string,
): T[] => {
  const inSource = new Set(
    items
      .filter((item) => {
        return item.location.view !== 'rendered';
      })
      .map(keyOf),
  );

  return items.filter((item) => {
    return item.location.view !== 'rendered' || !inSource.has(keyOf(item));
  });
};

const compareSuggestions = (left: Suggestion, right: Suggestion): number => {
  const byUrl = left.location.url.localeCompare(right.location.url);

  if (byUrl !== 0) {
    return byUrl;
  }

  const byLine = lineOf(left.location) - lineOf(right.location);

  if (byLine !== 0) {
    return byLine;
  }

  return left.syntax.localeCompare(right.syntax);
};

const compareFindings = (left: Finding, right: Finding): number => {
  const byRisk = RISK_ORDER[left.risk] - RISK_ORDER[right.risk];

  if (byRisk !== 0) {
    return byRisk;
  }

  const byUrl = left.location.url.localeCompare(right.location.url);

  if (byUrl !== 0) {
    return byUrl;
  }

  const byLine = lineOf(left.location) - lineOf(right.location);

  if (byLine !== 0) {
    return byLine;
  }

  return left.name.localeCompare(right.name);
};

// Rebase a <style> finding onto its line in the host document.
const rebase = (line: number | undefined, style: InlineStyle): number => {
  /* v8 ignore next 3 -- postcss always positions parsed nodes; the guard satisfies the type. */
  if (line === undefined) {
    return style.startLine;
  }

  return line + style.startLine - 1;
};

const inlineStyleDetections = (
  elements: readonly PositionedElement[],
  resource: ResourceInput,
  definitions: readonly SyntaxDefinition[],
): DetectedFeature[] => {
  const detections: DetectedFeature[] = [];

  for (const style of extractInlineStyles(elements)) {
    try {
      const found = detectCssFeatures(
        { kind: 'css', url: resource.url, content: style.content },
        definitions,
      );

      for (const detection of found) {
        detections.push({
          featureId: detection.featureId,
          location: {
            ...detection.location,
            line: rebase(detection.location.line, style),
            // Without the block's own path every inline finding on a route keys the same and merges.
            path: style.path,
          },
        });
      }
    }
    catch {
      continue; // drop the malformed block, not the document's other findings
    }
  }

  return detections;
};

const detect = (
  resource: ResourceInput,
  definitions: readonly SyntaxDefinition[],
): DetectedFeature[] => {
  if (resource.kind === 'css') {
    return detectCssFeatures(resource, definitions);
  }

  const elements = walkElements(resource.content);

  return [
    ...detectHtmlFeatures(elements, resource.url, definitions),
    ...inlineStyleDetections(elements, resource, definitions),
  ];
};

// A detection names either a registry feature, which carries risk, or a legacy rule, which does not.
const resolveDetection = (
  located: DetectedFeature,
  context: ResolveContext,
): DetectionResult => {
  const rule = context.rulesById.get(located.featureId);

  if (rule !== undefined) {
    return {
      finding: null,
      suggestion: resolveModernization(
        located,
        rule,
        context.entriesById.get(rule.replacementId),
        context.target,
      ),
      mapped: false,
    };
  }

  const entry = context.entriesById.get(located.featureId);

  /* v8 ignore next 3 -- detections only name ids read from this same registry. */
  if (entry === undefined) {
    return { finding: null, suggestion: null, mapped: false };
  }

  return {
    finding: resolveSupport(located, entry, context.target),
    suggestion: null,
    mapped: true,
  };
};

const collectFromResource = ( // throws when the resource does not parse; the caller counts that
  resource: ResourceInput,
  definitions: readonly SyntaxDefinition[],
  context: ResolveContext,
  seen: Set<string>,
): ResourceOutcome => {
  const detections = detect(resource, definitions);
  const view = resource.view ?? 'source';
  const outcome: ResourceOutcome = { findings: [], suggestions: [], matched: [] };

  for (const detection of detections) {
    const located: DetectedFeature = {
      featureId: detection.featureId,
      location: { ...detection.location, view },
    };
    const key = `${located.featureId}|${locationKey(located.location, view)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const result = resolveDetection(located, context);

    if (result.mapped) {
      outcome.matched.push(located.featureId);
    }

    if (result.finding !== null) {
      outcome.findings.push(result.finding);
    }

    if (result.suggestion !== null) {
      outcome.suggestions.push(result.suggestion);
    }
  }

  return outcome;
};

const describeParseFailure = (resource: ResourceInput, error: unknown): string => {
  /* v8 ignore next 3 -- both parsers throw Errors; the guard only satisfies the unknown catch. */
  const reason = error instanceof Error ? error.message : 'unrecognized parser failure';

  // The panel renders warnings verbatim, so this is the one place a raw route could reach a screen.
  return `Could not parse ${stripQuery(resource.url)}: ${reason}`;
};

export const analyzeResources = (input: AnalyzeResourcesInput): AnalysisReport => {
  const startedAt = input.now();
  const entriesById = new Map(input.registry.map((entry) => {
    return [entry.id, entry];
  }));
  const rulesById = new Map(input.rules.map((rule) => {
    return [rule.id, rule];
  }));
  const definitions: readonly SyntaxDefinition[] = [...input.registry, ...input.rules];
  const context: ResolveContext = { entriesById, rulesById, target: input.target };
  const warnings = [...input.warnings];
  const findings: Finding[] = [];
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();
  const seenResources = new Set<string>();
  const parsed = new Set<string>();
  const matched = new Set<string>();

  for (const resource of input.resources) {
    seenResources.add(resource.url);

    try {
      const outcome = collectFromResource(resource, definitions, context, seen);

      parsed.add(resource.url);
      findings.push(...outcome.findings);
      suggestions.push(...outcome.suggestions);

      for (const featureId of outcome.matched) {
        matched.add(featureId);
      }
    }
    catch (error) {
      warnings.push(describeParseFailure(resource, error));
    }
  }

  const reported = withoutRenderedDuplicates(findings, occurrenceKey);
  const advised = withoutRenderedDuplicates(suggestions, suggestionKey);

  reported.sort(compareFindings);
  advised.sort(compareSuggestions);

  return {
    findings: reported,
    suggestions: advised,
    resources: {
      seen: [...seenResources],
      parsed: [...parsed],
    },
    coverage: {
      matched: [...matched],
      registryFeatures: input.registry.length,
    },
    warnings,
    durationMs: input.now() - startedAt,
  };
};
