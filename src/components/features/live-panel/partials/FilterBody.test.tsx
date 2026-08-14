import { createSignal } from 'solid-js';
import { render, screen } from '@solidjs/testing-library';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { FilterBody } from './FilterBody';

import type { CheckListRow } from '@components/ui';
import type { BrowserSlotId } from '@engine';
import type { RailInput } from '../utils/railUtils';

const rail = (): RailInput => {
  return {
    target: { chrome: '121' },
    selected: new Set<BrowserSlotId>(['chrome']),
    groupOf: () => {
      return 'Chromium Engine';
    },
    dormantReason: () => {
      return 'no release in 4 years';
    },
  };
};

const severityRows: readonly CheckListRow[] = [
  {
    label: 'Breaks',
    checked: true,
    active: true,
    onToggle: vi.fn(),
  },
];

const renderBody = (initiallyBusy = false) => {
  const [busy, setBusy] = createSignal(initiallyBusy);

  render(() => {
    return (
      <FilterBody
        allChecked={false}
        busy={busy()}
        labelOf={(slot) => {
          return slot;
        }}
        onToggleAll={vi.fn()}
        onToggleSlot={vi.fn()}
        rail={rail()}
        retiredOf={() => {
          return undefined;
        }}
        severityRows={severityRows}
      />
    );
  });

  return setBusy;
};

describe('FilterBody', () => {
  it('offers severity before the browsers it filters within', () => {
    renderBody();

    const headings = screen.getAllByRole('heading');

    expect(headings[0].textContent).toBe('Severity');
    expect(headings[1].textContent).toBe('Browsers');
  });

  it('lists the browsers it was handed', () => {
    renderBody();

    expect(screen.getByText('chrome')).toBeInstanceOf(HTMLElement);
  });

  it('marks itself busy and refuses clicks while the panel is connecting', () => {
    const setBusy = renderBody();

    expect(document.querySelector('[aria-busy="true"]')).toBeNull();

    setBusy(true);

    expect(document.querySelector('[aria-busy="true"]')).toBeInstanceOf(HTMLElement);
  });
});
