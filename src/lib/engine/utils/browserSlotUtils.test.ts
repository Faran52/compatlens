import {
  describe,
  expect,
  it,
} from 'vitest';

import { EDGE_LEGACY_SLOT } from '../constants';

import { bcdIdOf, slotsOf } from './browserSlotUtils';

describe('bcdIdOf', () => {
  it('reads Edge Legacy from the same compatibility data as Edge', () => {
    expect(bcdIdOf(EDGE_LEGACY_SLOT)).toBe('edge');
  });

  it('leaves every other slot as its own BCD browser', () => {
    expect(bcdIdOf('safari_ios')).toBe('safari_ios');
  });
});

describe('slotsOf', () => {
  it('returns only the slots the target defines', () => {
    expect(slotsOf({ chrome: '120', safari: '17' })).toEqual(['chrome', 'safari']);
  });

  it('returns them in the fixed engine-family order, not the order given', () => {
    expect(slotsOf({ safari: '17', chrome: '120', firefox: '122' }))
      .toEqual(['chrome', 'firefox', 'safari']);
  });

  it('includes the Edge Legacy slot when it is targeted', () => {
    expect(slotsOf({ [EDGE_LEGACY_SLOT]: '18' })).toEqual([EDGE_LEGACY_SLOT]);
  });

  it('returns nothing for an empty target', () => {
    expect(slotsOf({})).toEqual([]);
  });
});
