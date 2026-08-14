export {
  AGE_WINDOW_YEARS_RANGE,
  BROWSER_IDS,
  BROWSER_SLOT_IDS,
  DEFAULT_BROWSER_SLOTS,
  EDGE_LEGACY_SLOT,
  ENGINE_GROUP_ORDER,
  ENGINE_GROUPS,
  RISK_ORDER,
} from './constants';
export { analyzeResources } from './engine';
export type {
  AgeWindowYears,
  AnalysisReport,
  BaselineStatus,
  BrowserId,
  BrowserImpact,
  BrowserNames,
  BrowserSlotId,
  BrowserTarget,
  CaptureContext,
  DataVersion,
  DetectedFeature,
  DetectorDefinition,
  DetectorKind,
  EngineGroup,
  EngineId,
  EngineRun,
  FeatureRegistryEntry,
  Finding,
  ModernizationRule,
  Occurrence,
  ResourceInput,
  RiskLevel,
  SessionReport,
  Suggestion,
} from './types';
export { bcdIdOf } from './utils/browserSlotUtils';
export { engineAt } from './utils/engineUtils';
export { compareVersions } from './utils/supportUtils';
export { fileNameOf,
  locationLabelFor } from './utils/urlUtils';
