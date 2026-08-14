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

import { FindingDrawer } from './FindingDrawer';

import type { Occurrence } from '@engine';

const occurrence = (overrides: Partial<Occurrence> = {}): Occurrence => {
  return {
    ...blockedFindingFixture,
    route: '/',
    firstSeen: 'now',
    impacts: [
      { slot: 'chrome', targetVersion: '121', supportedFrom: '76', supported: true },
      { slot: 'safari', targetVersion: '17', supportedFrom: '18', supported: false },
      { slot: 'ie', targetVersion: '11', supported: false },
    ],
    ...overrides,
  };
};

const renderDrawer = (value: Occurrence | null, onClose = vi.fn()) => {
  render(() => {
    return (
      <FindingDrawer
        labelOf={(slot) => {
          return slot;
        }}
        occurrence={value}
        onClose={onClose}
      />
    );
  });

  return onClose;
};

describe('FindingDrawer', () => {
  it('shows nothing at all when no finding is selected', () => {
    const { container } = render(() => {
      return (
        <FindingDrawer
          labelOf={(slot) => {
            return slot;
          }}
          occurrence={null}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.textContent).toBe('');
  });

  it('names the finding and what users would see', () => {
    renderDrawer(occurrence());

    expect(screen.getByText(blockedFindingFixture.name)).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(blockedFindingFixture.fallback)).toBeInstanceOf(HTMLElement);
  });

  it('lists support for every targeted browser, passing or failing', () => {
    renderDrawer(occurrence());

    expect(screen.getByText('chrome: 76')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('safari: from 18')).toBeInstanceOf(HTMLElement);
  });

  it('distinguishes never shipped from shipped too late', () => {
    renderDrawer(occurrence());

    expect(screen.getByText('ie: never')).toBeInstanceOf(HTMLElement);
  });

  it('links the reference without leaking the opener', () => {
    renderDrawer(occurrence());

    expect(screen.getByRole('link').getAttribute('rel')).toBe('noreferrer noopener');
  });

  it('asks to close once the sheet has finished leaving', async () => {
    const onClose = renderDrawer(occurrence(), vi.fn());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
