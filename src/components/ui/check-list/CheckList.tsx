import { cx } from '@utils';
import { For, Show } from 'solid-js';

import { countTitleFor } from './utils/checkListUtils';

import type { JSX } from 'solid-js';
import type { CheckListRow } from './utils/checkListUtils';

interface CheckListProps {
  heading: string;
  rows: readonly CheckListRow[];
}

export const CheckList = (props: CheckListProps): JSX.Element => {
  return (
    <Show when={props.rows.length > 0}>
      <h4 class="mt-3 text-[11px] tracking-wide text-text-muted uppercase">{props.heading}</h4>
      <For each={props.rows}>
        {(row) => {
          return (
            <label
              class="block cursor-pointer rounded px-1 py-0.5"
              data-active={row.active ? 'true' : 'false'}
            >
              <span class="flex items-center gap-1.5">
                <input
                  checked={row.checked}
                  onChange={() => {
                    row.onToggle();
                  }}
                  type="checkbox"
                />
                <span class="min-w-0 flex-1 truncate">{row.label}</span>
                <Show when={row.badge}>
                  {(badge) => {
                    return (
                      <span
                        class={cx(
                          'shrink-0 rounded-full bg-unverified-surface px-1.5',
                          'text-[10px] font-semibold whitespace-nowrap text-unverified',
                        )}
                      >
                        {badge()}
                      </span>
                    );
                  }}
                </Show>
                <Show when={row.meta}>
                  {(meta) => {
                    return (
                      <span class="shrink-0 text-[10px] whitespace-nowrap text-text-muted">
                        {meta()}
                      </span>
                    );
                  }}
                </Show>
                <Show when={row.count}>
                  {(count) => {
                    return (
                      <span
                        class="shrink-0 text-xs text-text-muted tabular-nums"
                        title={countTitleFor(count())}
                      >
                        {count().value}
                      </span>
                    );
                  }}
                </Show>
              </span>
              <Show when={row.note}>
                {(note) => {
                  return <span class="block pl-6 text-[10px] text-text-muted">{note()}</span>;
                }}
              </Show>
            </label>
          );
        }}
      </For>
    </Show>
  );
};
