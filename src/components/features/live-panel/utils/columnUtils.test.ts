import { bcdIdOf, BROWSER_SLOT_IDS } from '@engine';
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  columnsFor,
  engineSpansFor,
  groupForSlot,
} from './columnUtils';

import type { BrowserSlotId, EngineRun } from '@engine';

const runs: Readonly<Record<string, readonly EngineRun[]>> = {
  chrome: [{ engine: 'WebKit', from: '1' }, { engine: 'Blink', from: '28' }],
  edge: [{ engine: 'EdgeHTML', from: '12' }, { engine: 'Blink', from: '79' }],
  chrome_android: [{ engine: 'Blink', from: '18' }],
  firefox: [{ engine: 'Gecko', from: '1' }],
  safari: [{ engine: 'WebKit', from: '1' }],
  ie: [{ engine: 'Trident', from: '8' }],
};

const input = (
  target: Record<string, string>,
  selected: readonly BrowserSlotId[] = BROWSER_SLOT_IDS,
) => {
  return {
    target,
    selected: new Set(selected),
    runs,
    bcdIdOf,
  };
};

const slotsOf = (target: Record<string, string>, selected?: readonly BrowserSlotId[]) => {
  return columnsFor(input(target, selected)).map((column) => {
    return column.slot;
  });
};

describe('groupForSlot', () => {
  it('reads Edge as Chromium at a modern version', () => {
    expect(groupForSlot('edge', input({ edge: '121' }))).toBe('Chromium Engine');
  });

  it('reads Edge as legacy below the Blink switchover', () => {
    expect(groupForSlot('edge', input({ edge: '18' }))).toBe('Legacy Engine');
  });

  it('reads the Edge Legacy slot from Edge data at its pinned version', () => {
    expect(groupForSlot('edge_legacy', input({ edge_legacy: '18' }))).toBe('Legacy Engine');
  });

  it('keeps Edge Legacy legacy even when it is not targeted', () => {
    expect(groupForSlot('edge_legacy', input({}))).toBe('Legacy Engine');
  });

  it('falls back to legacy when no engine is recorded that far back', () => {
    expect(groupForSlot('chrome', input({ chrome: '0' }))).toBe('Legacy Engine');
  });

  it('groups an untargeted browser by the engine it ships today', () => {
    expect(groupForSlot('edge', input({}))).toBe('Chromium Engine');
  });

  it('treats a browser with no recorded runs as legacy', () => {
    expect(groupForSlot('opera', input({ opera: '100' }))).toBe('Legacy Engine');
  });
});

describe('columnsFor', () => {
  it('gives every checked browser its own column', () => {
    expect(slotsOf({ chrome: '121', edge: '121', firefox: '122' }))
      .toEqual(['chrome', 'edge', 'firefox']);
  });

  it('leaves out a browser the preset pins but nobody checked', () => {
    expect(slotsOf({ chrome: '121', edge: '121' }, ['chrome'])).toEqual(['chrome']);
  });

  it('leaves out a checked browser with no release in the window', () => {
    expect(slotsOf({ chrome: '121' }, ['chrome', 'edge'])).toEqual(['chrome']);
  });

  it('keeps browsers of one engine together so the order matches the rail', () => {
    expect(slotsOf({ firefox: '122', chrome: '121', chrome_android: '121' }))
      .toEqual(['chrome', 'chrome_android', 'firefox']);
  });

  it('orders engines with the living ones before the legacy group', () => {
    expect(columnsFor(input({ chrome: '121', ie: '11', safari: '17' })).map((column) => {
      return column.group;
    })).toEqual(['Chromium Engine', 'WebKit Engine', 'Legacy Engine']);
  });

  it('has no columns at all when nothing is checked', () => {
    expect(slotsOf({ chrome: '121', firefox: '122' }, [])).toEqual([]);
  });
});

describe('engineSpansFor', () => {
  const spansOf = (target: Record<string, string>) => {
    return engineSpansFor(columnsFor(input(target)));
  };

  it('spans one header across every column of the same engine', () => {
    expect(spansOf({ chrome: '121', chrome_android: '121', firefox: '122' })).toEqual([
      { group: 'Chromium Engine', span: 2 },
      { group: 'Gecko Engine', span: 1 },
    ]);
  });

  it('gives a lone browser a span of one rather than skipping its engine', () => {
    expect(spansOf({ firefox: '122' })).toEqual([{ group: 'Gecko Engine', span: 1 }]);
  });

  it('spans nothing when there are no columns', () => {
    expect(engineSpansFor([])).toEqual([]);
  });

  it('counts each engine once even when three browsers share it', () => {
    expect(spansOf({ chrome: '121', edge: '121', chrome_android: '121' })).toEqual([
      { group: 'Chromium Engine', span: 3 },
    ]);
  });
});
