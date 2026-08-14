import { cx } from '@utils';

import { RISK_LABELS } from '@engine';

import type { RiskLevel } from '@engine';
import type { JSX } from 'solid-js';

interface SeverityChipProps {
  risk: RiskLevel;
  verified: boolean;
}

// Severity and confidence are separate: unverified sits beside the label, never replaces it.
export const SeverityChip = (props: SeverityChipProps): JSX.Element => {
  return (
    <span class="inline-flex items-center gap-1">
      <span
        class={cx(
          'rounded-full px-2 text-xs font-semibold',
          props.risk === 'breaks'
            ? 'bg-breaks-surface text-breaks'
            : 'bg-degrades-surface text-degrades',
        )}
        data-severity={props.risk}
      >
        {RISK_LABELS[props.risk]}
      </span>
      {props.verified
        ? null
        : (
            <span
              class="rounded-full bg-unverified-surface px-2 text-xs font-semibold text-unverified"
              data-unverified="true"
              title="Support is prefixed, flagged or partial, so no plain version exists."
            >
              unverified
            </span>
          )}
    </span>
  );
};
