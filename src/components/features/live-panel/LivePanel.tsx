import { For, Show } from 'solid-js';

import {
  createRailResize,
  cx,
  hostOf,
  RAIL_MAX_WIDTH,
  RAIL_MIN_WIDTH,
} from '@utils';

import {
  CellLegend,
  Tabs,
  TargetPicker,
  ThemeMenu,
} from '@components/ui';

import { FilterBody } from './partials/FilterBody';
import { FindingDrawer } from './partials/FindingDrawer';
import { ModerniseList } from './partials/ModerniseList';
import { NarrowFilterMenu } from './partials/NarrowFilterMenu';
import { SupportGrid } from './partials/SupportGrid';
import { severityCheckRowsFor } from './utils/gridUtils';
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

interface BrowserNaming {
  labelOf: (slot: BrowserSlotId) => string;
  retiredOf: (slot: BrowserSlotId) => string | undefined;
}

interface FilterControl {
  rail: RailInput;
  risks: ReadonlySet<RiskLevel>;
  onToggleRisk: (risk: RiskLevel) => void;
  allChecked: boolean;
  onToggleAll: () => void;
  onToggleSlot: (slot: BrowserSlotId) => void;
  width: number;
  onResize: (width: number) => void;
}

interface ThemeControl {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

interface LivePanelProps {
  host: string;
  session: SessionReport;
  tab: PanelTab;
  onSelectTab: (tab: PanelTab) => void;
  selected: Occurrence | null;
  onSelectFinding: (occurrence: Occurrence | null) => void;
  columns: ColumnInput;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onExport: () => void;
  browsers: BrowserNaming;
  filters: FilterControl;
  theme: ThemeControl;
  target: TargetControl;
}

// Arrow keys only; every other key resolves to no movement rather than a branch in the template.
const NUDGE_KEYS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export const LivePanel = (props: LivePanelProps): JSX.Element => {
  let desktopFilterControl: HTMLDivElement | undefined;
  const resize = createRailResize({
    width: () => {
      return props.filters.width;
    },
    onResize: (width) => {
      props.filters.onResize(width);
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
      onToggle: props.filters.onToggleRisk,
      risks: props.filters.risks,
    });
  };

  return (
    <div class="flex h-full flex-col bg-canvas">
      <div class="
        flex flex-wrap items-center gap-2 border-b border-hairline bg-surface
        p-2
      "
      >
        <NarrowFilterMenu
          allChecked={props.filters.allChecked}
          busy={isConnecting(props.session)}
          labelOf={props.browsers.labelOf}
          onToggleAll={props.filters.onToggleAll}
          onToggleSlot={props.filters.onToggleSlot}
          onWideClose={() => {
            desktopFilterControl?.focus();
          }}
          rail={props.filters.rail}
          retiredOf={props.browsers.retiredOf}
          severityRows={severityRows()}
        />
        <span class="font-semibold">CompatLens</span>
        <span class="text-xs font-mono text-text-muted">{hostOf(props.session.route, props.host)}</span>
        <TargetPicker
          browsers={props.target.browsers}
          onChangePreset={props.target.onChangePreset}
          onChangeYears={props.target.onChangeYears}
          preset={props.target.preset}
          years={props.target.years}
        />
        <span class="text-xs ml-auto text-text-muted">{statusLineFor(props.session)}</span>
        <button
          class={cx(
            `
              rounded-sm cursor-pointer border border-hairline bg-surface-raised
              px-2
            `,
            `
              hover:border-accent
              focus-visible:border-accent
            `,
          )}
          disabled={isConnecting(props.session)}
          onClick={() => {
            props.onExport();
          }}
          type="button"
        >
          Export .md
        </button>
        <ThemeMenu mode={props.theme.mode} onChange={props.theme.onChange} />
      </div>
      <div class="min-h-0 flex flex-1">
        <div
          class="
            hidden shrink-0 flex-col overflow-auto bg-surface
            min-[720px]:flex
          "
          style={{ width: `${String(props.filters.width)}px` }}
        >
          <FilterBody
            allChecked={props.filters.allChecked}
            busy={isConnecting(props.session)}
            labelOf={props.browsers.labelOf}
            onToggleAll={props.filters.onToggleAll}
            onToggleSlot={props.filters.onToggleSlot}
            rail={props.filters.rail}
            retiredOf={props.browsers.retiredOf}
            severityRows={severityRows()}
          />
        </div>
        <div
          aria-label="Resize the browser list"
          aria-orientation="vertical"
          aria-valuemax={RAIL_MAX_WIDTH}
          aria-valuemin={RAIL_MIN_WIDTH}
          aria-valuenow={props.filters.width}
          class={cx(
            `
              hidden w-1 shrink-0 cursor-col-resize bg-hairline
              min-[720px]:block
            `,
            `
              hover:bg-accent
              focus-visible:bg-accent
            `,
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
          ref={desktopFilterControl}
          role="slider"
          tabindex="0"
        />
        <div class="min-w-0 relative flex flex-1 flex-col overflow-hidden">
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
                class="min-h-0 min-w-0 flex flex-1 flex-col"
                id="findings-panel"
                role="tabpanel"
              >
                <div class="min-h-0 min-w-0 flex-1 overflow-auto">
                  <SupportGrid
                    columns={props.columns}
                    labelOf={props.browsers.labelOf}
                    occurrences={props.session.occurrences}
                    onSelect={props.onSelectFinding}
                    onSort={props.onSort}
                    risks={props.filters.risks}
                    selected={props.selected}
                    sort={props.sort}
                  />
                </div>
                <CellLegend />
              </div>
            </Show>
            <FindingDrawer
              labelOf={props.browsers.labelOf}
              occurrence={props.selected}
              onClose={() => {
                props.onSelectFinding(null);
              }}
            />
          </Show>
          <Show when={props.session.warnings.length > 0}>
            <ul class="text-xs border-t border-hairline p-2 text-breaks">
              <For each={props.session.warnings}>
                {(warning) => {
                  return <li data-warning="true">{warning}</li>;
                }}
              </For>
            </ul>
          </Show>
          <Show when={props.session.capped}>
            <p class="text-xs border-t border-hairline p-2 text-unverified">
              The finding limit was reached, so later changes were not recorded.
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
};
