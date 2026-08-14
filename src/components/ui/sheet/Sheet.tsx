import { onMount, Show } from 'solid-js';

import { cx } from '@utils';

import {
  closeSheet,
  openerFor,
  openSheet,
  wireSheetDismissal,
} from './utils/sheetUtils';

import type { ExitDirection } from '@utils';
import type { JSX } from 'solid-js';
import type { SheetFocusable } from './utils/sheetUtils';

type SheetSide = 'bottom' | 'left';

interface SheetVariant {
  modal: boolean;
  exit: ExitDirection;
  sheet: string;
  shell: string;
  header: string;
  body: string;
}

interface SheetProps {
  side: SheetSide;
  title: string;
  closeLabel: string;
  id?: string;
  opener?: HTMLElement | undefined; // where focus goes on close, when the caller holds a ref to it
  subtitle?: string;
  badges?: JSX.Element;
  onClose: () => void;
  children: JSX.Element;
}

// The bottom sheet rises inside the panel and leaves the grid clickable, so only the left one is modal.
const SHEET_VARIANTS: Readonly<Record<SheetSide, SheetVariant>> = {
  bottom: {
    modal: false,
    exit: 'down',
    sheet: cx(
      'inset-x-0 bottom-0 m-0 p-0 absolute z-10 max-h-[60%] w-auto max-w-none',
      `
        border-x-0 border-t border-b-0 border-hairline bg-surface text-text
        shadow-(--shadow)
      `,
      'motion-safe:animate-sheet',
    ),
    shell: 'flex max-h-full flex-col',
    header: 'flex flex-wrap items-baseline gap-2 bg-surface px-3 pt-3 pb-2',
    body: 'flex min-h-0 flex-wrap gap-3 overflow-auto px-3 pb-3',
  },
  left: {
    modal: true,
    exit: 'left',
    sheet: cx(
      'm-0 p-0 h-full max-h-full w-[min(320px,85vw)] max-w-none',
      `
        border-y-0 border-r border-l-0 border-hairline bg-transparent
        shadow-(--shadow)
      `,
      `
        backdrop:bg-canvas/70
        motion-safe:animate-filter-menu
        dark:backdrop:bg-canvas/80
      `,
    ),
    shell: 'flex h-full flex-col bg-surface text-text',
    header: 'flex items-center border-b border-hairline p-2',
    body: 'min-h-0 overflow-auto',
  },
};

export const Sheet = (props: SheetProps): JSX.Element => {
  let sheet: HTMLDialogElement | undefined;
  let closeButton: HTMLButtonElement | undefined;
  let opener: SheetFocusable | undefined;

  const variant = (): SheetVariant => {
    return SHEET_VARIANTS[props.side];
  };

  const close = async (): Promise<void> => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    await closeSheet(sheet, variant().exit, reducedMotion, opener);
    props.onClose();
  };

  onMount(() => {
    // Read before the sheet takes focus, so closing can hand it back to whatever opened this.
    opener = openerFor(props.opener, document.activeElement);
    openSheet(sheet, closeButton, variant().modal);

    wireSheetDismissal(sheet, () => {
      void close();
    });
  });

  return (
    <dialog
      aria-label={props.title}
      class={variant().sheet}
      id={props.id}
      open={!variant().modal}
      ref={sheet}
    >
      <div class={variant().shell}>
        <div class={variant().header}>
          <h2 class="text-sm font-semibold">{props.title}</h2>
          <Show when={props.subtitle}>
            {(subtitle) => {
              return <span class="text-xs font-mono text-text-muted">{subtitle()}</span>;
            }}
          </Show>
          {props.badges}
          <button
            aria-label={props.closeLabel}
            class="
              rounded-sm ml-auto cursor-pointer border border-hairline
              bg-surface-raised px-2
            "
            onClick={() => {
              void close();
            }}
            ref={closeButton}
            type="button"
          >
            Close
          </button>
        </div>
        <div class={variant().body}>{props.children}</div>
      </div>
    </dialog>
  );
};
