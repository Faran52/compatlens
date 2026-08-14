import {
  DataGrid,
  FeatureCell,
  SupportCell,
} from '@components/ui';

import { columnsFor, engineSpansFor } from '../utils/columnUtils';
import {
  failuresIn,
  impactFor,
  sectionsFor,
  SEVERITY_LABELS,
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
  shortOf: (slot: BrowserSlotId) => string;
  selected: Occurrence | null;
  onSelect: (occurrence: Occurrence) => void;
  onSort: (key: SortKey) => void;
}

export const SupportGrid = (props: SupportGridProps): JSX.Element => {
  const slots = () => {
    return columnsFor(props.columns);
  };
  const visible = () => {
    return visibleOccurrences(props.occurrences, props.risks);
  };
  const groups = (): readonly GridGroup[] => {
    return engineSpansFor(slots()).map((span) => {
      return { key: span.group, label: span.group, span: span.span };
    });
  };
  const columns = (): readonly GridColumn<BrowserSlotId>[] => {
    return slots().map((column) => {
      return {
        key: column.slot,
        group: column.group,
        label: props.shortOf(column.slot),
        sublabel: `≥ ${props.columns.target[column.slot] ?? ''}`,
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
      leadCell={(occurrence: Occurrence, selected) => {
        return <FeatureCell occurrence={occurrence} selected={selected} />;
      }}
      onSelect={props.onSelect}
      onSort={(key) => {
        props.onSort(sortKeyFor(key));
      }}
      sections={sectionsFor(props.occurrences, props.risks, props.sort).map((section) => {
        return {
          key: section.risk,
          label: `${SEVERITY_LABELS[section.risk]} (${String(section.occurrences.length)})`,
          rows: section.occurrences,
        };
      })}
      selected={(occurrence: Occurrence) => {
        return props.selected?.id === occurrence.id;
      }}
      totalCell={(column) => {
        return `${String(failuresIn(visible(), [column.key]))} of ${String(visible().length)}`;
      }}
      totalsLabel="Findings affecting"
    />
  );
};
