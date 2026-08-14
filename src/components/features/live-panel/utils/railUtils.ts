import { BROWSER_SLOT_IDS } from '@engine';

import type { CheckListRow } from '@components/ui';
import type {
  BrowserSlotId,
  BrowserTarget,
  EngineGroup,
} from '@engine';

export interface RailInput {
  target: BrowserTarget;
  selected: ReadonlySet<BrowserSlotId>;
  groupOf: (slot: BrowserSlotId) => EngineGroup;
  dormantReason: (slot: BrowserSlotId) => string;
}

export interface SlotCheckInput {
  rail: RailInput;
  labelOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
  onToggle: (slot: BrowserSlotId) => void;
}

// Checked but with no release in the window is not a browser anything can be reported against.
export const activeSlotsFor = (
  target: BrowserTarget,
  selected: ReadonlySet<BrowserSlotId>,
): readonly BrowserSlotId[] => {
  return BROWSER_SLOT_IDS.filter((slot) => {
    return selected.has(slot) && target[slot] !== undefined;
  });
};

export const bulkToggleLabelFor = (allChecked: boolean): string => {
  return allChecked ? 'None' : 'All';
};

export const everySlotChecked = (selected: ReadonlySet<BrowserSlotId>): boolean => {
  return BROWSER_SLOT_IDS.every((slot) => {
    return selected.has(slot);
  });
};

export const bulkSlotsFor = (allChecked: boolean): ReadonlySet<BrowserSlotId> => {
  return new Set(allChecked ? [] : BROWSER_SLOT_IDS);
};

// Ticking a browser selects it for good; the age window only decides whether it is active today.
export const slotCheckRowsFor = (
  input: SlotCheckInput,
  group: EngineGroup,
): readonly CheckListRow[] => {
  return BROWSER_SLOT_IDS.filter((slot) => {
    return input.rail.groupOf(slot) === group;
  }).map((slot): CheckListRow => {
    const retired = input.retiredOf(slot);
    const version = input.rail.target[slot];
    // No count here: the grid's totals row already reports how many findings fail on each browser.
    const row = {
      label: input.labelOf(slot),
      active: false,
      badge: retired === undefined ? undefined : `retired ${retired}`,
      onToggle: () => {
        input.onToggle(slot);
      },
    };

    if (!input.rail.selected.has(slot)) {
      return { ...row, checked: false };
    }

    // Pinned version and dormancy reason are built where each is known, so neither is re-tested.
    return version === undefined
      ? { ...row, checked: true, note: input.rail.dormantReason(slot) }
      : {
          ...row,
          checked: true,
          active: true,
          meta: `≥ ${version}`,
        };
  });
};
