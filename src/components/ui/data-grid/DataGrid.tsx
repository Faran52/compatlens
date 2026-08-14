import { cx } from '@utils';
import { For, Show } from 'solid-js';

import { SELECTING_KEYS, SORT_BY_LEAD } from './utils/dataGridUtils';

import type { JSX } from 'solid-js';
import type { DataGridProps } from './utils/dataGridUtils';

export const DataGrid = <Row, Key extends string>(props: DataGridProps<Row, Key>): JSX.Element => {
  return (
    <table class="w-full min-w-max border-separate border-spacing-0 text-xs">
      <thead>
        <Show when={props.groups.length > 0}>
          <tr>
            <td class="sticky left-0 z-2 bg-canvas" />
            <For each={props.groups}>
              {(group) => {
                return (
                  <th
                    class={cx(
                      'bg-canvas px-1 pt-1 pb-0.5 text-center',
                      'text-[10px] tracking-wide text-text-muted uppercase',
                    )}
                    colspan={group.span}
                    data-group={group.key}
                  >
                    <span class="block truncate border-b border-hairline pb-0.5">{group.label}</span>
                  </th>
                );
              }}
            </For>
          </tr>
        </Show>
        <tr>
          <th class="sticky top-0 left-0 z-3 bg-surface px-2 py-1 text-left">
            <button
              class="cursor-pointer text-[11px] tracking-wide text-text-muted uppercase"
              onClick={() => {
                props.onSort(SORT_BY_LEAD);
              }}
              type="button"
            >
              {props.lead}
            </button>
          </th>
          <For each={props.columns}>
            {(column) => {
              return (
                <th
                  class={cx(
                    'sticky top-0 z-2 w-16 min-w-16 bg-surface px-1 py-1',
                    'text-center font-semibold motion-safe:animate-reveal',
                  )}
                  data-column={column.key}
                  data-column-group={column.group}
                >
                  <button
                    class="w-full cursor-pointer truncate"
                    onClick={() => {
                      props.onSort(column.key);
                    }}
                    type="button"
                  >
                    {column.label}
                  </button>
                  <span class="block text-[10px] font-normal text-text-muted">{column.sublabel}</span>
                </th>
              );
            }}
          </For>
        </tr>
        <tr>
          <td
            class={cx(
              'sticky left-0 z-2 bg-surface-raised px-2 py-1',
              'text-[11px] font-semibold text-text-muted',
            )}
          >
            {props.totalsLabel}
          </td>
          <For each={props.columns}>
            {(column) => {
              return (
                <td
                  class={cx(
                    'bg-surface-raised px-1 py-1 text-center',
                    'text-[11px] font-semibold text-text-muted tabular-nums',
                  )}
                >
                  {props.totalCell(column)}
                </td>
              );
            }}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={props.sections}>
          {(section) => {
            return (
              <>
                <tr>
                  <td
                    class="bg-canvas px-2 pt-3 pb-1 font-semibold"
                    colspan={props.columns.length + 1}
                    data-section={section.key}
                  >
                    {section.label}
                  </td>
                </tr>
                <For each={section.rows}>
                  {(row) => {
                    return (
                      <tr
                        aria-selected={props.selected(row)}
                        class={props.selected(row) ? 'bg-surface-selected' : ''}
                        onClick={() => {
                          props.onSelect(row);
                        }}
                        onKeyDown={(event) => {
                          if (SELECTING_KEYS.includes(event.key)) {
                            event.preventDefault();
                            props.onSelect(row);
                          }
                        }}
                        tabindex="0"
                      >
                        {props.leadCell(row, props.selected(row))}
                        <For each={props.columns}>
                          {(column) => {
                            return props.cell(row, column);
                          }}
                        </For>
                      </tr>
                    );
                  }}
                </For>
              </>
            );
          }}
        </For>
      </tbody>
    </table>
  );
};
