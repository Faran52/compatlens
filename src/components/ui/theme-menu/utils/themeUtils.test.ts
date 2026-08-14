import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  isThemeMode,
  resolveTheme,
  THEME_MODES,
} from './themeUtils';

describe('THEME_MODES', () => {
  it('offers exactly system, light and dark', () => {
    expect(THEME_MODES).toEqual(['system', 'light', 'dark']);
  });
});

describe('isThemeMode', () => {
  it.each([['system'], ['light'], ['dark']])('accepts %s', (value: string) => {
    expect(isThemeMode(value)).toBe(true);
  });

  it.each([['sepia'], ['']])('rejects %s', (value: string) => {
    expect(isThemeMode(value)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('ignores the system preference once a mode is chosen', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
