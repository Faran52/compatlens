interface CheckListCount {
  value: number;
  noun: string;
}

export interface CheckListRow {
  label: string;
  checked: boolean;
  active: boolean;
  count?: CheckListCount; // omitted where the grid already reports the same number
  badge?: string;
  meta?: string; // short enough to sit beside the label without squeezing it
  note?: string; // a sentence, so it gets its own line rather than crushing the label
  onToggle: () => void;
}

// A bare number in a narrow column says nothing, so the reason for it travels with it.
export const countTitleFor = (count: CheckListCount): string => {
  return `${String(count.value)} ${count.noun}`;
};
