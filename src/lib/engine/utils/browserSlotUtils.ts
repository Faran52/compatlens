import { BROWSER_SLOT_IDS, EDGE_LEGACY_SLOT } from '../constants';

import type {
  BrowserId,
  BrowserSlotId,
  BrowserTarget,
} from '../types';

// Edge Legacy is its own targetable slot but reads Edge's compatibility data.
export const bcdIdOf = (slot: BrowserSlotId): BrowserId => {
  if (slot === EDGE_LEGACY_SLOT) {
    return 'edge';
  }

  return slot;
};

export const slotsOf = (target: BrowserTarget): readonly BrowserSlotId[] => {
  return BROWSER_SLOT_IDS.filter((slot) => {
    return target[slot] !== undefined;
  });
};
