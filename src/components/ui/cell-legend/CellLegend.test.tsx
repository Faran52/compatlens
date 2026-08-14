import { render, screen } from '@solidjs/testing-library';

import {
  describe,
  expect,
  it,
} from 'vitest';

import { CellLegend } from './CellLegend';

describe('CellLegend', () => {
  it('explains each state a cell can render', () => {
    render(() => {
      return <CellLegend />;
    });

    expect(screen.getByText('Shipped in this version, which your target covers.'))
      .toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Shipped only from this version, newer than your target.'))
      .toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Never shipped in this browser.')).toBeInstanceOf(HTMLElement);
  });

  it('samples the literal text a cell shows, so a reader can match one to the other', () => {
    render(() => {
      return <CellLegend />;
    });

    expect(screen.getByText('76').getAttribute('data-state')).toBe('supported');
    expect(screen.getByText('from 18').getAttribute('data-state')).toBe('too-late');
    expect(screen.getByText('never').getAttribute('data-state')).toBe('never');
  });

  it('pairs every sample with its meaning', () => {
    render(() => {
      return <CellLegend />;
    });

    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(screen.getAllByRole('definition')).toHaveLength(3);
  });
});
