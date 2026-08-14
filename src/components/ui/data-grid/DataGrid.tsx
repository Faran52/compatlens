import { For, Show } from 'solid-js';

import { cx } from '@utils';

import type { JSX } from 'solid-js';

export interface GridGroup {
  key: string;
  label: string;
  span: number;
}

export interface GridColumn<Key extends string = string> {
  key: Key;
  group: string;
  label: string;
  sublabel: string;
}

interface GridSection<Row> {
  key: string;
  label: string;
  rows: readonly Row[];
}

export interface DataGridProps<Row, Key extends string = string> {
  lead: string;
  groups: readonly GridGroup[];
  columns: readonly GridColumn<Key>[];
  totalsLabel: string;
  sections: readonly GridSection<Row>[];
  selected: (row: Row) => boolean;
  onSort: (key: string) => void;
  onSelect: (row: Row) => void;
  totalCell: (column: GridColumn<Key>) => string;
  // Takes no selected flag: reading one here would rebuild the cell, and its focus, on every pick.
  leadCell: (row: Row) => JSX.Element;
  cell: (row: Row, column: GridColumn<Key>) => JSX.Element;
}

export const SORT_BY_LEAD = 'lead';

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
                    <span class="sticky left-2 inline-block">{section.label}</span>
                  </td>
                </tr>
                <For each={section.rows}>
                  {(row) => {
                    return (
                      <tr
                        class={props.selected(row) ? 'bg-surface-selected' : ''}
                        data-selected={props.selected(row) ? 'true' : 'false'}
                        // A row click is mouse convenience; the lead cell's button is what announces it.
                        onClick={() => {
                          props.onSelect(row);
                        }}
                      >
                        {props.leadCell(row)}
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
