import { EDGE_LEGACY_SLOT, engineAt } from '@engine';

import type { BrowserSlotId, EngineRun } from '@engine';

export interface RetiredInput {
  target: Readonly<Partial<Record<BrowserSlotId, string>>>;
  runs: Readonly<Record<string, readonly EngineRun[]>>;
  retired: Readonly<Partial<Record<string, string>>>;
  bcdIdOf: (slot: BrowserSlotId) => string;
}

// A browser you are not targeting still ships the engine it ships; the badge is a fact about it.
export const retiredYearFor = (slot: BrowserSlotId, input: RetiredInput): string | undefined => {
  if (slot === EDGE_LEGACY_SLOT) {
    return input.retired.EdgeHTML;
  }

  const runs = input.runs[input.bcdIdOf(slot)] ?? [];
  const version = input.target[slot];
  const current = runs.length === 0 ? null : runs[runs.length - 1].engine;
  const engine = version === undefined ? current : engineAt(runs, version);

  return engine === null ? undefined : input.retired[engine];
};
