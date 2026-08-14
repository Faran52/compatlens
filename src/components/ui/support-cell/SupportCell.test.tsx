import { render, screen } from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { SupportCell } from './SupportCell';

const renderCell = (impact: Parameters<typeof SupportCell>[0]['impact']) => {
  render(() => {
    return (
      <table>
        <tbody>
          <tr><SupportCell impact={impact} /></tr>
        </tbody>
      </table>
    );
  });
};

describe('SupportCell', () => {
  it('shows the version support started at', () => {
    renderCell({ slot: 'chrome', targetVersion: '121', supportedFrom: '76', supported: true });

    expect(screen.getByText('76')).toBeInstanceOf(HTMLElement);
  });

  it('says support arrives later than the target', () => {
    renderCell({ slot: 'safari', targetVersion: '17.2', supportedFrom: '18', supported: false });

    expect(screen.getByText('from 18')).toBeInstanceOf(HTMLElement);
  });

  it('distinguishes never shipped from shipped too late', () => {
    renderCell({ slot: 'ie', targetVersion: '11', supported: false });

    expect(screen.getByText('never')).toBeInstanceOf(HTMLElement);
  });

  it('exposes the state as a data hook for styling and tests', () => {
    renderCell({ slot: 'ie', targetVersion: '11', supported: false });

    expect(screen.getByText('never').getAttribute('data-state')).toBe('never');
  });
});
