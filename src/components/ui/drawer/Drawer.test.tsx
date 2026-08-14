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

import { Drawer } from './Drawer';

const renderDrawer = (onClose = vi.fn()) => {
  render(() => {
    return (
      <Drawer
        badges={<span>Breaks</span>}
        onClose={onClose}
        subtitle="css · site.css"
        title="Container queries"
      >
        <p>What users see</p>
      </Drawer>
    );
  });

  return onClose;
};

describe('Drawer', () => {
  it('heads the panel with what is open and where it came from', () => {
    renderDrawer();

    expect(screen.getByRole('heading', { name: 'Container queries' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('css · site.css')).toBeInstanceOf(HTMLElement);
  });

  it('keeps badges the caller supplied beside the title', () => {
    renderDrawer();

    expect(screen.getByText('Breaks')).toBeInstanceOf(HTMLElement);
  });

  it('shows the body it was handed', () => {
    renderDrawer();

    expect(screen.getByText('What users see')).toBeInstanceOf(HTMLElement);
  });

  it('asks to close once the sheet has finished leaving', async () => {
    const onClose = renderDrawer(vi.fn());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
