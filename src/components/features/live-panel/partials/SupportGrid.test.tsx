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

import { blockedFindingFixture } from '@mocks';

import { bcdIdOf, BROWSER_SLOT_IDS } from '@engine';

import { SupportGrid } from './SupportGrid';

import type {
  BrowserSlotId,
  EngineRun,
  Occurrence,
} from '@engine';

const ALL = new Set(BROWSER_SLOT_IDS);

const runs: Readonly<Record<string, readonly EngineRun[]>> = {
  chrome: [{ engine: 'Blink', from: '28' }],
  edge: [{ engine: 'Blink', from: '79' }],
  firefox: [{ engine: 'Gecko', from: '1' }],
};

const occurrence = (overrides: Partial<Occurrence> = {}): Occurrence => {
  return {
    ...blockedFindingFixture,
    route: '/',
    firstSeen: 'now',
    impacts: [
      { slot: 'chrome', targetVersion: '121', supportedFrom: '76', supported: true },
      { slot: 'edge', targetVersion: '121', supportedFrom: '79', supported: true },
      { slot: 'firefox', targetVersion: '122', supportedFrom: '147', supported: false },
    ],
    ...overrides,
  };
};

const renderGrid = (
  selected: ReadonlySet<BrowserSlotId> = ALL,
  onSort = vi.fn(),
  occurrences: readonly Occurrence[] = [occurrence()],
) => {
  render(() => {
    return (
      <SupportGrid
        columns={{
          target: { chrome: '121', edge: '121', firefox: '122' },
          selected,
          runs,
          bcdIdOf,
        }}
        labelOf={(slot) => {
          return slot;
        }}
        occurrences={occurrences}
        onSelect={vi.fn()}
        onSort={onSort}
        risks={new Set(['breaks', 'degrades'])}
        selected={null}
        sort="severity"
      />
    );
  });

  return onSort;
};

describe('SupportGrid', () => {
  it('gives every checked browser its own column', () => {
    renderGrid();

    expect(screen.getByText('chrome')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('edge')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('firefox')).toBeInstanceOf(HTMLElement);
  });

  it('labels each run of columns with the engine they share', () => {
    renderGrid();

    const chromium = screen.getByText('Chromium Engine').closest('th');

    expect(chromium?.getAttribute('colspan')).toBe('2');
    expect(screen.getByText('Gecko Engine').closest('th')?.getAttribute('colspan')).toBe('1');
  });

  it('drops the column of a browser that was unchecked', () => {
    renderGrid(new Set(['chrome', 'firefox']));

    expect(screen.queryByText('edge')).toBeNull();
  });

  it('pins each column to the version it is judged against', () => {
    renderGrid();

    expect(screen.getByText('≥ 122')).toBeInstanceOf(HTMLElement);
  });

  it('sorts by the browser whose column heading was clicked', () => {
    const onSort = renderGrid();

    fireEvent.click(screen.getByText('edge'));

    expect(onSort).toHaveBeenCalledWith('edge');
  });

  it('counts how many findings each browser column is failing', () => {
    renderGrid();

    expect(screen.getAllByText('0 of 1').length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 1')).toBeInstanceOf(HTMLElement);
  });

  it('shows the version a browser shipped support in', () => {
    renderGrid();

    expect(screen.getByText('76')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('from 147')).toBeInstanceOf(HTMLElement);
  });

  it('leaves a cell blank when a targeted browser has no impact recorded', () => {
    renderGrid(ALL, vi.fn(), [occurrence({
      impacts: [{ slot: 'chrome', targetVersion: '121', supportedFrom: '76', supported: true }],
    })]);

    expect(screen.getByText('firefox')).toBeInstanceOf(HTMLElement);
  });

  it('names the feature in its own column', () => {
    renderGrid();

    expect(screen.getByText(blockedFindingFixture.name)).toBeInstanceOf(HTMLElement);
  });
});
