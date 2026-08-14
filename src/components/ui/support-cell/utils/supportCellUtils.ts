import type { BrowserImpact } from '@engine';

export type CellState = 'supported' | 'too-late' | 'never';

export interface SupportCell {
  state: CellState;
  label: string;
}

// On the pill, never the cell: a background on the cell merges with its neighbours into one slab.
export const CELL_PILL = 'inline-block rounded-md px-1.5 py-0.5 font-semibold whitespace-nowrap';

// Supported carries no surface: a grid where every passing cell is filled reads as noise.
export const CELL_CLASSES: Readonly<Record<CellState, string>> = {
  'supported': 'text-ok',
  'too-late': 'bg-breaks-surface text-breaks',
  'never': 'bg-unverified-surface text-unverified',
};

export const supportCellFor = (impact: BrowserImpact): SupportCell => {
  if (impact.supportedFrom === undefined) {
    return { state: 'never', label: 'never' };
  }

  if (impact.supported) {
    return { state: 'supported', label: impact.supportedFrom };
  }

  return { state: 'too-late', label: `from ${impact.supportedFrom}` };
};
