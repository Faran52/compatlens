import { cx } from '@utils';

import { playSheetExit } from './utils/drawerUtils';

import type { JSX } from 'solid-js';

interface DrawerProps {
  title: string;
  subtitle: string;
  badges: JSX.Element;
  onClose: () => void;
  children: JSX.Element;
}

export const Drawer = (props: DrawerProps): JSX.Element => {
  let sheet: HTMLDivElement | undefined;

  const close = async (): Promise<void> => {
    await playSheetExit(sheet, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    props.onClose();
  };

  return (
    <div
      aria-label={props.title}
      class={cx(
        'absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-auto p-3',
        'border-t border-hairline bg-surface shadow-[var(--shadow)]',
        'motion-safe:animate-sheet',
      )}
      ref={sheet}
      role="dialog"
    >
      <div class="mb-2 flex flex-wrap items-baseline gap-2 bg-surface">
        <h4 class="text-sm font-semibold">{props.title}</h4>
        <span class="font-mono text-xs text-text-muted">{props.subtitle}</span>
        {props.badges}
        <button
          class="ml-auto rounded border border-hairline bg-surface-raised px-2"
          onClick={() => {
            void close();
          }}
          type="button"
        >
          Close
        </button>
      </div>
      <div class="flex flex-wrap gap-3">{props.children}</div>
    </div>
  );
};
