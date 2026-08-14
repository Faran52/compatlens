// Mirrors every BCD browser of type desktop or mobile; the generator fails if the two drift.
export type BrowserId
  = | 'chrome'
    | 'edge'
    | 'firefox'
    | 'safari'
    | 'opera'
    | 'ie'
    | 'chrome_android'
    | 'firefox_android'
    | 'safari_ios'
    | 'samsunginternet_android'
    | 'opera_android'
    | 'webview_android'
    | 'webview_ios';

export type BrowserSlotId = BrowserId | 'edge_legacy';

// Severity only. Whether the data is trustworthy is a separate axis, never folded into this.
export type RiskLevel = 'breaks' | 'degrades';

export type EngineId = 'Blink' | 'Gecko' | 'WebKit' | 'EdgeHTML' | 'Trident' | 'Presto';

export type EngineGroup = 'Chromium Engine' | 'Gecko Engine' | 'WebKit Engine' | 'Legacy Engine';

export type ResourceKind = 'html' | 'css';

// 'source' is the served bytes, with real line numbers; 'rendered' is the live DOM.
export type ResourceView = 'source' | 'rendered';

export type BaselineStatus = 'widely' | 'newly' | 'limited';

export type DetectorKind
  = | 'html-element'
    | 'html-attribute'
    | 'css-property'
    | 'css-selector'
    | 'css-at-rule'
    | 'css-value';

// Partial: a slot with no release inside the chosen window is not a target at all.
export type BrowserTarget = Readonly<Partial<Record<BrowserSlotId, string>>>;

// Every browser present, unlike BrowserTarget: used where a starting version must always exist.
export type BrowserVersions = Readonly<Record<BrowserSlotId, string>>;

export type BrowserNames = Readonly<Record<BrowserSlotId, string>>;

export type AgeWindowYears = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

// Which engine a browser shipped from a given version onwards; Edge and Opera both switched.
export interface EngineRun {
  engine: EngineId;
  from: string;
}

export interface DetectorDefinition {
  id: string;
  name: string;
  kind: DetectorKind;
  syntax: string;
  bcdPath: string;
  webFeatureId: string;
  defaultRisk: RiskLevel;
  fallback: string;
}

export interface DataVersion {
  bcd: string;
  webFeatures: string;
  generatedAt: string;
}

export interface FeatureRegistryEntry extends DetectorDefinition {
  baseline: BaselineStatus;
  baselineDate?: string;
  mdnUrl: string;
  support: Readonly<Partial<Record<BrowserId, string>>>;
  dataVersion: DataVersion;
}

export interface ResourceInput {
  kind: ResourceKind;
  url: string;
  content: string;
  view?: ResourceView;
}

// path is a tree address such as "html>body>div:nth-of-type(2)", stable across both views.
export interface SourceLocation {
  url: string;
  line?: number;
  column?: number;
  view?: ResourceView;
  path?: string;
}

export interface DetectedFeature {
  featureId: string;
  location: SourceLocation;
}

// Emitted for every targeted slot, not only the failing ones, so a pass can be shown as a pass.
export interface BrowserImpact {
  slot: BrowserSlotId;
  targetVersion: string;
  supportedFrom?: string;
  supported: boolean;
}

export interface Finding {
  id: string;
  featureId: string;
  name: string;
  kind: DetectorKind;
  sourceKind: ResourceKind;
  syntax: string;
  risk: RiskLevel;
  verified: boolean;
  // false when BCD gives no plain version, so support could not be confirmed
  fallback: string;
  mdnUrl: string;
  baseline: BaselineStatus;
  location: SourceLocation;
  impacts: readonly BrowserImpact[];
}

export interface ModernizationRule {
  id: string;
  kind: DetectorKind;
  syntax: string;
  replacementId: string;
  advice: string;
}

export interface SyntaxDefinition {
  id: string;
  kind: DetectorKind;
  syntax: string;
}

export interface Suggestion {
  id: string;
  ruleId: string;
  syntax: string;
  advice: string;
  name: string;
  replacementSyntax: string;
  mdnUrl: string;
  baselineDate?: string;
  location: SourceLocation;
}

interface ResourceCounts {
  total: number;
  parsed: number;
  failed: number;
}

interface CoverageCounts {
  mappedDetections: number;
  registryFeatures: number;
}

export interface AnalysisReport {
  findings: readonly Finding[];
  suggestions: readonly Suggestion[];
  resources: ResourceCounts;
  coverage: CoverageCounts;
  warnings: readonly string[];
  durationMs: number;
}

// Capture metadata the extension layer knows and the engine deliberately does not.
export interface CaptureContext {
  route: string;
  at: string;
}

export interface Occurrence extends Finding {
  route: string;
  firstSeen: string;
}

export interface SessionReport {
  occurrences: readonly Occurrence[];
  suggestions: readonly Suggestion[];
  routes: readonly string[];
  resources: ResourceCounts;
  coverage: CoverageCounts;
  warnings: readonly string[];
  watching: boolean; // false until the page confirms the observer is installed
  capped: boolean; // a hit cap is reported, never silently truncated
}
