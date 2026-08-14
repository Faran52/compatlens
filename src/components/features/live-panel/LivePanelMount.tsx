import { createSignal, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';

import {
  clampRailWidth,
  hostOf,
  toggleIn,
} from '@utils';

import {
  browserLabels,
  engineRuns,
  retiredEngines,
} from '@compat-data';
import { resolveTheme } from '@components/ui';
import { bcdIdOf, DEFAULT_BROWSER_SLOTS } from '@engine';
import { resolveTargetPreset } from '@model';

import { LivePanel } from './LivePanel';
import { groupForSlot } from './utils/columnUtils';
import { exportFileName, reportToMarkdown } from './utils/exportUtils';
import { failingOn } from './utils/gridUtils';
import {
  activeSlotsFor,
  bulkSlotsFor,
  everySlotChecked,
} from './utils/railUtils';
import { retiredYearFor } from './utils/retiredUtils';

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

// A blob and an anchor, so the file never leaves the machine and no permission is needed for it.
const downloadMarkdown = (report: SessionReport, host: string, target: BrowserTarget): void => {
  const exportedAt = new Date().toISOString();
  const blob = new Blob(
    [reportToMarkdown({ report, host, target, exportedAt })],
    { type: 'text/markdown' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = exportFileName(host, exportedAt);
  link.click();
  URL.revokeObjectURL(url);
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
        browsers={{
          labelOf: (slot) => {
            return browserLabels[slot];
          },
          retiredOf: (slot) => {
            return retiredYearFor(slot, {
              target: target(),
              runs: engineRuns,
              retired: retiredEngines,
              bcdIdOf,
            });
          },
        }}
        onSelectFinding={setSelected}
        onSelectTab={setTab}
        filters={{
          rail: {
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
          },
          risks: risks(),
          onToggleRisk: (risk) => {
            setRisks(toggleIn(risks(), risk));
          },
          allChecked: everySlotChecked(slots()),
          onToggleAll: () => {
            setSlots(bulkSlotsFor(everySlotChecked(slots())));
          },
          onToggleSlot: (slot) => {
            setSlots(toggleIn(slots(), slot));
          },
          width: railWidth(),
          onResize: (width) => {
            setRailWidth(width);
          },
        }}
        selected={selected()}
        session={targeted()}
        theme={{
          mode: theme(),
          onChange: (mode) => {
            setTheme(mode);
            document.documentElement.dataset.theme = resolveTheme(mode, mount.prefersDark());
          },
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
        onExport={() => {
          downloadMarkdown(targeted(), hostOf(targeted().route, mount.host), target());
        }}
        onSort={setSort}
        sort={sort()}
        tab={tab()}
      />
    );
  }, mount.container);

  return dispose;
};
