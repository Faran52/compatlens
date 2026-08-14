import type {
  AgeWindowYears,
  BrowserId,
  BrowserSlotId,
  EngineGroup,
  EngineId,
  RiskLevel,
} from './types';

export const EDGE_LEGACY_SLOT = 'edge_legacy';

// Fixed order so impacts, support maps and exports stay comparable between runs.
export const BROWSER_IDS: readonly BrowserId[] = [
  'chrome',
  'edge',
  'firefox',
  'safari',
  'opera',
  'ie',
  'chrome_android',
  'firefox_android',
  'safari_ios',
  'samsunginternet_android',
  'opera_android',
  'webview_android',
  'webview_ios',
];

// Grouped by engine family so collapsed columns sit next to the browsers they aggregate.
export const BROWSER_SLOT_IDS: readonly BrowserSlotId[] = [
  'chrome',
  'edge',
  'opera',
  'chrome_android',
  'opera_android',
  'samsunginternet_android',
  'webview_android',
  'firefox',
  'firefox_android',
  'safari',
  'safari_ios',
  'webview_ios',
  'ie',
  EDGE_LEGACY_SLOT,
];

export const DEFAULT_BROWSER_SLOTS: readonly BrowserSlotId[] = [
  'chrome',
  'firefox',
  'safari',
  'safari_ios',
];

export const AGE_WINDOW_YEARS_RANGE: readonly AgeWindowYears[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

export const ENGINE_GROUPS: Readonly<Record<EngineId, EngineGroup>> = {
  Blink: 'Chromium Engine',
  Gecko: 'Gecko Engine',
  WebKit: 'WebKit Engine',
  EdgeHTML: 'Legacy Engine',
  Trident: 'Legacy Engine',
  Presto: 'Legacy Engine',
};

export const ENGINE_GROUP_ORDER: readonly EngineGroup[] = [
  'Chromium Engine',
  'Gecko Engine',
  'WebKit Engine',
  'Legacy Engine',
];

export const RISK_ORDER: Readonly<Record<RiskLevel, number>> = {
  breaks: 0,
  degrades: 1,
};
