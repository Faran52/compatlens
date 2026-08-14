import { ENGINE_GROUPS } from '../constants';

import { compareVersions } from './supportUtils';

import type {
  EngineGroup,
  EngineId,
  EngineRun,
} from '../types';

// Edge before 79 was EdgeHTML and Opera before 15 was Presto, so the engine follows the version.
export const engineAt = (runs: readonly EngineRun[], version: string): EngineId | null => {
  let current: EngineId | null = null;

  for (const run of runs) {
    if (compareVersions(version, run.from) >= 0) {
      current = run.engine;
    }
  }

  return current;
};

export const groupOf = (engine: EngineId): EngineGroup => {
  return ENGINE_GROUPS[engine];
};
