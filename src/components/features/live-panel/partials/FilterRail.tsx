import { CheckList } from '@components/ui';
import { ENGINE_GROUP_ORDER } from '@engine';
import { cx } from '@utils';
import { For } from 'solid-js';

import { bulkToggleLabelFor, slotCheckRowsFor } from '../utils/railUtils';

import type { BrowserSlotId, EngineGroup } from '@engine';
import type { JSX } from 'solid-js';
import type { RailInput } from '../utils/railUtils';

interface FilterRailProps {
  rail: RailInput;
  labelOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
  onToggleSlot: (slot: BrowserSlotId) => void;
  allChecked: boolean;
  onToggleAll: () => void;
}

export const FilterRail = (props: FilterRailProps): JSX.Element => {
  return (
    <div class="p-2">
      <div class="flex items-baseline gap-2">
        <h3 class="text-[11px] tracking-wide text-text-muted uppercase">Browsers</h3>
        <button
          class={cx(
            'ml-auto cursor-pointer rounded-md border border-hairline px-1.5 py-0.5',
            'text-[11px] text-text-muted hover:border-accent hover:text-accent',
          )}
          onClick={props.onToggleAll}
          type="button"
        >
          {bulkToggleLabelFor(props.allChecked)}
        </button>
      </div>
      <p class="mb-1 text-xs text-text-muted">
        Checking a browser adds it to your target list and gives it a column in the grid. Each row
        shows the version you are targeting.
      </p>
      <For each={ENGINE_GROUP_ORDER}>
        {(group: EngineGroup) => {
          return (
            <CheckList
              heading={group}
              rows={slotCheckRowsFor({
                labelOf: props.labelOf,
                onToggle: props.onToggleSlot,
                rail: props.rail,
                retiredOf: props.retiredOf,
              }, group)}
            />
          );
        }}
      </For>
    </div>
  );
};
