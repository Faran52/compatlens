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

export interface GridSection<Row> {
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
  leadCell: (row: Row, selected: boolean) => JSX.Element;
  cell: (row: Row, column: GridColumn<Key>) => JSX.Element;
}

export const SORT_BY_LEAD = 'lead';

// Enter and Space pick a row; every other key belongs to whatever the grid is scrolling inside.
export const SELECTING_KEYS: readonly string[] = ['Enter', ' '];
