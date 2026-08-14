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

import { Sheet } from './Sheet';

const renderBottomSheet = (onClose = vi.fn()) => {
  render(() => {
    return (
      <Sheet
        badges={<span>Breaks</span>}
        closeLabel="Close"
        onClose={onClose}
        side="bottom"
        subtitle="css · site.css"
        title="Container queries"
      >
        <p>What users see</p>
      </Sheet>
    );
  });

  return onClose;
};

const renderLeftSheet = (onClose = vi.fn()) => {
  render(() => {
    return (
      <Sheet closeLabel="Close filters" id="filter-menu" onClose={onClose} side="left" title="Filters">
        <p>Severity</p>
      </Sheet>
    );
  });

  return onClose;
};

describe('Sheet', () => {
  it('heads the sheet with what is open and where it came from', () => {
    renderBottomSheet();

    expect(screen.getByRole('heading', { name: 'Container queries' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('css · site.css')).toBeInstanceOf(HTMLElement);
  });

  it('keeps badges the caller supplied beside the title', () => {
    renderBottomSheet();

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
  });

  it('shows the body it was handed', () => {
    renderBottomSheet();

    expect(screen.getByText('What users see')).toBeInstanceOf(HTMLElement);
  });

  it('asks to close once the sheet has finished leaving', async () => {
    const onClose = renderBottomSheet(vi.fn());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('takes focus even when the sheet is not modal, so opening one is announced', () => {
    renderBottomSheet();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('names its own close control so two open sheets never share one', () => {
    renderLeftSheet();

    expect(screen.getByRole('button', { name: 'Close filters' })).toBeInstanceOf(HTMLElement);
  });

  it('opens a modal sheet and focuses the control that closes it', () => {
    renderLeftSheet();

    const dialog = screen.getByRole('dialog', { name: 'Filters' });

    expect(dialog).toBeInstanceOf(HTMLDialogElement);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close filters' }));
  });

  it('closes a modal sheet on Escape', async () => {
    const onClose = renderLeftSheet(vi.fn());

    fireEvent(screen.getByRole('dialog', { name: 'Filters' }), new Event('cancel', { cancelable: true }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes only when a click lands on the dialog backdrop', async () => {
    const onClose = renderLeftSheet(vi.fn());

    fireEvent.click(screen.getByText('Severity'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog', { name: 'Filters' }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
