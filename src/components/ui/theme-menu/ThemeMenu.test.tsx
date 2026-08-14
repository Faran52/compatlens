import {
  fireEvent,
  render,
  screen,
} from '@solidjs/testing-library';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { ThemeMenu } from './ThemeMenu';

import type { ThemeMode } from './ThemeMenu';

const renderMenu = (mode: ThemeMode = 'system', onChange = vi.fn()) => {
  render(() => {
    return <ThemeMenu mode={mode} onChange={onChange} />;
  });

  return onChange;
};

describe('ThemeMenu', () => {
  it('offers exactly system, light and dark', () => {
    renderMenu();

    expect(screen.getAllByRole('option').map((option) => {
      return option.textContent;
    })).toEqual(['System', 'Light', 'Dark']);
  });

  it('shows which mode is active', () => {
    renderMenu('dark');

    expect(screen.getByLabelText('Theme')).toHaveProperty('value', 'dark');
  });

  it('reports the mode the developer picks', () => {
    const onChange = renderMenu('system', vi.fn());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });

    expect(onChange).toHaveBeenCalledWith('light');
  });
});
