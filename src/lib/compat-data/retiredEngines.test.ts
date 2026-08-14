import {
  describe,
  expect,
  it,
} from 'vitest';

import { ENGINE_GROUPS } from '@engine';

import { retiredEngines } from './retiredEngines';

import type { EngineId } from '@engine';

const LIVING: readonly EngineId[] = ['Blink', 'Gecko', 'WebKit'];

const RETIRED: readonly EngineId[] = ['EdgeHTML', 'Presto', 'Trident'];

describe('retiredEngines', () => {
  it('records only engines that stopped shipping', () => {
    expect(Object.keys(retiredEngines).sort((left, right) => {
      return left.localeCompare(right);
    })).toEqual([...RETIRED]);
  });

  it('never marks a living engine retired', () => {
    for (const engine of LIVING) {
      expect(retiredEngines[engine]).toBeUndefined();
    }
  });

  it('only retires engines that sit in the legacy group', () => {
    for (const engine of RETIRED) {
      expect(ENGINE_GROUPS[engine]).toBe('Legacy Engine');
    }
  });
});
