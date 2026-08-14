import { cx } from '@utils';

import {
  CELL_CLASSES,
  CELL_PILL,
  supportCellFor,
} from './utils/supportCellUtils';

import type { BrowserImpact } from '@engine';
import type { JSX } from 'solid-js';

interface SupportCellProps {
  impact: BrowserImpact;
}

export const SupportCell = (props: SupportCellProps): JSX.Element => {
  return (
    <td class="p-1 text-center tabular-nums">
      <span
        class={cx(CELL_PILL, CELL_CLASSES[supportCellFor(props.impact).state])}
        data-state={supportCellFor(props.impact).state}
      >
        {supportCellFor(props.impact).label}
      </span>
    </td>
  );
};
