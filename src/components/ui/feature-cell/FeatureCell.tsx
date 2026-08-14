import { cx } from '@utils';

import { locationLabelFor, servedLabelFor } from '@engine';

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
        'left-0 min-w-52 pl-1.5 sticky z-1 border-l-2 py-1 pr-2 text-left',
        // The sticky cell paints its own background, so it has to opt into the row's selection too.
        props.selected
          ? 'border-accent bg-surface-selected'
          : 'border-transparent bg-canvas',
      )}
      data-selected={props.selected ? 'true' : 'false'}
    >
      <div class="flex flex-wrap items-center gap-2">
        <button
          // No handler: the row above owns the click, and this is what a keyboard can reach.
          class="font-semibold cursor-pointer text-left"
          type="button"
        >
          {props.occurrence.name}
        </button>
        <SeverityChip risk={props.occurrence.risk} verified={props.occurrence.verified} />
      </div>
      <div class="mt-0.5 flex flex-wrap items-center gap-2">
        <code class="rounded-sm text-xs bg-surface-raised px-1 font-mono">
          {props.occurrence.syntax}
        </code>
        <span
          class="font-mono text-[10px] text-text-muted"
          title={servedLabelFor(props.occurrence.location)}
        >
          {locationLabelFor(props.occurrence.location)}
        </span>
      </div>
    </td>
  );
};
