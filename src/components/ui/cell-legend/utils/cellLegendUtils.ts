import type { CellState } from '../../support-cell/utils/supportCellUtils';

interface LegendEntry {
  state: CellState;
  sample: string;
  meaning: string;
}

export const LEGEND_ENTRIES: readonly LegendEntry[] = [
  { state: 'supported', sample: '76', meaning: 'Shipped in this version, which your target covers.' },
  { state: 'too-late', sample: 'from 18', meaning: 'Shipped only from this version, newer than your target.' },
  { state: 'never', sample: 'never', meaning: 'Never shipped in this browser.' },
];
