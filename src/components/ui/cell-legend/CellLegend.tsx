import { cx } from '@utils';
import { For } from 'solid-js';

import { CELL_CLASSES, CELL_PILL } from '../support-cell/utils/supportCellUtils';

import { LEGEND_ENTRIES } from './utils/cellLegendUtils';

import type { JSX } from 'solid-js';

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
