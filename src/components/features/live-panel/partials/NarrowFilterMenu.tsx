import { CheckList } from '@components/ui';
import { cx } from '@utils';
import {
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';

import { playFilterMenuExit } from '../utils/filterMenuUtils';

import { FilterRail } from './FilterRail';

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
}

export const NarrowFilterMenu = (props: NarrowFilterMenuProps): JSX.Element => {
  const [expanded, setExpanded] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  let dialog: HTMLDialogElement | undefined;
  let closeButton: HTMLButtonElement | undefined;

  const open = (): void => {
    dialog?.showModal();
    setExpanded(true);
    closeButton?.focus();
  };

  const close = async (): Promise<void> => {
    await playFilterMenuExit(dialog, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    dialog?.close();
    setExpanded(false);
    trigger?.focus();
  };

  onMount(() => {
    const wideViewport = window.matchMedia('(min-width: 720px)');
    const closeAtWideViewport = (event: MediaQueryListEvent): void => {
      if (event.matches && dialog?.open === true) {
        void close();
      }
    };

    wideViewport.addEventListener('change', closeAtWideViewport);
    onCleanup(() => {
      wideViewport.removeEventListener('change', closeAtWideViewport);
    });
  });

  return (
    <>
      <button
        aria-controls="filter-menu"
        aria-expanded={expanded()}
        aria-label="Open filters"
        class={cx(
          'cursor-pointer rounded border border-hairline bg-surface-raised px-2',
          'hover:border-accent focus-visible:border-accent min-[720px]:hidden',
        )}
        disabled={props.busy}
        onClick={open}
        ref={trigger}
        type="button"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <dialog
        aria-labelledby="filter-menu-title"
        class={cx(
          'm-0 h-full max-h-full w-[min(320px,85vw)] max-w-none p-0',
          'border-y-0 border-r border-l-0 border-hairline bg-transparent shadow-[var(--shadow)]',
          'motion-safe:animate-filter-menu backdrop:bg-canvas/70 dark:backdrop:bg-canvas/80 min-[720px]:hidden',
        )}
        id="filter-menu"
        onCancel={(event) => {
          event.preventDefault();
          void close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            void close();
          }
        }}
        ref={dialog}
      >
        <div
          aria-busy={props.busy}
          class={cx(
            'flex h-full flex-col bg-surface',
            props.busy ? 'pointer-events-none opacity-50' : '',
          )}
        >
          <div class="flex items-center border-b border-hairline p-2">
            <h2 class="font-semibold" id="filter-menu-title">Filters</h2>
            <button
              aria-label="Close filters"
              class="ml-auto cursor-pointer rounded border border-hairline bg-surface-raised px-2"
              onClick={() => {
                void close();
              }}
              ref={closeButton}
              type="button"
            >
              Close
            </button>
          </div>
          <div class="overflow-auto">
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
        </div>
      </dialog>
    </>
  );
};
