import { For } from 'solid-js';

import { cx } from '@utils';

import { CELL_CLASSES, CELL_PILL } from '../support-cell/utils/supportCellUtils';

import type { JSX } from 'solid-js';
import type { CellState } from '../support-cell/utils/supportCellUtils';

interface LegendEntry {
  state: CellState;
  sample: string;
  meaning: string;
}

const LEGEND_ENTRIES: readonly LegendEntry[] = [
  { state: 'supported', sample: '76', meaning: 'Shipped in this version, which your target covers.' },
  { state: 'too-late', sample: 'from 18', meaning: 'Shipped only from this version, newer than your target.' },
  { state: 'never', sample: 'never', meaning: 'Never shipped in this browser.' },
];

export const CellLegend = (): JSX.Element => {
  return (
    <dl class="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline px-2 py-1.5 text-[11px]">
      <For each={LEGEND_ENTRIES}>
        {(entry) => {
          return (
            <div class="flex items-center gap-1.5" data-legend={entry.state}>
              <dt
                class={cx(CELL_PILL, 'text-center tabular-nums', CELL_CLASSES[entry.state])}
                data-state={entry.state}
              >
                {entry.sample}
              </dt>
              <dd class="text-text-muted">{entry.meaning}</dd>
            </div>
          );
        }}
      </For>
    </dl>
  );
};
