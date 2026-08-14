import { locationLabelFor } from '@engine';
import { cx } from '@utils';

import { SeverityChip } from '../severity-chip/SeverityChip';

import type { Occurrence } from '@engine';
import type { JSX } from 'solid-js';

interface FeatureCellProps {
  occurrence: Occurrence;
  selected: boolean;
}

export const FeatureCell = (props: FeatureCellProps): JSX.Element => {
  return (
    <td
      class={cx(
        'sticky left-0 z-1 min-w-[13rem] border-l-2 py-1 pr-2 pl-1.5 text-left',
        // The sticky cell paints its own background, so it has to opt into the row's selection too.
        props.selected ? 'border-accent bg-surface-selected' : 'border-transparent bg-canvas',
      )}
      data-selected={props.selected ? 'true' : 'false'}
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold">{props.occurrence.name}</span>
        <SeverityChip risk={props.occurrence.risk} verified={props.occurrence.verified} />
      </div>
      <div class="mt-0.5 flex flex-wrap items-center gap-2">
        <code class="rounded bg-surface-raised px-1 font-mono text-xs">
          {props.occurrence.syntax}
        </code>
        <span class="font-mono text-[10px] text-text-muted">
          {locationLabelFor(props.occurrence.location)}
        </span>
      </div>
    </td>
  );
};
