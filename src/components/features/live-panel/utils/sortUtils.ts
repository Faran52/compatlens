import { SORT_BY_LEAD } from '@components/ui';
import { BROWSER_SLOT_IDS, RISK_ORDER } from '@engine';

import type { BrowserSlotId, Occurrence } from '@engine';

export type SortKey = 'severity' | 'feature' | 'source' | BrowserSlotId;

const isBrowserSlot = (value: string): value is BrowserSlotId => {
  return BROWSER_SLOT_IDS.some((slot) => {
    return slot === value;
  });
};

const bySeverity = (left: Occurrence, right: Occurrence): number => {
  return RISK_ORDER[left.risk] - RISK_ORDER[right.risk];
};

const failsOn = (occurrence: Occurrence, slot: BrowserSlotId): number => {
  return occurrence.impacts.some((impact) => {
    return impact.slot === slot && !impact.supported;
  })
    ? 0
    : 1;
};

export const sortKeyFor = (key: string): SortKey => {
  if (key === SORT_BY_LEAD) {
    return 'feature';
  }

  return isBrowserSlot(key) ? key : 'severity';
};

export const compareOccurrences = (key: SortKey) => {
  return (left: Occurrence, right: Occurrence): number => {
    if (key === 'feature') {
      return left.name.localeCompare(right.name);
    }

    if (key === 'source') {
      return left.location.url.localeCompare(right.location.url)
        || (left.location.line ?? 0) - (right.location.line ?? 0);
    }

    if (key === 'severity') {
      return bySeverity(left, right) || left.name.localeCompare(right.name);
    }

    return failsOn(left, key) - failsOn(right, key)
      || bySeverity(left, right)
      || left.name.localeCompare(right.name);
  };
};
