export type ThemeMode = 'system' | 'light' | 'dark';

type ResolvedTheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export const isThemeMode = (value: string): value is ThemeMode => {
  return value === 'system' || value === 'light' || value === 'dark';
};

// System is not a third look: it resolves to one of the two the stylesheet actually defines.
export const resolveTheme = (mode: ThemeMode, prefersDark: boolean): ResolvedTheme => {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return mode;
};
