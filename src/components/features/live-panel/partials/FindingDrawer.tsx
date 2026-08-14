import {
  SeverityChip,
  Sheet,
  supportCellFor,
} from '@components/ui';
import { locationLabelFor } from '@engine';
import { For, Show } from 'solid-js';

import type { BrowserSlotId, Occurrence } from '@engine';
import type { JSX } from 'solid-js';

interface FindingDrawerProps {
  occurrence: Occurrence | null;
  labelOf: (slot: BrowserSlotId) => string;
  onClose: () => void;
}

export const FindingDrawer = (props: FindingDrawerProps): JSX.Element => {
  return (
    <Show when={props.occurrence}>
      {(occurrence) => {
        return (
          <Sheet
            badges={<SeverityChip risk={occurrence().risk} verified={occurrence().verified} />}
            closeLabel="Close"
            onClose={props.onClose}
            side="bottom"
            subtitle={`${occurrence().syntax} · ${locationLabelFor(occurrence().location)}`}
            title={occurrence().name}
          >
            <div class="min-w-52 flex-1 rounded bg-surface-raised p-2">
              <b class="mb-1 block">What users see</b>
              {occurrence().fallback}
            </div>
            <div class="min-w-52 flex-1 rounded bg-surface-raised p-2">
              <b class="mb-1 block">Support</b>
              <For each={occurrence().impacts}>
                {(impact) => {
                  return (
                    <div data-slot={impact.slot}>
                      {`${props.labelOf(impact.slot)}: ${supportCellFor(impact).label}`}
                    </div>
                  );
                }}
              </For>
            </div>
            <div class="min-w-52 flex-1 rounded bg-surface-raised p-2">
              <b class="mb-1 block">Reference</b>
              <a href={occurrence().mdnUrl} rel="noreferrer noopener" target="_blank">
                MDN documentation
              </a>
            </div>
          </Sheet>
        );
      }}
    </Show>
  );
};
