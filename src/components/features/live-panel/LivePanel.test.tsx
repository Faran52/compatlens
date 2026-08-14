import { bcdIdOf, BROWSER_SLOT_IDS } from '@engine';
import { blockedFindingFixture } from '@mocks';
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

import { LivePanel } from '../live-panel/LivePanel';

import type {
  BrowserSlotId,
  EngineRun,
  Occurrence,
  RiskLevel,
  SessionReport,
} from '@engine';
import type { PanelTab } from './panelTab';

interface PanelFilterHandlers {
  onToggleRisk: (risk: RiskLevel) => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
}

interface PanelOptions {
  report?: () => SessionReport;
  handlers?: PanelFilterHandlers;
  onExport?: () => void;
  tab?: PanelTab;
  selected?: Occurrence | null;
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
    route: '/products',
    routes: ['/products'],
    resources: { seen: ['/products'], parsed: ['/products'] },
    coverage: { matched: ['css-anchor-name'], registryFeatures: 34 },
    warnings: [],
    watching: true,
    capped: false,
    ...overrides,
  };
};

const renderPanel = (options: PanelOptions = {}) => {
  const report = options.report ?? session;
  const handlers = options.handlers;

  render(() => {
    return (
      <LivePanel
        columns={{ target: { chrome: '121' }, selected: ALL, runs, bcdIdOf }}
        host="127.0.0.1:8765"
        browsers={{
          labelOf: (slot) => {
            return slot;
          },
          retiredOf: () => {
            return undefined;
          },
        }}
        onExport={options.onExport ?? vi.fn()}
        onSelectFinding={vi.fn()}
        onSelectTab={vi.fn()}
        onSort={vi.fn()}
        sort="severity"
        filters={{
          rail: {
            target: { chrome: '121' },
            selected: new Set(['chrome']),
            groupOf: () => {
              return 'Chromium Engine';
            },
            dormantReason: () => {
              return 'paused';
            },
          },
          risks: new Set(['breaks', 'degrades']),
          onToggleRisk: handlers?.onToggleRisk ?? vi.fn(),
          allChecked: false,
          onToggleAll: vi.fn(),
          onToggleSlot: handlers?.onToggleSlot ?? vi.fn(),
          width: 240,
          onResize: vi.fn(),
        }}
        selected={options.selected ?? null}
        session={report()}
        theme={{ mode: 'system', onChange: vi.fn() }}
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
        tab={options.tab ?? 'findings'}
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
    renderPanel({
      report: () => {
        return session({ occurrences: [] });
      },
    });

    expect(screen.getByText(/Nothing to fix for this target yet/u)).toBeInstanceOf(HTMLElement);
  });

  it('says so when the finding limit was reached rather than truncating silently', () => {
    renderPanel({
      report: () => {
        return session({ capped: true });
      },
    });

    expect(screen.getByText(/finding limit was reached/u)).toBeInstanceOf(HTMLElement);
  });

  it('keeps warnings after the empty findings state', () => {
    renderPanel({
      report: () => {
        return session({ occurrences: [], warnings: ['blocked by CSP'] });
      },
    });

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

    renderPanel({ handlers });
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

  it('offers the report as a file once the page has been read', () => {
    const onExport = vi.fn();

    renderPanel({ onExport });
    fireEvent.click(screen.getByRole('button', { name: 'Export .md' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('refuses to export a page it has not read yet', () => {
    renderPanel({
      report: () => {
        return session({ occurrences: [], routes: [] });
      },
    });

    const button = screen.getByRole('button', { name: 'Export .md' });

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Export is not a button.');
    }

    expect(button.disabled).toBe(true);
  });

  it('keeps focus on the same tab when a report update changes its count', () => {
    const [report, setReport] = createSignal(session());

    renderPanel({ report });

    const findings = screen.getByRole('tab', { name: /Findings/u });

    findings.focus();
    setReport(session({ occurrences: [] }));

    expect(screen.getByRole('tab', { name: /Findings/u })).toBe(findings);
    expect(document.activeElement).toBe(findings);
  });
});

describe('LivePanel watching state', () => {
  it('says plainly when it is not watching the page', () => {
    renderPanel({
      report: () => {
        return session({ occurrences: [], watching: false });
      },
    });

    expect(screen.getByText(/Not watching this page yet/u)).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('not watching')).toBeInstanceOf(HTMLElement);
  });

  it('shows why observation failed rather than looking merely empty', () => {
    renderPanel({
      report: () => {
        return session({ occurrences: [], watching: false, warnings: ['blocked by CSP'] });
      },
    });

    expect(screen.getByText('blocked by CSP')).toBeInstanceOf(HTMLElement);
  });
});

describe('LivePanel tabs', () => {
  it('shows the modernise view when that tab is active', () => {
    renderPanel({ tab: 'modernise' });

    expect(screen.getByText(/Nothing to modernise/u)).toBeInstanceOf(HTMLElement);

    const panel = screen.getByRole('tabpanel', { name: /Modernise/u });

    expect(panel.id).toBe('modernise-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('modernise-tab');
  });

  it('leaves a chosen finding behind with its tab rather than over the modernise list', () => {
    renderPanel({ selected: occurrence, tab: 'modernise' });

    expect(screen.queryByRole('dialog', { name: occurrence.name })).toBeNull();
  });

  it('shows the chosen finding while its own tab is active', () => {
    renderPanel({ selected: occurrence });

    expect(screen.getByRole('dialog', { name: occurrence.name })).toBeInstanceOf(HTMLElement);
  });
});
