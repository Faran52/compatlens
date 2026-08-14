import {
  describe,
  expect,
  it,
} from 'vitest';

import { supportCellFor } from './supportCellUtils';

describe('supportCellFor', () => {
  it('shows the version support started at when the target is above it', () => {
    expect(supportCellFor({
      slot: 'chrome',
      targetVersion: '121',
      supportedFrom: '76',
      supported: true,
    })).toEqual({ state: 'supported', label: '76' });
  });

  it('says support starts later when the target predates it', () => {
    expect(supportCellFor({
      slot: 'safari',
      targetVersion: '17.2',
      supportedFrom: '18',
      supported: false,
    })).toEqual({ state: 'too-late', label: 'from 18' });
  });

  it('says never when no version ever shipped it', () => {
    expect(supportCellFor({ slot: 'ie', targetVersion: '11', supported: false }))
      .toEqual({ state: 'never', label: 'never' });
  });
});
