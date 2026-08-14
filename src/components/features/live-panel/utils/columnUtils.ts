import {
  BROWSER_SLOT_IDS,
  EDGE_LEGACY_SLOT,
  ENGINE_GROUP_ORDER,
  ENGINE_GROUPS,
  engineAt,
} from '@engine';

import type {
  BrowserSlotId,
  BrowserTarget,
  EngineGroup,
  EngineRun,
} from '@engine';

interface SlotColumn {
  group: EngineGroup;
  slot: BrowserSlotId;
}

export interface ColumnInput {
  target: BrowserTarget;
  selected: ReadonlySet<BrowserSlotId>;
  runs: Readonly<Record<string, readonly EngineRun[]>>;
  bcdIdOf: (slot: BrowserSlotId) => string;
}

interface EngineSpan {
  group: EngineGroup;
  span: number;
}

// Edge before 79 was EdgeHTML, so a slot's group follows the version being targeted.
export const groupForSlot = (slot: BrowserSlotId, input: ColumnInput): EngineGroup => {
  if (slot === EDGE_LEGACY_SLOT) {
    return 'Legacy Engine';
  }

  const runs = input.runs[input.bcdIdOf(slot)] ?? [];
  const version = input.target[slot];
  // Untargeted browsers still belong to the engine they ship today, not to whatever ran at zero.
  const current = runs.length === 0 ? null : runs[runs.length - 1].engine;
  const engine = version === undefined ? current : engineAt(runs, version);

  return engine === null ? 'Legacy Engine' : ENGINE_GROUPS[engine];
};

// Columns arrive grouped, so a run of one engine is always contiguous and can span in one header.
export const engineSpansFor = (slotColumns: readonly SlotColumn[]): readonly EngineSpan[] => {
  return slotColumns.reduce<EngineSpan[]>((spans, column) => {
    const last = spans.at(-1);

    if (last?.group === column.group) {
      return [...spans.slice(0, -1), { group: last.group, span: last.span + 1 }];
    }

    return [...spans, { group: column.group, span: 1 }];
  }, []);
};

export const columnsFor = (input: ColumnInput): readonly SlotColumn[] => {
  return ENGINE_GROUP_ORDER.flatMap((group) => {
    return BROWSER_SLOT_IDS.filter((slot) => {
      return input.selected.has(slot)
        && input.target[slot] !== undefined
        && groupForSlot(slot, input) === group;
    }).map((slot): SlotColumn => {
      return { group, slot };
    });
  });
};
