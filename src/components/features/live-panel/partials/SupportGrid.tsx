import {
  DataGrid,
  FeatureCell,
  SupportCell,
} from '@components/ui';
import { RISK_LABELS } from '@engine';

import { columnsFor, engineSpansFor } from '../utils/columnUtils';
import {
  failuresIn,
  impactFor,
  sectionsFor,
  visibleOccurrences,
} from '../utils/gridUtils';
import { sortKeyFor } from '../utils/sortUtils';

import type { GridColumn, GridGroup } from '@components/ui';
import type {
  BrowserSlotId,
  Occurrence,
  RiskLevel,
} from '@engine';
import type { JSX } from 'solid-js';
import type { ColumnInput } from '../utils/columnUtils';
import type { SortKey } from '../utils/sortUtils';

interface SupportGridProps {
  occurrences: readonly Occurrence[];
  risks: ReadonlySet<RiskLevel>;
  sort: SortKey;
  columns: ColumnInput;
  labelOf: (slot: BrowserSlotId) => string;
  selected: Occurrence | null;
  onSelect: (occurrence: Occurrence) => void;
  onSort: (key: SortKey) => void;
}

export const SupportGrid = (props: SupportGridProps): JSX.Element => {
  const isSelected = (occurrence: Occurrence): boolean => {
    return props.selected?.id === occurrence.id;
  };
  const slotColumns = () => {
    return columnsFor(props.columns);
  };
  const visible = () => {
    return visibleOccurrences(props.occurrences, props.risks);
  };
  const groups = (): readonly GridGroup[] => {
    return engineSpansFor(slotColumns()).map((span) => {
      return { key: span.group, label: span.group, span: span.span };
    });
  };
  const columns = (): readonly GridColumn<BrowserSlotId>[] => {
    return slotColumns().map((slotColumn) => {
      return {
        key: slotColumn.slot,
        group: slotColumn.group,
        label: props.labelOf(slotColumn.slot),
        sublabel: `≥ ${props.columns.target[slotColumn.slot] ?? ''}`,
      };
    });
  };

  return (
    <DataGrid
      cell={(occurrence: Occurrence, column) => {
        return <SupportCell impact={impactFor(occurrence, column.key)} />;
      }}
      columns={columns()}
      groups={groups()}
      lead="Feature"
      leadCell={(occurrence: Occurrence) => {
        return <FeatureCell occurrence={occurrence} selected={isSelected(occurrence)} />;
      }}
      onSelect={props.onSelect}
      onSort={(key) => {
        props.onSort(sortKeyFor(key));
      }}
      sections={sectionsFor(props.occurrences, props.risks, props.sort).map((section) => {
        return {
          key: section.risk,
          label: `${RISK_LABELS[section.risk]} (${String(section.occurrences.length)})`,
          rows: section.occurrences,
        };
      })}
      selected={isSelected}
      totalCell={(column) => {
        return `${String(failuresIn(visible(), [column.key]))} of ${String(visible().length)}`;
      }}
      totalsLabel="Findings affecting"
    />
  );
};
