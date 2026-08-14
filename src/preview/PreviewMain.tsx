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
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import fixtureCss from '../../e2e/fixtures/compat-page.css?raw';
import fixtureHtml from '../../e2e/fixtures/compat-page.html?raw';

import type { PanelTab } from '@components/features';
import type { BrowserSlotId, Occurrence } from '@engine';

import '../styles/tokens.css';
import '../styles/tailwind.css';
import '../styles/global.css';

const ROUTE = 'https://shop.example.test/products';

// Built only by `vite build --mode preview`, so no production bundle contains the fixture.
// The panel below renders the real engine's verdicts, not a hand-written imitation of them.
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

// A live panel has the observer installed by the time it has findings to show.
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
      labelOf={(slot) => {
        return browserLabels[slot];
      }}
      onSelectFinding={setSelected}
      onSelectTab={setTab}
      allChecked={false}
      onToggleAll={() => {
        return undefined;
      }}
      onResizeRail={setRailWidth}
      onToggleSlot={() => {
        return undefined;
      }}
      railWidth={railWidth()}
      rail={{
        target: widelyAvailableTarget,
        selected: previewSelected,
        groupOf,
        dormantReason: () => {
          return 'no release inside this window';
        },
      }}
      retiredOf={() => {
        return undefined;
      }}
      selected={selected()}
      session={session}
      shortOf={(slot) => {
        return browserLabels[slot];
      }}
      tab={tab()}
      onChangeTheme={() => {
        return undefined;
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
      risks={new Set(['breaks', 'degrades'])}
      onToggleRisk={() => {
        return undefined;
      }}
      onSort={() => {
        return undefined;
      }}
      theme="system"
    />
  );
}, container);
