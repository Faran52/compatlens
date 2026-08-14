import { RISK_LABELS } from '@engine';

import { compareOccurrences } from './sortUtils';

import type { CheckListRow } from '@components/ui';
import type {
  BrowserImpact,
  BrowserSlotId,
  Occurrence,
  RiskLevel,
} from '@engine';
import type { SortKey } from './sortUtils';

interface SeveritySection {
  risk: RiskLevel;
  occurrences: readonly Occurrence[];
}

interface SeverityCheckInput {
  occurrences: readonly Occurrence[];
  risks: ReadonlySet<RiskLevel>;
  onToggle: (risk: RiskLevel) => void;
}

// Most severe first: this is the order sections render in, and the export writes them in.
export const RISKS: readonly RiskLevel[] = ['breaks', 'degrades'];

// A severity row keeps its count: unlike a browser, no column in the grid reports the same number.
export const severityCheckRowsFor = (input: SeverityCheckInput): readonly CheckListRow[] => {
  return RISKS.map((risk) => {
    return {
      label: RISK_LABELS[risk],
      checked: input.risks.has(risk),
      active: true,
      count: {
        value: countBySeverity(input.occurrences, risk),
        noun: 'findings at this severity',
      },
      onToggle: () => {
        input.onToggle(risk);
      },
    };
  });
};

export const countBySeverity = (
  occurrences: readonly Occurrence[],
  risk: RiskLevel,
): number => {
  return occurrences.filter((occurrence) => {
    return occurrence.risk === risk;
  }).length;
};

export const sectionsFor = (
  occurrences: readonly Occurrence[],
  risks: ReadonlySet<RiskLevel>,
  sort: SortKey,
): readonly SeveritySection[] => {
  return RISKS
    .filter((risk) => {
      return risks.has(risk);
    })
    .map((risk) => {
      return {
        risk,
        occurrences: occurrences
          .filter((occurrence) => {
            return occurrence.risk === risk;
          })
          .sort(compareOccurrences(sort)),
      };
    })
    .filter((section) => {
      return section.occurrences.length > 0;
    });
};

// Filtered here rather than in the engine, so changing the target needs no rescan.
export const failingOn = (
  occurrences: readonly Occurrence[],
  slots: readonly BrowserSlotId[],
): readonly Occurrence[] => {
  return occurrences.filter((occurrence) => {
    return occurrence.impacts.some((impact) => {
      return slots.includes(impact.slot) && !impact.supported;
    });
  });
};

export const failuresIn = (
  occurrences: readonly Occurrence[],
  slots: readonly BrowserSlotId[],
): number => {
  return failingOn(occurrences, slots).length;
};

// The totals row counts what the grid is showing, so it filters the same way the sections do.
export const visibleOccurrences = (
  occurrences: readonly Occurrence[],
  risks: ReadonlySet<RiskLevel>,
): readonly Occurrence[] => {
  return occurrences.filter((occurrence) => {
    return risks.has(occurrence.risk);
  });
};

// A finding lists only the browsers it fails on, so every other targeted column is a pass.
export const impactFor = (occurrence: Occurrence, slot: BrowserSlotId): BrowserImpact => {
  const found = occurrence.impacts.find((impact) => {
    return impact.slot === slot;
  });

  return found ?? { slot, targetVersion: '', supported: true };
};
