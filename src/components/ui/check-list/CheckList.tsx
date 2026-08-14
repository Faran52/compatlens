import { Index, Show } from 'solid-js';

import { cx } from '@utils';

import type { JSX } from 'solid-js';

interface CheckListCount {
  value: number;
  noun: string;
}

export interface CheckListRow {
  label: string;
  checked: boolean;
  active: boolean;
  count?: CheckListCount | undefined; // omitted where the grid already reports the same number
  // `| undefined` explicitly, because a builder passes the field through whether or not it has a value, and
  // `exactOptionalPropertyTypes` tells those two cases apart.
  badge?: string | undefined;
  meta?: string | undefined; // short enough to sit beside the label without squeezing it
  note?: string | undefined; // a sentence, so it gets its own line rather than crushing the label
  onToggle: () => void;
}

interface CheckListProps {
  heading: string;
  rows: readonly CheckListRow[];
}

// A bare number in a narrow column says nothing, so the reason for it travels with it.
const countTitleFor = (count: CheckListCount): string => {
  return `${String(count.value)} ${count.noun}`;
};

export const CheckList = (props: CheckListProps): JSX.Element => {
  return (
    <Show when={props.rows.length > 0}>
      <h4 class="tracking-wide mt-3 text-[11px] text-text-muted uppercase">{props.heading}</h4>
      <Index each={props.rows}>
        {(row) => {
          return (
            <label
              class="rounded-sm py-0.5 block cursor-pointer px-1"
              data-active={row().active ? 'true' : 'false'}
            >
              <span class="gap-1.5 flex items-center">
                <input
                  checked={row().checked}
                  onChange={() => {
                    row().onToggle();
                  }}
                  type="checkbox"
                />
                <span class="min-w-0 flex-1 truncate">{row().label}</span>
                <Show when={row().badge}>
                  {(badge) => {
                    return (
                      <span
                        class={cx(
                          'px-1.5 shrink-0 rounded-full bg-unverified-surface',
                          `
                            font-semibold text-[10px] whitespace-nowrap
                            text-unverified
                          `,
                        )}
                      >
                        {badge()}
                      </span>
                    );
                  }}
                </Show>
                <Show when={row().meta}>
                  {(meta) => {
                    return (
                      <span class="
                        shrink-0 text-[10px] whitespace-nowrap text-text-muted
                      "
                      >
                        {meta()}
                      </span>
                    );
                  }}
                </Show>
                <Show when={row().count}>
                  {(count) => {
                    return (
                      <span
                        class="text-xs shrink-0 text-text-muted tabular-nums"
                        title={countTitleFor(count())}
                      >
                        {count().value}
                      </span>
                    );
                  }}
                </Show>
              </span>
              <Show when={row().note}>
                {(note) => {
                  return <span class="pl-6 block text-[10px] text-text-muted">{note()}</span>;
                }}
              </Show>
            </label>
          );
        }}
      </Index>
    </Show>
  );
};
