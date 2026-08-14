import {
  CellLegend,
  CheckList,
  Tabs,
  TargetPicker,
  ThemeMenu,
} from '@components/ui';
import { cx } from '@utils';
import { For, Show } from 'solid-js';

import { FilterRail } from './partials/FilterRail';
import { FindingDrawer } from './partials/FindingDrawer';
import { ModerniseList } from './partials/ModerniseList';
import { NarrowFilterMenu } from './partials/NarrowFilterMenu';
import { SupportGrid } from './partials/SupportGrid';
import { severityCheckRowsFor } from './utils/gridUtils';
import { hostFromRoutes } from './utils/hostUtils';
import { createRailResize } from './utils/railResizeUtils';
import {
  emptyMessageFor,
  isConnecting,
  phaseOf,
  statusLineFor,
} from './utils/statusUtils';

import type {
  TabDefinition,
  TargetControl,
  ThemeMode,
} from '@components/ui';
import type {
  BrowserSlotId,
  Occurrence,
  RiskLevel,
  SessionReport,
} from '@engine';
import type { JSX } from 'solid-js';
import type { PanelTab } from './panelTab';
import type { ColumnInput } from './utils/columnUtils';
import type { RailInput } from './utils/railUtils';
import type { SortKey } from './utils/sortUtils';

interface LivePanelProps {
  host: string;
  session: SessionReport;
  tab: PanelTab;
  selected: Occurrence | null;
  columns: ColumnInput;
  rail: RailInput;
  labelOf: (slot: BrowserSlotId) => string;
  shortOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
  onSelectTab: (tab: PanelTab) => void;
  onSelectFinding: (occurrence: Occurrence | null) => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
  allChecked: boolean;
  onToggleAll: () => void;
  railWidth: number;
  onResizeRail: (width: number) => void;
  risks: ReadonlySet<RiskLevel>;
  onToggleRisk: (risk: RiskLevel) => void;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  theme: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  target: TargetControl;
}

// Arrow keys only; every other key resolves to no movement rather than a branch in the template.
const NUDGE_KEYS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export const LivePanel = (props: LivePanelProps): JSX.Element => {
  const resize = createRailResize({
    width: () => {
      return props.railWidth;
    },
    onResize: (width) => {
      props.onResizeRail(width);
    },
  });

  const tabs = (): readonly TabDefinition[] => {
    return [
      {
        id: 'findings',
        tabId: 'findings-tab',
        panelId: 'findings-panel',
        label: 'Findings',
        count: props.session.occurrences.length,
      },
      {
        id: 'modernise',
        tabId: 'modernise-tab',
        panelId: 'modernise-panel',
        label: 'Modernise',
        count: props.session.suggestions.length,
      },
    ];
  };

  const severityRows = () => {
    return severityCheckRowsFor({
      occurrences: props.session.occurrences,
      onToggle: props.onToggleRisk,
      risks: props.risks,
    });
  };

  return (
    <div class="flex h-full flex-col bg-canvas">
      <div class="flex flex-wrap items-center gap-2 border-b border-hairline bg-surface p-2">
        <NarrowFilterMenu
          allChecked={props.allChecked}
          busy={isConnecting(props.session)}
          labelOf={props.labelOf}
          onToggleAll={props.onToggleAll}
          onToggleSlot={props.onToggleSlot}
          rail={props.rail}
          retiredOf={props.retiredOf}
          severityRows={severityRows()}
        />
        <span class="font-semibold">CompatLens</span>
        <span class="font-mono text-xs text-text-muted">{hostFromRoutes(props.session.routes, props.host)}</span>
        <TargetPicker
          browsers={props.target.browsers}
          onChangePreset={props.target.onChangePreset}
          onChangeYears={props.target.onChangeYears}
          preset={props.target.preset}
          years={props.target.years}
        />
        <span class="ml-auto text-xs text-text-muted">{statusLineFor(props.session)}</span>
        <ThemeMenu mode={props.theme} onChange={props.onChangeTheme} />
      </div>
      <div class="flex min-h-0 flex-1">
        <div
          aria-busy={isConnecting(props.session)}
          class={cx(
            'hidden shrink-0 flex-col overflow-auto bg-surface min-[720px]:flex',
            isConnecting(props.session) ? 'pointer-events-none opacity-50' : '',
          )}
          style={{ width: `${String(props.railWidth)}px` }}
        >
          <div class="p-2">
            <CheckList
              heading="Severity"
              rows={severityRows()}
            />
          </div>
          <FilterRail
            labelOf={props.labelOf}
            allChecked={props.allChecked}
            onToggleAll={props.onToggleAll}
            onToggleSlot={props.onToggleSlot}
            rail={props.rail}
            retiredOf={props.retiredOf}
          />
        </div>
        <div
          aria-label="Resize the browser list"
          aria-orientation="vertical"
          aria-valuenow={props.railWidth}
          class={cx(
            'hidden w-1 shrink-0 cursor-col-resize bg-hairline min-[720px]:block',
            'hover:bg-accent focus-visible:bg-accent',
          )}
          onKeyDown={(event) => {
            resize.nudge(NUDGE_KEYS[event.key] ?? 0);
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            resize.start(event);
          }}
          onPointerMove={(event) => {
            resize.move(event);
          }}
          onPointerUp={() => {
            resize.stop();
          }}
          role="separator"
          tabindex="0"
        />
        <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <Tabs
            active={props.tab}
            onSelect={(id) => {
              props.onSelectTab(id === 'modernise' ? 'modernise' : 'findings');
            }}
            tabs={tabs()}
          />
          <Show when={props.tab === 'modernise'}>
            <div
              aria-labelledby="modernise-tab"
              class="min-h-0 flex-1 overflow-auto"
              id="modernise-panel"
              role="tabpanel"
            >
              <ModerniseList
                suggestions={props.session.suggestions}
                targeted={Object.keys(props.columns.target).length}
              />
            </div>
          </Show>
          <Show when={props.tab === 'findings'}>
            <Show
              fallback={(
                <p
                  aria-labelledby="findings-tab"
                  class="p-5 text-center text-text-muted"
                  data-empty={phaseOf(props.session)}
                  id="findings-panel"
                  role="tabpanel"
                >
                  {emptyMessageFor(props.session)}
                </p>
              )}
              when={props.session.occurrences.length > 0}
            >
              <div
                aria-labelledby="findings-tab"
                class="flex min-h-0 min-w-0 flex-1 flex-col"
                id="findings-panel"
                role="tabpanel"
              >
                <div class="min-h-0 min-w-0 flex-1 overflow-auto">
                  <SupportGrid
                    columns={props.columns}
                    occurrences={props.session.occurrences}
                    onSelect={props.onSelectFinding}
                    onSort={props.onSort}
                    risks={props.risks}
                    selected={props.selected}
                    shortOf={props.shortOf}
                    sort={props.sort}
                  />
                </div>
                <CellLegend />
              </div>
            </Show>
          </Show>
          <Show when={props.session.warnings.length > 0}>
            <ul class="border-t border-hairline p-2 text-xs text-breaks">
              <For each={props.session.warnings}>
                {(warning) => {
                  return <li data-warning="true">{warning}</li>;
                }}
              </For>
            </ul>
          </Show>
          <Show when={props.session.capped}>
            <p class="border-t border-hairline p-2 text-xs text-unverified">
              The finding limit was reached, so later changes were not recorded.
            </p>
          </Show>
          <FindingDrawer
            labelOf={props.labelOf}
            occurrence={props.selected}
            onClose={() => {
              props.onSelectFinding(null);
            }}
          />
        </div>
      </div>
    </div>
  );
};
