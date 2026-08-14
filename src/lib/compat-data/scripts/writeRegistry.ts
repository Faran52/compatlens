import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import { getCompatibleVersions } from 'baseline-browser-mapping';
import { features } from 'web-features';

import {
  AGE_WINDOW_YEARS_RANGE,
  BROWSER_IDS,
  BROWSER_SLOT_IDS,
  compareVersions,
  EDGE_LEGACY_SLOT,
} from '@engine';

import packageJson from '../../../../package.json' with { type: 'json' };
import { curatedDetectors } from '../curatedDetectors';

import {
  type BcdFeature,
  type BrowserSupportStatement,
  generateRegistry,
  type WebFeatureStatus,
} from './generateRegistry';

import type {
  AgeWindowYears,
  BrowserId,
  BrowserSlotId,
  BrowserTarget,
  EngineId,
  EngineRun,
} from '@engine';
import type { Identifier, SupportStatement } from '@mdn/browser-compat-data';

const SNAPSHOT_DATE = '2026-07-30'; // Pinned so generation is byte-reproducible.

const REGISTRY_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'generatedRegistry.ts');

const TARGET_KEYS = [...BROWSER_SLOT_IDS];

const ENTRY_KEYS = [ // A replacer array makes generated key order stable.
  'id',
  'name',
  'kind',
  'syntax',
  'bcdPath',
  'webFeatureId',
  'defaultRisk',
  'fallback',
  'baseline',
  'baselineDate',
  'mdnUrl',
  'support',
  ...TARGET_KEYS,
  'dataVersion',
  'bcd',
  'webFeatures',
  'generatedAt',
];

const WINDOW_KEYS = [...AGE_WINDOW_YEARS_RANGE.map(String), ...TARGET_KEYS];

const bcdRoots = new Map<string, Identifier>([
  ['css', bcd.css],
  ['html', bcd.html],
]);

const readIdentifier = (path: string): Identifier | undefined => {
  const segments = path.split('.');
  let node = bcdRoots.get(segments[0]);

  for (const segment of segments.slice(1)) {
    if (node === undefined) {
      return undefined;
    }

    node = node[segment];
  }

  return node;
};

// Leaf nodes often lack mdn_url, so use the nearest documented ancestor.
const readMdnUrl = (path: string): string | undefined => {
  const segments = path.split('.');

  for (let depth = segments.length; depth > 0; depth -= 1) {
    const url = readIdentifier(segments.slice(0, depth).join('.'))?.__compat?.mdn_url;

    if (url !== undefined) {
      return url;
    }
  }

  return undefined;
};

const toStatements = (support: SupportStatement | undefined): readonly BrowserSupportStatement[] => {
  if (support === undefined) {
    return [];
  }

  if (Array.isArray(support)) {
    return support;
  }

  return [support];
};

const readBcd = (path: string): BcdFeature | undefined => {
  const compat = readIdentifier(path)?.__compat;
  const mdnUrl = readMdnUrl(path);

  if (compat === undefined || mdnUrl === undefined) {
    return undefined;
  }

  const support: Partial<Record<BrowserId, readonly BrowserSupportStatement[]>> = {};

  for (const browser of BROWSER_IDS) {
    support[browser] = toStatements(compat.support[browser]);
  }

  return { mdnUrl, support };
};

// Map preserves missing IDs; record indexing would not.
const featuresById = new Map(Object.entries(features));

const readWebFeature = (id: string): WebFeatureStatus | undefined => {
  const feature = featuresById.get(id);

  if (feature === undefined || !('status' in feature)) {
    return undefined;
  }

  const { status } = feature;
  const { baseline } = status;

  return {
    baseline: baseline === 'high' || baseline === 'low' ? baseline : false,
    baseline_low_date: status.baseline_low_date,
    baseline_high_date: status.baseline_high_date,
  };
};

// Baseline excludes Opera, IE, and Samsung Internet.
const BASELINE_BROWSERS: readonly BrowserId[] = [
  'chrome',
  'edge',
  'firefox',
  'safari',
  'chrome_android',
  'firefox_android',
  'safari_ios',
];

const readWidelyAvailableTarget = (): BrowserTarget => {
  const versions = getCompatibleVersions({ widelyAvailableOnDate: SNAPSHOT_DATE });
  const byBrowser = new Map(versions.map((row) => {
    return [row.browser, row.version];
  }));

  const target: Partial<Record<BrowserId, string>> = {};

  for (const browser of BASELINE_BROWSERS) {
    const version = byBrowser.get(browser);

    if (version === undefined) {
      throw new Error(`baseline-browser-mapping has no Widely Available version for ${browser}`);
    }

    target[browser] = version;
  }

  return target;
};

// Fail on BCD browser drift rather than silently dropping a browser.
const assertBrowsersMatchBcd = (): void => {
  const fromBcd = Object.entries(bcd.browsers)
    .filter(([, browser]) => {
      return browser.type === 'desktop' || browser.type === 'mobile';
    })
    .map(([id]) => {
      return id;
    });
  const declared = new Set<string>(BROWSER_IDS);
  const missing = fromBcd.filter((id) => {
    return !declared.has(id);
  });
  const extra = BROWSER_IDS.filter((id) => {
    return !fromBcd.includes(id);
  });

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      'BrowserId is out of step with BCD. '
      + `Add: [${missing.join(', ')}]. Remove: [${extra.join(', ')}].`,
    );
  }
};

const readBrowserLabels = (): Record<string, string> => {
  const labels: Record<string, string> = {};

  for (const browser of BROWSER_IDS) {
    labels[browser] = bcd.browsers[browser].name;
  }

  labels[EDGE_LEGACY_SLOT] = 'Edge Legacy';

  return labels;
};

const cutoffDate = (years: number): string => {
  const date = new Date(`${SNAPSHOT_DATE}T00:00:00.000Z`);

  date.setUTCFullYear(date.getUTCFullYear() - years);

  return date.toISOString().slice(0, 10);
};

// The floor is the oldest release inside the target window.
const oldestReleaseSince = (browser: BrowserId, cutoff: string): string | undefined => {
  let oldest: string | undefined;

  for (const [version, release] of Object.entries(bcd.browsers[browser].releases)) {
    if (release.release_date === undefined || release.release_date < cutoff) {
      continue;
    }

    if (oldest === undefined || compareVersions(version, oldest) < 0) {
      oldest = version;
    }
  }

  return oldest;
};

// Edge Legacy is Edge at versions that shipped EdgeHTML.
const oldestEdgeLegacySince = (cutoff: string): string | undefined => {
  let oldest: string | undefined;

  for (const [version, release] of Object.entries(bcd.browsers.edge.releases)) {
    if (release.release_date === undefined || release.release_date < cutoff) {
      continue;
    }

    if (release.engine !== 'EdgeHTML') {
      continue;
    }

    if (oldest === undefined || compareVersions(version, oldest) < 0) {
      oldest = version;
    }
  }

  return oldest;
};

// Omit browsers with no release in the window, including IE.
const targetForWindow = (years: AgeWindowYears): BrowserTarget => {
  const cutoff = cutoffDate(years);
  const target: Partial<Record<BrowserSlotId, string>> = {};

  for (const browser of BROWSER_IDS) {
    const version = oldestReleaseSince(browser, cutoff);

    if (version !== undefined) {
      target[browser] = version;
    }
  }

  const legacy = oldestEdgeLegacySince(cutoff);

  if (legacy !== undefined) {
    target[EDGE_LEGACY_SLOT] = legacy;
  }

  return target;
};

const ageWindowTargets: Readonly<Record<string, BrowserTarget>> = Object.fromEntries(
  AGE_WINDOW_YEARS_RANGE.map((years) => {
    return [String(years), targetForWindow(years)];
  }),
);

// BCD also lists server engines; only browser engines reach our types.
const isEngineId = (value: string): value is EngineId => {
  return value === 'Blink' || value === 'Gecko' || value === 'WebKit'
    || value === 'EdgeHTML' || value === 'Trident' || value === 'Presto';
};

// BCD engine history preserves Edge and Opera switches.
const readEngineRuns = (): Readonly<Record<string, readonly EngineRun[]>> => {
  const runs: Record<string, EngineRun[]> = {};

  for (const browser of BROWSER_IDS) {
    const dated = Object.entries(bcd.browsers[browser].releases)
      .filter(([, release]) => {
        return release.engine !== undefined;
      })
      .sort((left, right) => {
        return compareVersions(left[0], right[0]);
      });
    const list: EngineRun[] = [];

    for (const [version, release] of dated) {
      const engine = release.engine;

      if (engine !== undefined && isEngineId(engine) && list[list.length - 1]?.engine !== engine) {
        list.push({ engine, from: version });
      }
    }

    runs[browser] = list;
  }

  return runs;
};

assertBrowsersMatchBcd();

const registry = generateRegistry(curatedDetectors, {
  bcdVersion: bcd.__meta.version,
  webFeaturesVersion: packageJson.devDependencies['web-features'],
  generatedAt: `${SNAPSHOT_DATE}T00:00:00.000Z`,
  readBcd,
  readWebFeature,
});

// Entries carry dataVersion, so a second copy would drift.
const contents = `// Generated by src/lib/compat-data/scripts/writeRegistry.ts. Do not edit by hand.
import type {
  BrowserNames,
  BrowserTarget,
  EngineRun,
  FeatureRegistryEntry,
} from '../engine/index';

export const ageWindowTargets: Readonly<Record<string, BrowserTarget>> = ${
  JSON.stringify(ageWindowTargets, WINDOW_KEYS, 2)
};

export const widelyAvailableTarget: BrowserTarget = ${JSON.stringify(readWidelyAvailableTarget(), TARGET_KEYS, 2)};


export const engineRuns: Readonly<Record<string, readonly EngineRun[]>> = ${JSON.stringify(readEngineRuns(), null, 2)};

export const browserLabels: BrowserNames = ${JSON.stringify(readBrowserLabels(), TARGET_KEYS, 2)};

export const featureRegistry: readonly FeatureRegistryEntry[] = ${JSON.stringify(registry, ENTRY_KEYS, 2)};
`;

writeFileSync(REGISTRY_PATH, contents, 'utf8');

console.warn(`Wrote ${String(registry.length)} registry entries from BCD ${bcd.__meta.version}.`);
