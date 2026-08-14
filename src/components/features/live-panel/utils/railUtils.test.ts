import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { BROWSER_SLOT_IDS } from '@engine';

import {
  activeSlotsFor,
  bulkSlotsFor,
  bulkToggleLabelFor,
  everySlotChecked,
  slotCheckRowsFor,
} from './railUtils';

import type { BrowserSlotId } from '@engine';
import type { RailInput, SlotCheckInput } from './railUtils';

const input = (overrides: Partial<RailInput> = {}): RailInput => {
  return {
    target: { chrome: '121' },
    selected: new Set<BrowserSlotId>(['chrome']),
    groupOf: (slot) => {
      return slot === 'chrome' || slot === 'edge' ? 'Chromium Engine' : 'Gecko Engine';
    },
    dormantReason: () => {
      return 'no release in 4 years';
    },
    ...overrides,
  };
};

const checkInput = (overrides: Partial<SlotCheckInput> = {}): SlotCheckInput => {
  return {
    rail: input(),
    labelOf: (slot) => {
      return slot === 'chrome' ? 'Chrome' : slot;
    },
    retiredOf: (slot) => {
      return slot === 'edge' ? '2022' : undefined;
    },
    onToggle: vi.fn(),
    ...overrides,
  };
};

describe('slotCheckRowsFor', () => {
  it('names each browser and says whether it is being checked', () => {
    const rows = slotCheckRowsFor(checkInput(), 'Chromium Engine');

    expect(rows[0]).toMatchObject({
      label: 'Chrome',
      checked: true,
      active: true,
    });
  });

  it('lists only the browsers in the group asked for', () => {
    expect(slotCheckRowsFor(checkInput(), 'Chromium Engine').map((row) => {
      return row.label;
    })).toEqual(['Chrome', 'edge']);
  });

  it('puts the pinned version beside the label, where it cannot squeeze it', () => {
    const [chrome] = slotCheckRowsFor(checkInput(), 'Chromium Engine');

    expect(chrome.meta).toBe('≥ 121');
    expect(chrome.note).toBeUndefined();
  });

  it('claims no count of its own, since the grid column already reports that number', () => {
    const rows = slotCheckRowsFor(checkInput(), 'Chromium Engine');

    expect(rows[0]?.count).toBeUndefined();
    expect(rows[1]?.count).toBeUndefined();
  });

  it('gives a dormant browser its reason on its own line, and no version', () => {
    const rows = slotCheckRowsFor(checkInput({
      rail: input({ target: {}, selected: new Set<BrowserSlotId>(['chrome']) }),
    }), 'Chromium Engine');

    expect(rows[0]).toMatchObject({ checked: true, active: false, note: 'no release in 4 years' });
    expect(rows[0]?.meta).toBeUndefined();
  });

  it('says nothing about a browser that was never checked', () => {
    const [, edge] = slotCheckRowsFor(checkInput(), 'Chromium Engine');

    expect(edge).toMatchObject({ checked: false, active: false });
    expect(edge.note).toBeUndefined();
    expect(edge.meta).toBeUndefined();
  });

  it('badges a retired engine and leaves a live one unbadged', () => {
    const rows = slotCheckRowsFor(checkInput(), 'Chromium Engine');

    expect(rows[1]?.badge).toBe('retired 2022');
    expect(rows[0]?.badge).toBeUndefined();
  });

  it('toggles the browser the row belongs to', () => {
    const onToggle = vi.fn();

    slotCheckRowsFor(checkInput({ onToggle }), 'Chromium Engine')[1]?.onToggle();

    expect(onToggle).toHaveBeenCalledWith('edge');
  });
});

describe('activeSlotsFor', () => {
  it('keeps a browser that was checked and has a release in the window', () => {
    expect(activeSlotsFor({ chrome: '121', edge: '121' }, new Set(['chrome', 'edge'])))
      .toEqual(['chrome', 'edge']);
  });

  it('drops a browser the preset pins but nobody checked', () => {
    expect(activeSlotsFor({ chrome: '121', edge: '121' }, new Set(['chrome']))).toEqual(['chrome']);
  });

  it('drops a checked browser with no release in the window', () => {
    expect(activeSlotsFor({ chrome: '121' }, new Set(['chrome', 'edge']))).toEqual(['chrome']);
  });
});

describe('bulkToggleLabelFor', () => {
  it('offers to check them all while any is unchecked', () => {
    expect(bulkToggleLabelFor(false)).toBe('All');
  });

  it('offers to clear them once every one is checked', () => {
    expect(bulkToggleLabelFor(true)).toBe('None');
  });
});

describe('everySlotChecked', () => {
  it('is true only when no browser is left out', () => {
    expect(everySlotChecked(new Set(BROWSER_SLOT_IDS))).toBe(true);
  });

  it('is false while one browser is still unchecked', () => {
    expect(everySlotChecked(new Set(BROWSER_SLOT_IDS.slice(1)))).toBe(false);
  });

  it('is false when nothing is checked at all', () => {
    expect(everySlotChecked(new Set<BrowserSlotId>())).toBe(false);
  });
});

describe('bulkSlotsFor', () => {
  it('checks every browser when none of them were', () => {
    expect(bulkSlotsFor(false).size).toBe(BROWSER_SLOT_IDS.length);
  });

  it('clears them all when they were all checked', () => {
    expect(bulkSlotsFor(true).size).toBe(0);
  });
});
