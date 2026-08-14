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
          'text-xs font-semibold rounded-full px-2',
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
              class="
                text-xs font-semibold rounded-full bg-unverified-surface px-2
                text-unverified
              "
              data-unverified="true"
              title="Support is prefixed, flagged or partial, so no plain version exists."
            >
              unverified
            </span>
          )}
    </span>
  );
};
