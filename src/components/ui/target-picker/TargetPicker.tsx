import { AGE_WINDOW_YEARS_RANGE } from '@engine';
import { isTargetPreset } from '@model';
import { For, Show } from 'solid-js';

import type { AgeWindowYears } from '@engine';
import type { TargetPreset } from '@model';
import type { JSX } from 'solid-js';

interface TargetPickerProps {
  preset: TargetPreset;
  years: AgeWindowYears;
  browsers: number;
  onChangePreset: (preset: TargetPreset) => void;
  onChangeYears: (years: AgeWindowYears) => void;
}

const isAge = (preset: TargetPreset): boolean => {
  return preset.startsWith('age-');
};

export const TargetPicker = (props: TargetPickerProps): JSX.Element => {
  return (
    <div class="flex flex-wrap items-center gap-2">
      <select
        aria-label="Compatibility target"
        class="rounded border border-hairline bg-surface-raised px-2 py-1 text-text"
        onChange={(event) => {
          if (isTargetPreset(event.currentTarget.value)) {
            props.onChangePreset(event.currentTarget.value);
          }
        }}
        value={props.preset}
      >
        <option value="widely">Baseline Widely Available</option>
        <option value="baseline-2022">Baseline 2022</option>
        <option value={`age-${String(props.years)}`}>Browser age</option>
      </select>
      <Show when={isAge(props.preset)}>
        <span class="inline-flex items-center rounded border border-hairline bg-surface-raised">
          <For each={[-1, 1]}>
            {(step) => {
              return (
                <button
                  aria-label={step < 0 ? 'Fewer years' : 'More years'}
                  class="w-7 cursor-pointer py-0.5 disabled:opacity-35"
                  disabled={step < 0 ? props.years <= 1 : props.years >= 15}
                  onClick={() => {
                    const next = props.years + step;
                    const found = AGE_WINDOW_YEARS_RANGE.find((year) => {
                      return year === next;
                    });

                    if (found !== undefined) {
                      props.onChangeYears(found);
                    }
                  }}
                  type="button"
                >
                  {step < 0 ? '−' : '+'}
                </button>
              );
            }}
          </For>
        </span>
        <span class="text-xs text-text-muted">
          {`${String(props.years)} years back · ${String(props.browsers)} browsers`}
        </span>
      </Show>
    </div>
  );
};
