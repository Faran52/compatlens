import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  AGE_WINDOW_YEARS_RANGE,
  BROWSER_IDS,
  BROWSER_SLOT_IDS,
  DEFAULT_BROWSER_SLOTS,
  EDGE_LEGACY_SLOT,
  ENGINE_GROUP_ORDER,
  ENGINE_GROUPS,
  RISK_ORDER,
} from './constants';

describe('BROWSER_SLOT_IDS', () => {
  it('carries every BCD browser plus the Edge Legacy slot', () => {
    expect(BROWSER_SLOT_IDS).toHaveLength(BROWSER_IDS.length + 1);
    expect(BROWSER_SLOT_IDS).toContain(EDGE_LEGACY_SLOT);
  });

  it('names each slot once', () => {
    expect(new Set(BROWSER_SLOT_IDS).size).toBe(BROWSER_SLOT_IDS.length);
  });

  it('groups engine families together so collapsed columns stay adjacent', () => {
    const chromium = BROWSER_SLOT_IDS.indexOf('chrome_android');
    const gecko = BROWSER_SLOT_IDS.indexOf('firefox');
    const webkit = BROWSER_SLOT_IDS.indexOf('safari');

    expect(chromium).toBeLessThan(gecko);
    expect(gecko).toBeLessThan(webkit);
  });
});

describe('DEFAULT_BROWSER_SLOTS', () => {
  it('targets the four evergreen engines and leaves the rest opt-in', () => {
    expect(DEFAULT_BROWSER_SLOTS).toEqual(['chrome', 'firefox', 'safari', 'safari_ios']);
  });

  it('names only slots the engine knows', () => {
    expect(DEFAULT_BROWSER_SLOTS.every((slot) => {
      return BROWSER_SLOT_IDS.includes(slot);
    })).toBe(true);
  });
});

describe('AGE_WINDOW_YEARS_RANGE', () => {
  it('offers every year from one to fifteen in order', () => {
    expect(AGE_WINDOW_YEARS_RANGE).toHaveLength(15);
    expect(AGE_WINDOW_YEARS_RANGE[0]).toBe(1);
    expect(AGE_WINDOW_YEARS_RANGE[14]).toBe(15);
  });
});

describe('ENGINE_GROUPS', () => {
  it('collapses every engine that stopped moving into one legacy group', () => {
    expect(ENGINE_GROUPS.EdgeHTML).toBe('Legacy Engine');
    expect(ENGINE_GROUPS.Trident).toBe('Legacy Engine');
    expect(ENGINE_GROUPS.Presto).toBe('Legacy Engine');
  });

  it('keeps the three living engines apart', () => {
    expect(new Set([ENGINE_GROUPS.Blink, ENGINE_GROUPS.Gecko, ENGINE_GROUPS.WebKit]).size).toBe(3);
  });

  it('maps every engine to a listed group', () => {
    expect(Object.values(ENGINE_GROUPS).every((group) => {
      return ENGINE_GROUP_ORDER.includes(group);
    })).toBe(true);
  });
});

describe('RISK_ORDER', () => {
  it('sorts what breaks ahead of what merely degrades', () => {
    expect(RISK_ORDER.breaks).toBeLessThan(RISK_ORDER.degrades);
  });
});
