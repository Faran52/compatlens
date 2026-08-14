import { bcdIdOf, BROWSER_SLOT_IDS } from '@engine';
import { blockedFindingFixture } from '@mocks';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { LivePanel } from '../live-panel/LivePanel';

import type {
  BrowserSlotId,
  EngineRun,
  Occurrence,
  RiskLevel,
  SessionReport,
} from '@engine';

interface PanelFilterHandlers {
  onToggleRisk: (risk: RiskLevel) => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
}

const ALL = new Set(BROWSER_SLOT_IDS);

const runs: Readonly<Record<string, readonly EngineRun[]>> = {
  chrome: [{ engine: 'Blink', from: '28' }],
};

const occurrence: Occurrence = {
  ...blockedFindingFixture,
  route: '/products',
  firstSeen: 'now',
  impacts: [{ slot: 'chrome', targetVersion: '121', supportedFrom: '147', supported: false }],
};

const session = (overrides: Partial<SessionReport> = {}): SessionReport => {
  return {
    occurrences: [occurrence],
    suggestions: [],
    routes: ['/products'],
    resources: { total: 1, parsed: 1, failed: 0 },
    coverage: { mappedDetections: 1, registryFeatures: 34 },
    warnings: [],
    watching: true,
    capped: false,
    ...overrides,
  };
};

const renderPanel = (
  report: SessionReport = session(),
  handlers?: PanelFilterHandlers,
) => {
  render(() => {
    return (
      <LivePanel
        columns={{ target: { chrome: '121' }, selected: ALL, runs, bcdIdOf }}
        host="127.0.0.1:8765"
        labelOf={(slot) => {
          return slot;
        }}
        onSelectFinding={vi.fn()}
        onSelectTab={vi.fn()}
        onSort={vi.fn()}
        onToggleRisk={handlers?.onToggleRisk ?? vi.fn()}
        risks={new Set(['breaks', 'degrades'])}
        sort="severity"
        onChangeTheme={vi.fn()}
        allChecked={false}
        onToggleAll={vi.fn()}
        onResizeRail={vi.fn()}
        onToggleSlot={handlers?.onToggleSlot ?? vi.fn()}
        railWidth={240}
        rail={{
          target: { chrome: '121' },
          selected: new Set(['chrome']),
          groupOf: () => {
            return 'Chromium Engine';
          },
          dormantReason: () => {
            return 'paused';
          },
        }}
        retiredOf={() => {
          return undefined;
        }}
        selected={null}
        session={report}
        shortOf={(slot) => {
          return slot;
        }}
        target={{
          preset: 'widely',
          years: 4,
          browsers: 7,
          onChangePreset: () => {
            return undefined;
          },
          onChangeYears: () => {
            return undefined;
          },
        }}
        tab="findings"
        theme="system"
      />
    );
  });
};

describe('LivePanel', () => {
  it('says which page it is watching and how many routes it has seen', () => {
    renderPanel();

    expect(screen.getByText('127.0.0.1:8765')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText(/watching · 1 route · 1 of 1 read/u)).toBeInstanceOf(HTMLElement);
  });

  it('shows the grid once anything has been found', () => {
    renderPanel();

    expect(screen.getByText(blockedFindingFixture.name)).toBeInstanceOf(HTMLElement);
  });

  it('invites the developer to use the page when nothing has been found yet', () => {
    renderPanel(session({ occurrences: [] }));

    expect(screen.getByText(/Nothing to fix for this target yet/u)).toBeInstanceOf(HTMLElement);
  });

  it('says so when the finding limit was reached rather than truncating silently', () => {
    renderPanel(session({ capped: true }));

    expect(screen.getByText(/finding limit was reached/u)).toBeInstanceOf(HTMLElement);
  });

  it('keeps warnings after the empty findings state', () => {
    renderPanel(session({ occurrences: [], warnings: ['blocked by CSP'] }));

    const empty = screen.getByText(/Nothing to fix for this target yet/u);
    const warning = screen.getByText('blocked by CSP');

    expect(empty.nextElementSibling).toBe(warning.parentElement);
  });

  it('keeps the drawer closed until a finding is chosen', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('associates the findings tab with the visible findings panel', () => {
    renderPanel();

    const panel = screen.getByRole('tabpanel', { name: /Findings/u });

    expect(panel.id).toBe('findings-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('findings-tab');
  });

  it('shares the existing severity and browser callbacks with the narrow filter menu', () => {
    const handlers: PanelFilterHandlers = {
      onToggleRisk: vi.fn(),
      onToggleSlot: vi.fn(),
    };

    renderPanel(session(), handlers);
    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

    const menu = within(screen.getByRole('dialog', { name: 'Filters' }));
    const severity = menu.getByText('Breaks').closest('label')?.querySelector('input');
    const browser = menu.getByText('chrome').closest('label')?.querySelector('input');

    if (!(severity instanceof HTMLInputElement) || !(browser instanceof HTMLInputElement)) {
      throw new Error('The narrow filters are not checkboxes.');
    }

    fireEvent.click(severity);
    fireEvent.click(browser);

    expect(handlers.onToggleRisk).toHaveBeenCalledWith('breaks');
    expect(handlers.onToggleSlot).toHaveBeenCalledWith('chrome');
  });
});

describe('LivePanel watching state', () => {
  it('says plainly when it is not watching the page', () => {
    renderPanel(session({ occurrences: [], watching: false }));

    expect(screen.getByText(/Not watching this page yet/u)).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('not watching')).toBeInstanceOf(HTMLElement);
  });

  it('shows why observation failed rather than looking merely empty', () => {
    renderPanel(session({ occurrences: [], watching: false, warnings: ['blocked by CSP'] }));

    expect(screen.getByText('blocked by CSP')).toBeInstanceOf(HTMLElement);
  });
});

describe('LivePanel tabs', () => {
  it('shows the modernise view when that tab is active', () => {
    render(() => {
      return (
        <LivePanel
          columns={{ target: { chrome: '121' }, selected: ALL, runs, bcdIdOf }}
          host="127.0.0.1:8765"
          labelOf={(slot) => {
            return slot;
          }}
          onChangeTheme={vi.fn()}
          onSelectFinding={vi.fn()}
          onSelectTab={vi.fn()}
          onSort={vi.fn()}
          onToggleRisk={vi.fn()}
          allChecked={false}
          onToggleAll={vi.fn()}
          onResizeRail={vi.fn()}
          onToggleSlot={vi.fn()}
          railWidth={240}
          rail={{
            target: { chrome: '121' },
            selected: new Set(['chrome']),
            groupOf: () => {
              return 'Chromium Engine';
            },
            dormantReason: () => {
              return 'paused';
            },
          }}
          retiredOf={() => {
            return undefined;
          }}
          risks={new Set(['breaks', 'degrades'])}
          selected={null}
          session={session()}
          shortOf={(slot) => {
            return slot;
          }}
          sort="severity"
          tab="modernise"
          target={{
            preset: 'widely',
            years: 4,
            browsers: 7,
            onChangePreset: () => {
              return undefined;
            },
            onChangeYears: () => {
              return undefined;
            },
          }}
          theme="system"
        />
      );
    });

    expect(screen.getByText(/Nothing to modernise/u)).toBeInstanceOf(HTMLElement);

    const panel = screen.getByRole('tabpanel', { name: /Modernise/u });

    expect(panel.id).toBe('modernise-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('modernise-tab');
  });
});
