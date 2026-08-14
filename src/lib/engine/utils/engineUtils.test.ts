import {
  describe,
  expect,
  it,
} from 'vitest';

import { engineAt, groupOf } from './engineUtils';

import type { EngineRun } from '../types';

const edge: readonly EngineRun[] = [
  { engine: 'EdgeHTML', from: '12' },
  { engine: 'Blink', from: '79' },
];

describe('engineAt', () => {
  it('reads Edge as EdgeHTML before the Blink switchover', () => {
    expect(engineAt(edge, '18')).toBe('EdgeHTML');
  });

  it('reads Edge as Blink from the switchover onwards', () => {
    expect(engineAt(edge, '79')).toBe('Blink');
    expect(engineAt(edge, '121')).toBe('Blink');
  });

  it('compares versions by segment, not as decimals', () => {
    expect(engineAt([{ engine: 'WebKit', from: '15.4' }], '15.10')).toBe('WebKit');
  });

  it('reports nothing for a version older than every recorded run', () => {
    expect(engineAt(edge, '11')).toBeNull();
  });

  it('reports nothing when no runs are recorded', () => {
    expect(engineAt([], '120')).toBeNull();
  });
});

describe('groupOf', () => {
  it('collapses every retired engine into the legacy group', () => {
    expect(groupOf('EdgeHTML')).toBe('Legacy Engine');
    expect(groupOf('Trident')).toBe('Legacy Engine');
    expect(groupOf('Presto')).toBe('Legacy Engine');
  });

  it('keeps the living engines apart', () => {
    expect(groupOf('Blink')).toBe('Chromium Engine');
    expect(groupOf('Gecko')).toBe('Gecko Engine');
    expect(groupOf('WebKit')).toBe('WebKit Engine');
  });
});
