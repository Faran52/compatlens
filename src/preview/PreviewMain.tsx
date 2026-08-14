import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import {
  browserLabels,
  engineRuns,
  featureRegistry,
  modernizationRules,
  widelyAvailableTarget,
} from '@compat-data';
import { groupForSlot, LivePanel } from '@components/features';
import {
  analyzeResources,
  bcdIdOf,
  BROWSER_SLOT_IDS,
} from '@engine';
import { emptySession, mergeBatch } from '@model';

import fixtureCss from '../../e2e/fixtures/compat-page.css?raw';
import fixtureHtml from '../../e2e/fixtures/compat-page.html?raw';

import type { PanelTab } from '@components/features';
import type { BrowserSlotId, Occurrence } from '@engine';

import '../styles/tokens.css';
import '../styles/tailwind.css';
import '../styles/global.css';

const ROUTE = 'https://shop.example.test/products';

// Keep fixtures out of production while exercising the real engine.
const batch = mergeBatch(
  emptySession(),
  analyzeResources({
    resources: [
      { kind: 'html', url: ROUTE, content: fixtureHtml, view: 'rendered' },
      { kind: 'css', url: 'https://shop.example.test/compat-page.css', content: fixtureCss },
    ],
    registry: featureRegistry,
    rules: modernizationRules,
    target: widelyAvailableTarget,
    warnings: [],
    now: () => {
      return 0;
    },
  }),
  { route: ROUTE, at: '2026-07-31T10:00:00.000Z' },
);

// A live panel installs its observer before it receives findings.
const session = { ...batch, watching: true };

const container = document.getElementById('root');

if (!container) {
  throw new Error('CompatLens preview root element is missing.');
}

const previewSelected = new Set(BROWSER_SLOT_IDS.filter((slot) => {
  return widelyAvailableTarget[slot] !== undefined;
}));

const groupOf = (slot: BrowserSlotId) => {
  return groupForSlot(slot, {
    target: widelyAvailableTarget,
    selected: previewSelected,
    runs: engineRuns,
    bcdIdOf,
  });
};

const [railWidth, setRailWidth] = createSignal(240);

const [selected, setSelected] = createSignal<Occurrence | null>(null);

const [tab, setTab] = createSignal<PanelTab>('findings');

render(() => {
  return (
    <LivePanel
      columns={{
        target: widelyAvailableTarget,
        selected: previewSelected,
        runs: engineRuns,
        bcdIdOf,
      }}
      host="127.0.0.1:8765"
      browsers={{
        labelOf: (slot) => {
          return browserLabels[slot];
        },
        retiredOf: () => {
          return undefined;
        },
      }}
      onExport={() => {
        return undefined;
      }}
      onSelectFinding={setSelected}
      onSelectTab={setTab}
      filters={{
        rail: {
          target: widelyAvailableTarget,
          selected: previewSelected,
          groupOf,
          dormantReason: () => {
            return 'no release inside this window';
          },
        },
        risks: new Set(['breaks', 'degrades']),
        onToggleRisk: () => {
          return undefined;
        },
        allChecked: false,
        onToggleAll: () => {
          return undefined;
        },
        onToggleSlot: () => {
          return undefined;
        },
        width: railWidth(),
        onResize: setRailWidth,
      }}
      selected={selected()}
      session={session}
      tab={tab()}
      theme={{
        mode: 'system',
        onChange: () => {
          return undefined;
        },
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
      sort="severity"
      onSort={() => {
        return undefined;
      }}
    />
  );
}, container);
