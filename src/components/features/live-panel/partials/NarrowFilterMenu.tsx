import {
  createSignal,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';

import { createFilterMenu, cx } from '@utils';

import { Sheet } from '@components/ui';

import { FilterBody } from './FilterBody';

import type { CheckListRow } from '@components/ui';
import type { BrowserSlotId } from '@engine';
import type { JSX } from 'solid-js';
import type { RailInput } from '../utils/railUtils';

interface NarrowFilterMenuProps {
  busy: boolean;
  severityRows: readonly CheckListRow[];
  rail: RailInput;
  labelOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
  allChecked: boolean;
  onToggleAll: () => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
  onWideClose: () => void;
}

export const NarrowFilterMenu = (props: NarrowFilterMenuProps): JSX.Element => {
  const [expanded, setExpanded] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;

  const menu = createFilterMenu({
    expanded,
    setExpanded,
    onWideClose: () => {
      props.onWideClose();
    },
  });

  onMount(() => {
    const wideViewport = window.matchMedia('(min-width: 720px)');
    const closeAtWideViewport = (event: MediaQueryListEvent): void => {
      menu.closeAtWideViewport(event.matches);
    };

    wideViewport.addEventListener('change', closeAtWideViewport);
    onCleanup(() => {
      wideViewport.removeEventListener('change', closeAtWideViewport);
    });
  });

  return (
    <>
      <button
        // The sheet is mounted only while open, so naming it while closed would dangle.
        aria-controls={expanded() ? 'filter-menu' : undefined}
        aria-expanded={expanded()}
        aria-label="Open filters"
        class={cx(
          'cursor-pointer rounded border border-hairline bg-surface-raised px-2',
          'hover:border-accent focus-visible:border-accent min-[720px]:hidden',
        )}
        disabled={props.busy}
        onClick={menu.open}
        ref={trigger}
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <Show when={expanded()}>
        <Sheet
          closeLabel="Close filters"
          id="filter-menu"
          onClose={menu.close}
          opener={trigger}
          side="left"
          title="Filters"
        >
          <FilterBody
            allChecked={props.allChecked}
            busy={props.busy}
            labelOf={props.labelOf}
            onToggleAll={props.onToggleAll}
            onToggleSlot={props.onToggleSlot}
            rail={props.rail}
            retiredOf={props.retiredOf}
            severityRows={props.severityRows}
          />
        </Sheet>
      </Show>
    </>
  );
};
