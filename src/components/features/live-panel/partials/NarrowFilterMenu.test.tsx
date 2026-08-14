import {
  fireEvent,
  render,
  screen,
  within,
} from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
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
  onWideClose: () => void;
  setBusy: (busy: boolean) => void;
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

const renderMenu = (initiallyBusy = false): MenuHandlers => {
  const [busy, setBusy] = createSignal(initiallyBusy);
  const handlers: MenuHandlers = {
    onToggleAll: vi.fn(),
    onToggleRisk: vi.fn(),
    onToggleSlot: vi.fn(),
    onWideClose: vi.fn(),
    setBusy,
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
        busy={busy()}
        labelOf={(slot) => {
          return slot;
        }}
        onToggleAll={handlers.onToggleAll}
        onToggleSlot={handlers.onToggleSlot}
        onWideClose={handlers.onWideClose}
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
  it('starts collapsed, naming no menu while there is none to name', () => {
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'Open filters' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });

  it('names the menu it controls once that menu is in the page', () => {
    renderMenu();

    const trigger = openMenu();

    expect(trigger.getAttribute('aria-controls')).toBe('filter-menu');
    expect(document.getElementById('filter-menu')).toBeInstanceOf(HTMLElement);
  });

  it('opens the named filter dialog and focuses its close control', () => {
    renderMenu();

    const trigger = openMenu();
    const close = screen.getByRole('button', { name: 'Close filters' });

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInstanceOf(HTMLDialogElement);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(close);
  });

  it('shows the same severity and browser filters the rail does', () => {
    renderMenu();
    openMenu();

    const dialog = within(screen.getByRole('dialog', { name: 'Filters' }));

    expect(dialog.getByRole('heading', { name: 'Severity' })).toBeInstanceOf(HTMLElement);
    expect(dialog.getByRole('heading', { name: 'Browsers' })).toBeInstanceOf(HTMLElement);
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

  it('blocks opening while connecting', () => {
    renderMenu(true);

    const trigger = screen.getByRole('button', { name: 'Open filters' });

    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    expect(trigger.hasAttribute('disabled')).toBe(true);
  });

  it('marks the filter content busy when connecting starts under an open menu', () => {
    const handlers = renderMenu();

    openMenu();
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();

    handlers.setBusy(true);

    expect(document.querySelector('[aria-busy="true"]')).toBeInstanceOf(HTMLElement);
  });
});
