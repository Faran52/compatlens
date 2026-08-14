import { CheckList } from '@components/ui';

import { FilterRail } from './FilterRail';

import type { CheckListRow } from '@components/ui';
import type { BrowserSlotId } from '@engine';
import type { JSX } from 'solid-js';
import type { RailInput } from '../utils/railUtils';

interface FilterBodyProps {
  busy: boolean;
  severityRows: readonly CheckListRow[];
  rail: RailInput;
  labelOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
  allChecked: boolean;
  onToggleAll: () => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
}

export const FilterBody = (props: FilterBodyProps): JSX.Element => {
  return (
    <div aria-busy={props.busy} class="aria-busy:pointer-events-none aria-busy:opacity-50">
      <div class="p-2">
        <CheckList heading="Severity" rows={props.severityRows} />
      </div>
      <FilterRail
        allChecked={props.allChecked}
        labelOf={props.labelOf}
        onToggleAll={props.onToggleAll}
        onToggleSlot={props.onToggleSlot}
        rail={props.rail}
        retiredOf={props.retiredOf}
      />
    </div>
  );
};
