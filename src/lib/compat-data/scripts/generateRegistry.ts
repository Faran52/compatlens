import { BROWSER_IDS } from '@engine';

import type {
  BaselineStatus,
  BrowserId,
  DataVersion,
  DetectorDefinition,
  FeatureRegistryEntry,
} from '@engine';

export interface BrowserSupportStatement {
  version_added: string | boolean | null;
  version_removed?: string | boolean;
  prefix?: string;
  alternative_name?: string;
  partial_implementation?: boolean;
  flags?: readonly object[];
}

export interface BcdFeature {
  mdnUrl: string;
  support: Readonly<Partial<Record<BrowserId, readonly BrowserSupportStatement[]>>>;
}

export interface WebFeatureStatus {
  baseline: 'high' | 'low' | false;
  baseline_low_date?: string;
  baseline_high_date?: string;
}

export interface RegistrySources {
  bcdVersion: string;
  webFeaturesVersion: string;
  generatedAt: string;
  readBcd: (path: string) => BcdFeature | undefined;
  readWebFeature: (id: string) => WebFeatureStatus | undefined;
}

// BCD also uses non-version values, which cannot be support floors.
const RELEASE_VERSION = /^\d+(?:\.\d+)*$/;

const resolveBaseline = (baseline: WebFeatureStatus['baseline']): BaselineStatus => {
  if (baseline === 'high') {
    return 'widely';
  }

  if (baseline === 'low') {
    return 'newly';
  }

  return 'limited';
};

const resolveSupportedFrom = ( // Prefixed, flagged, partial, and removed support is not confirmed support.
  statements: readonly BrowserSupportStatement[] | undefined,
): string | undefined => {
  const statement = statements?.[0];

  if (!statement) {
    return undefined;
  }

  if (statement.prefix !== undefined || statement.alternative_name !== undefined) {
    return undefined;
  }

  if (statement.version_removed !== undefined || statement.partial_implementation === true) {
    return undefined;
  }

  if (statement.flags !== undefined && statement.flags.length > 0) {
    return undefined;
  }

  const version = statement.version_added;

  if (typeof version !== 'string' || !RELEASE_VERSION.test(version)) {
    return undefined;
  }

  return version;
};

const resolveSupport = (feature: BcdFeature): Partial<Record<BrowserId, string>> => {
  const support: Partial<Record<BrowserId, string>> = {};

  for (const browser of BROWSER_IDS) {
    const supportedFrom = resolveSupportedFrom(feature.support[browser]);

    if (supportedFrom !== undefined) {
      support[browser] = supportedFrom;
    }
  }

  return support;
};

const joinDefinition = (
  definition: DetectorDefinition,
  sources: RegistrySources,
  dataVersion: DataVersion,
): FeatureRegistryEntry => {
  const bcdFeature = sources.readBcd(definition.bcdPath);

  if (!bcdFeature) {
    throw new Error(`${definition.id}: no compatibility data at BCD path "${definition.bcdPath}"`);
  }

  const webFeature = sources.readWebFeature(definition.webFeatureId);

  if (!webFeature) {
    throw new Error(`${definition.id}: no web feature named "${definition.webFeatureId}"`);
  }

  const baselineDate = webFeature.baseline === 'high'
    ? webFeature.baseline_high_date
    : webFeature.baseline_low_date;

  const entry: FeatureRegistryEntry = {
    ...definition,
    baseline: resolveBaseline(webFeature.baseline),
    mdnUrl: bcdFeature.mdnUrl,
    support: resolveSupport(bcdFeature),
    dataVersion,
  };

  if (baselineDate === undefined) {
    return entry;
  }

  return { ...entry, baselineDate };
};

export const generateRegistry = (
  definitions: readonly DetectorDefinition[],
  sources: RegistrySources,
): FeatureRegistryEntry[] => {
  const dataVersion: DataVersion = {
    bcd: sources.bcdVersion,
    webFeatures: sources.webFeaturesVersion,
    generatedAt: sources.generatedAt,
  };

  return definitions
    .map((definition) => {
      return joinDefinition(definition, sources, dataVersion);
    })
    .sort((left, right) => {
      return left.id.localeCompare(right.id);
    });
};
