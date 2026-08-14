import { resolveSupport } from './supportUtils';

import type {
  BrowserTarget,
  DetectedFeature,
  FeatureRegistryEntry,
  ModernizationRule,
  Suggestion,
} from '../types';

// Only worth suggesting when the replacement is already safe for every browser being targeted,
// which resolveSupport reports by finding nothing to complain about.
export const resolveModernization = (
  detection: DetectedFeature,
  rule: ModernizationRule,
  replacement: FeatureRegistryEntry | undefined,
  target: BrowserTarget,
): Suggestion | null => {
  if (replacement === undefined) {
    return null;
  }

  if (resolveSupport(detection, replacement, target) !== null) {
    return null;
  }

  const { location } = detection;
  const suggestion: Suggestion = {
    id: `${rule.id}@${location.url}:${String(location.line ?? 0)}:${String(location.column ?? 0)}`,
    ruleId: rule.id,
    syntax: rule.syntax,
    advice: rule.advice,
    name: replacement.name,
    replacementSyntax: replacement.syntax,
    mdnUrl: replacement.mdnUrl,
    location,
  };

  if (replacement.baselineDate === undefined) {
    return suggestion;
  }

  return { ...suggestion, baselineDate: replacement.baselineDate };
};
