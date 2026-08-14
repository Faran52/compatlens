import { bcdIdOf, slotsOf } from './browserSlotUtils';

import type {
  BrowserImpact,
  BrowserTarget,
  DetectedFeature,
  FeatureRegistryEntry,
  Finding,
  ResourceKind,
} from '../types';

// Compare segments: parseFloat misorders 15.10 and 15.4.
export const compareVersions = (left: string, right: string): number => {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

    if (difference !== 0) {
      return Math.sign(difference);
    }
  }

  return 0;
};

const sourceKindOf = (entry: FeatureRegistryEntry): ResourceKind => {
  if (entry.kind.startsWith('html-')) {
    return 'html';
  }

  return 'css';
};

// Report passing slots so the panel can show passes.
const impactsFor = (entry: FeatureRegistryEntry, target: BrowserTarget): BrowserImpact[] => {
  const impacts: BrowserImpact[] = [];

  for (const slot of slotsOf(target)) {
    const targetVersion = target[slot];

    /* v8 ignore next 3 -- slotsOf only yields slots the target defines. */
    if (targetVersion === undefined) {
      continue;
    }

    const supportedFrom = entry.support[bcdIdOf(slot)];

    // Prefixed, flagged, or absent support is not confirmed support.
    if (supportedFrom === undefined) {
      impacts.push({ slot, targetVersion, supported: false });
      continue;
    }

    impacts.push({
      slot,
      targetVersion,
      supportedFrom,
      supported: compareVersions(targetVersion, supportedFrom) >= 0,
    });
  }

  return impacts;
};

export const resolveSupport = (
  detection: DetectedFeature,
  entry: FeatureRegistryEntry,
  target: BrowserTarget,
): Finding | null => {
  const impacts = impactsFor(entry, target);
  const failing = impacts.filter((impact) => {
    return !impact.supported;
  });

  if (failing.length === 0) {
    return null;
  }

  const { location } = detection;

  return {
    id: `${entry.id}@${location.url}:${String(location.line ?? 0)}:${String(location.column ?? 0)}`,
    featureId: entry.id,
    name: entry.name,
    kind: entry.kind,
    sourceKind: sourceKindOf(entry),
    syntax: entry.syntax,
    risk: entry.defaultRisk, // Data gaps never override catalog severity.
    verified: failing.every((impact) => {
      return impact.supportedFrom !== undefined;
    }),
    fallback: entry.fallback,
    mdnUrl: entry.mdnUrl,
    baseline: entry.baseline,
    location,
    impacts,
  };
};
