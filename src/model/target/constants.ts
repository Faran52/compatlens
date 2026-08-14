import type { BrowserTarget } from '@engine';

// A historic cutoff must resolve identically in future reports.
export const BASELINE_2022_TARGET: BrowserTarget = {
  chrome: '108',
  firefox: '108',
  safari: '16',
  safari_ios: '16',
};
