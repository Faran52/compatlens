import { blockedFindingFixture } from '@mocks';
import { render, screen } from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { FeatureCell } from './FeatureCell';

import type { Occurrence } from '@engine';

const occurrence = (overrides: Partial<Occurrence> = {}): Occurrence => {
  return { ...blockedFindingFixture, route: '/', firstSeen: 'now', ...overrides };
};

const renderCell = (value: Occurrence, selected = false) => {
  render(() => {
    return (
      <table>
        <tbody>
          <tr>
            <FeatureCell occurrence={value} selected={selected} />
          </tr>
        </tbody>
      </table>
    );
  });
};

describe('FeatureCell', () => {
  it('names the feature and the syntax that triggered it', () => {
    renderCell(occurrence({ name: 'anchor-name property', syntax: 'anchor-name' }));

    expect(screen.getByText('anchor-name property')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('anchor-name')).toBeInstanceOf(HTMLElement);
  });

  it('shows the file and line, not the whole url', () => {
    renderCell(occurrence({ location: { url: 'https://x.test/deep/app.css', line: 31 } }));

    expect(screen.getByText('app.css:31')).toBeInstanceOf(HTMLElement);
  });

  it('shows the file alone when there is no line', () => {
    renderCell(occurrence({ location: { url: 'https://x.test/app.css' } }));

    expect(screen.getByText('app.css')).toBeInstanceOf(HTMLElement);
  });

  it('carries the severity beside the name', () => {
    renderCell(occurrence({ risk: 'breaks', verified: true }));

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
  });

  it('marks an unverified finding without hiding its severity', () => {
    renderCell(occurrence({ risk: 'breaks', verified: false }));

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('unverified')).toBeInstanceOf(HTMLElement);
  });

  it('joins the selected row rather than keeping its own background', () => {
    const value = occurrence();

    renderCell(value, true);

    expect(screen.getByText(value.name).closest('td')?.getAttribute('data-selected')).toBe('true');
  });

  it('stays out of the way when its row is not selected', () => {
    const value = occurrence();

    renderCell(value);

    expect(screen.getByText(value.name).closest('td')?.getAttribute('data-selected')).toBe('false');
  });
});
