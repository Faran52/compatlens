import { For } from 'solid-js';

import { isThemeMode } from './utils/themeUtils';

import type { JSX } from 'solid-js';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeMenuProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

const LABELS: Readonly<Record<ThemeMode, string>> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export const ThemeMenu = (props: ThemeMenuProps): JSX.Element => {
  return (
    <select
      aria-label="Theme"
      class="
        rounded-sm border border-hairline bg-surface-raised px-2 py-1 text-text
      "
      onChange={(event) => {
        if (isThemeMode(event.currentTarget.value)) {
          props.onChange(event.currentTarget.value);
        }
      }}
      value={props.mode}
    >
      <For each={THEME_MODES}>
        {(mode) => {
          return <option value={mode}>{LABELS[mode]}</option>;
        }}
      </For>
    </select>
  );
};
