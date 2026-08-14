import {
  browserLabels,
  engineRuns,
  retiredEngines,
} from '@compat-data';
import { resolveTheme } from '@components/ui';
import { bcdIdOf, DEFAULT_BROWSER_SLOTS } from '@engine';
import { resolveTargetPreset } from '@model';
import { createSignal, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';

import { LivePanel } from './LivePanel';
import { groupForSlot } from './utils/columnUtils';
import { failingOn } from './utils/gridUtils';
import { clampRailWidth } from './utils/railResizeUtils';
import {
  activeSlotsFor,
  bulkSlotsFor,
  everySlotChecked,
} from './utils/railUtils';
import { retiredYearFor } from './utils/retiredUtils';
import { toggleIn } from './utils/toggleUtils';

import type { ThemeMode } from '@components/ui';
import type {
  AgeWindowYears,
  BrowserSlotId,
  BrowserTarget,
  Occurrence,
  RiskLevel,
  SessionReport,
} from '@engine';
import type { LiveSession, TargetPreset } from '@model';
import type { PanelTab } from './panelTab';
import type { SortKey } from './utils/sortUtils';

export interface LivePanelMount {
  container: HTMLElement;
  host: string;
  session: LiveSession;
  target: BrowserTarget;
  intervalMs: number;
  prefersDark: () => boolean;
  onTargetChange: (target: BrowserTarget) => void;
  schedule: (run: () => void, ms: number) => () => void;
}

// Written out so the preset stays a literal union rather than a widened template string.
const AGE_PRESETS: Readonly<Record<AgeWindowYears, TargetPreset>> = {
  1: 'age-1', 2: 'age-2', 3: 'age-3', 4: 'age-4', 5: 'age-5',
  6: 'age-6', 7: 'age-7', 8: 'age-8', 9: 'age-9', 10: 'age-10',
  11: 'age-11', 12: 'age-12', 13: 'age-13', 14: 'age-14', 15: 'age-15',
};

// The panel owns cadence; the session owns accumulation. Neither knows about the other's timer.
export const mountLivePanel = (mount: LivePanelMount): (() => void) => {
  const [report, setReport] = createSignal<SessionReport>(mount.session.report());
  const [tab, setTab] = createSignal<PanelTab>('findings');
  const [theme, setTheme] = createSignal<ThemeMode>('system');
  const [preset, setPreset] = createSignal<TargetPreset>('widely');
  const [risks, setRisks] = createSignal<ReadonlySet<RiskLevel>>(new Set(['breaks', 'degrades']));
  const [sort, setSort] = createSignal<SortKey>('severity');
  const [years, setYears] = createSignal<AgeWindowYears>(4);

  const target = () => {
    return resolveTargetPreset(preset());
  };
  const [selected, setSelected] = createSignal<Occurrence | null>(null);
  const [slots, setSlots] = createSignal<ReadonlySet<BrowserSlotId>>(
    new Set(DEFAULT_BROWSER_SLOTS),
  );
  const [railWidth, setRailWidth] = createSignal(clampRailWidth(240));

  const active = () => {
    return activeSlotsFor(target(), slots());
  };
  const targeted = (): SessionReport => {
    return { ...report(), occurrences: failingOn(report().occurrences, active()) };
  };

  const dispose = render(() => {
    const stop = mount.schedule(() => {
      void (async () => {
        setReport(await mount.session.tick());
      })();
    }, mount.intervalMs);

    onCleanup(stop);

    return (
      <LivePanel
        columns={{
          target: target(),
          selected: slots(),
          runs: engineRuns,
          bcdIdOf,
        }}
        host={mount.host}
        labelOf={(slot) => {
          return browserLabels[slot];
        }}
        onSelectFinding={setSelected}
        onSelectTab={setTab}
        allChecked={everySlotChecked(slots())}
        onToggleAll={() => {
          setSlots(bulkSlotsFor(everySlotChecked(slots())));
        }}
        onResizeRail={(width) => {
          setRailWidth(width);
        }}
        onToggleSlot={(slot) => {
          setSlots(toggleIn(slots(), slot));
        }}
        railWidth={railWidth()}
        rail={{
          target: target(),
          selected: slots(),
          groupOf: (slot) => {
            return groupForSlot(slot, {
              target: target(),
              selected: slots(),
              runs: engineRuns,
              bcdIdOf,
            });
          },
          dormantReason: () => {
            return 'no release inside this window';
          },
        }}
        retiredOf={(slot) => {
          return retiredYearFor(slot, {
            target: target(),
            runs: engineRuns,
            retired: retiredEngines,
            bcdIdOf,
          });
        }}
        selected={selected()}
        session={targeted()}
        shortOf={(slot) => {
          return browserLabels[slot];
        }}
        onChangeTheme={(mode) => {
          setTheme(mode);
          document.documentElement.dataset.theme = resolveTheme(mode, mount.prefersDark());
        }}
        target={{
          preset: preset(),
          years: years(),
          browsers: active().length,
          onChangePreset: (next) => {
            setPreset(next);
            mount.onTargetChange(resolveTargetPreset(next));
            void mount.session.reset();
          },
          onChangeYears: (next) => {
            const chosen = AGE_PRESETS[next];

            setYears(next);
            setPreset(chosen);
            mount.onTargetChange(resolveTargetPreset(chosen));
            void mount.session.reset();
          },
        }}
        onSort={setSort}
        onToggleRisk={(risk) => {
          setRisks(toggleIn(risks(), risk));
        }}
        risks={risks()}
        sort={sort()}
        tab={tab()}
        theme={theme()}
      />
    );
  }, mount.container);

  return dispose;
};
