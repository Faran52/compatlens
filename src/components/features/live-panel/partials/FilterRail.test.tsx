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

import { FilterRail } from './FilterRail';

import type { BrowserSlotId } from '@engine';
import type { RailInput } from '../utils/railUtils';

interface BulkHandlers {
  allChecked?: boolean;
  onToggleAll?: () => void;
}

const rail = (overrides: Partial<RailInput> = {}): RailInput => {
  return {
    target: { chrome: '121' },
    selected: new Set<BrowserSlotId>(['chrome']),
    groupOf: (slot) => {
      return slot === 'ie' ? 'Legacy Engine' : 'Chromium Engine';
    },
    dormantReason: () => {
      return 'no release in 4 years';
    },
    ...overrides,
  };
};

const renderRail = (
  overrides: Partial<RailInput> = {},
  onToggleSlot = vi.fn(),
  bulk: BulkHandlers = {},
) => {
  render(() => {
    return (
      <FilterRail
        labelOf={(slot) => {
          return slot === 'ie' ? 'IE 11' : slot;
        }}
        allChecked={bulk.allChecked ?? false}
        onToggleAll={bulk.onToggleAll ?? vi.fn()}
        onToggleSlot={onToggleSlot}
        rail={rail(overrides)}
        retiredOf={(slot) => {
          return slot === 'ie' ? '2022' : undefined;
        }}
      />
    );
  });

  return onToggleSlot;
};

describe('FilterRail', () => {
  it('groups browsers under the engine they run', () => {
    renderRail();

    expect(screen.getByText('Chromium Engine')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Legacy Engine')).toBeInstanceOf(HTMLElement);
  });

  it('shows the version an active browser is pinned to', () => {
    renderRail();

    expect(screen.getByText('≥ 121')).toBeInstanceOf(HTMLElement);
  });

  it('badges a retired engine separately from its support', () => {
    renderRail();

    expect(screen.getByText('retired 2022')).toBeInstanceOf(HTMLElement);
  });

  it('keeps a dormant browser listed and says why it is paused', () => {
    renderRail({ target: {}, selected: new Set<BrowserSlotId>(['chrome']) });

    expect(screen.getByText('no release in 4 years')).toBeInstanceOf(HTMLElement);
  });

  it('asks to toggle the browser that was clicked', () => {
    const onToggle = renderRail({}, vi.fn());

    fireEvent.click(screen.getAllByRole('checkbox')[0]);

    expect(onToggle).toHaveBeenCalledWith('chrome');
  });

  it('marks which rows are actually being checked', () => {
    renderRail();

    expect(screen.getByText('chrome').closest('label')?.getAttribute('data-active')).toBe('true');
  });
});

describe('FilterRail bulk control', () => {
  it('offers to check every browser while any is still unchecked', () => {
    const onToggleAll = vi.fn();

    renderRail({}, vi.fn(), { onToggleAll });
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('offers to clear them once every browser is checked', () => {
    const onToggleAll = vi.fn();

    renderRail({}, vi.fn(), { allChecked: true, onToggleAll });
    fireEvent.click(screen.getByRole('button', { name: 'None' }));

    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('shows one control, not two competing ones', () => {
    renderRail();

    expect(screen.queryByRole('button', { name: 'None' })).toBeNull();
  });
});
