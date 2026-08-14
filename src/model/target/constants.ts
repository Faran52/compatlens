import type { BrowserTarget } from '@engine';

// Fixed, not derived: a historic cutoff must resolve the same way in any future report.
export const BASELINE_2022_TARGET: BrowserTarget = {
  chrome: '108',
  firefox: '108',
  safari: '16',
  safari_ios: '16',
};
