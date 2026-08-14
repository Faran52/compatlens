import {
  fireEvent,
  render,
  screen,
} from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { DataGrid } from './DataGrid';

import type { DataGridProps, GridColumn } from './utils/dataGridUtils';

interface Row {
  id: string;
  name: string;
}

const rows: readonly Row[] = [{ id: 'a', name: 'alpha' }, { id: 'b', name: 'beta' }];

const columns: readonly GridColumn[] = [
  { key: 'chrome', group: 'Chromium', label: 'Chrome', sublabel: '≥ 121' },
  { key: 'edge', group: 'Chromium', label: 'Edge', sublabel: '≥ 121' },
  { key: 'firefox', group: 'Gecko', label: 'Firefox', sublabel: '≥ 122' },
];

const rowOf = (name: string): HTMLElement => {
  const row = screen.getByText(name).closest('tr');

  if (row === null) {
    throw new Error(`${name} is not in a row`);
  }

  return row;
};

const renderGrid = (overrides: Partial<DataGridProps<Row>> = {}) => {
  const props: DataGridProps<Row> = {
    lead: 'Feature',
    groups: [
      { key: 'Chromium', label: 'Chromium', span: 2 },
      { key: 'Gecko', label: 'Gecko', span: 1 },
    ],
    columns,
    totalsLabel: 'Failing',
    sections: [{ key: 'breaks', label: 'Breaks (2)', rows }],
    selected: () => {
      return false;
    },
    onSort: vi.fn(),
    onSelect: vi.fn(),
    totalCell: (column) => {
      return `0 of ${String(column.key.length)}`;
    },
    leadCell: (row, selected) => {
      return <td data-selected={selected ? 'true' : 'false'}>{row.name}</td>;
    },
    cell: (row, column) => {
      return <td>{`${row.id}-${column.key}`}</td>;
    },
    ...overrides,
  };

  render(() => {
    return (
      <DataGrid
        cell={props.cell}
        columns={props.columns}
        groups={props.groups}
        lead={props.lead}
        leadCell={props.leadCell}
        onSelect={props.onSelect}
        onSort={props.onSort}
        sections={props.sections}
        selected={props.selected}
        totalCell={props.totalCell}
        totalsLabel={props.totalsLabel}
      />
    );
  });

  return props;
};

describe('DataGrid', () => {
  it('spans a group header across the columns it covers', () => {
    renderGrid();

    expect(screen.getByText('Chromium').closest('th')?.getAttribute('colspan')).toBe('2');
    expect(screen.getByText('Gecko').closest('th')?.getAttribute('colspan')).toBe('1');
  });

  it('leaves the group row out entirely when there are no groups', () => {
    renderGrid({ groups: [] });

    expect(screen.queryByText('Chromium')).toBeNull();
  });

  it('keeps a column heading distinguishable from the group above it', () => {
    renderGrid();

    const heading = screen.getByText('Chrome').closest('th');

    expect(heading?.getAttribute('data-column')).toBe('chrome');
    expect(heading?.getAttribute('data-group')).toBeNull();
  });

  it('sorts by the lead column when its heading is pressed', () => {
    const props = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Feature' }));

    expect(props.onSort).toHaveBeenCalledWith('lead');
  });

  it('sorts by a column when its heading is pressed', () => {
    const props = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Edge' }));

    expect(props.onSort).toHaveBeenCalledWith('edge');
  });

  it('spans a section heading across every column and the lead', () => {
    renderGrid();

    expect(screen.getByText('Breaks (2)').getAttribute('colspan')).toBe('4');
  });

  it('picks a row that was clicked', () => {
    const props = renderGrid();

    fireEvent.click(screen.getByText('alpha'));

    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it.each([['Enter'], [' ']])('picks a row with %s from the keyboard', (key: string) => {
    const props = renderGrid();

    fireEvent.keyDown(rowOf('beta'), { key });

    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it('leaves other keys to whatever the grid is scrolling inside', () => {
    const props = renderGrid();

    fireEvent.keyDown(rowOf('beta'), { key: 'ArrowDown' });

    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('tells the lead cell whether its row is selected', () => {
    renderGrid({
      selected: (row) => {
        return row.id === 'b';
      },
    });

    expect(screen.getByText('beta').getAttribute('data-selected')).toBe('true');
    expect(screen.getByText('alpha').getAttribute('data-selected')).toBe('false');
  });

  it('marks the selected row for assistive technology', () => {
    renderGrid({
      selected: (row) => {
        return row.id === 'b';
      },
    });

    expect(rowOf('beta').getAttribute('aria-selected')).toBe('true');
  });
});
