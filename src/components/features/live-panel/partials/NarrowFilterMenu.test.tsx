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

import { NarrowFilterMenu } from './NarrowFilterMenu';

import type { CheckListRow } from '@components/ui';
import type { BrowserSlotId, EngineGroup } from '@engine';
import type { RailInput } from '../utils/railUtils';

interface MenuHandlers {
  onToggleAll: () => void;
  onToggleRisk: () => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
}

const groupOf = (slot: BrowserSlotId): EngineGroup => {
  if (slot === 'firefox' || slot === 'firefox_android') {
    return 'Gecko Engine';
  }

  if (slot === 'safari' || slot === 'safari_ios' || slot === 'webview_ios') {
    return 'WebKit Engine';
  }

  return slot === 'ie' || slot === 'edge_legacy' ? 'Legacy Engine' : 'Chromium Engine';
};

const rail = (): RailInput => {
  return {
    target: { chrome: '121', firefox: '122' },
    selected: new Set<BrowserSlotId>(['chrome', 'firefox']),
    groupOf,
    dormantReason: () => {
      return 'no release in 4 years';
    },
  };
};

const renderMenu = (busy = false): MenuHandlers => {
  const handlers: MenuHandlers = {
    onToggleAll: vi.fn(),
    onToggleRisk: vi.fn(),
    onToggleSlot: vi.fn(),
  };
  const severityRows: readonly CheckListRow[] = [
    {
      label: 'Breaks',
      checked: true,
      active: true,
      onToggle: handlers.onToggleRisk,
    },
    {
      label: 'Degrades',
      checked: true,
      active: true,
      onToggle: handlers.onToggleRisk,
    },
  ];

  render(() => {
    return (
      <NarrowFilterMenu
        allChecked={false}
        busy={busy}
        labelOf={(slot) => {
          return slot;
        }}
        onToggleAll={handlers.onToggleAll}
        onToggleSlot={handlers.onToggleSlot}
        rail={rail()}
        retiredOf={() => {
          return undefined;
        }}
        severityRows={severityRows}
      />
    );
  });

  return handlers;
};

const openMenu = (): HTMLButtonElement => {
  const trigger = screen.getByRole('button', { name: 'Open filters' });

  if (!(trigger instanceof HTMLButtonElement)) {
    throw new Error('The filter menu trigger is not a button.');
  }

  fireEvent.click(trigger);

  return trigger;
};

describe('NarrowFilterMenu', () => {
  it('names the controlled menu and starts collapsed', () => {
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Open filters' });

    expect(trigger.getAttribute('aria-controls')).toBe('filter-menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the named filter dialog and focuses its close control', () => {
    renderMenu();

    const trigger = openMenu();
    const close = screen.getByRole('button', { name: 'Close filters' });

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInstanceOf(HTMLDialogElement);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(close);
  });

  it('shows the existing severity and browser filter groups', () => {
    renderMenu();
    openMenu();

    expect(screen.getByRole('heading', { name: 'Severity' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'Browsers' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'Chromium Engine' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'Gecko Engine' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'WebKit Engine' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('heading', { name: 'Legacy Engine' })).toBeInstanceOf(HTMLElement);
  });

  it('uses the shared browser and bulk callbacks', () => {
    const handlers = renderMenu();
    openMenu();

    const browser = screen.getByText('chrome').closest('label')?.querySelector('input');

    if (!(browser instanceof HTMLInputElement)) {
      throw new Error('The Chrome filter is not a checkbox.');
    }

    fireEvent.click(browser);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(handlers.onToggleSlot).toHaveBeenCalledWith('chrome');
    expect(handlers.onToggleAll).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    renderMenu();

    const trigger = openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Filters' });

    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from its close control and restores focus to the trigger', async () => {
    renderMenu();

    const trigger = openMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes only when a click lands on the dialog backdrop', async () => {
    renderMenu();

    const trigger = openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Filters' });

    fireEvent.click(screen.getByRole('heading', { name: 'Severity' }));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(dialog);

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it('blocks opening and marks the filter content busy while connecting', () => {
    renderMenu(true);

    const trigger = screen.getByRole('button', { name: 'Open filters' });

    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('[aria-busy="true"]')).toBeInstanceOf(HTMLElement);
  });
});
