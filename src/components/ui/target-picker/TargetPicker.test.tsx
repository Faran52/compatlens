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

import { TargetPicker } from './TargetPicker';

import type { AgeWindowYears } from '@engine';
import type { TargetPreset } from '@model';

const renderPicker = (
  preset: TargetPreset = 'widely',
  years: AgeWindowYears = 4,
  handlers = { onChangePreset: vi.fn(), onChangeYears: vi.fn() },
) => {
  render(() => {
    return (
      <TargetPicker
        browsers={12}
        onChangePreset={handlers.onChangePreset}
        onChangeYears={handlers.onChangeYears}
        preset={preset}
        years={years}
      />
    );
  });

  return handlers;
};

describe('TargetPicker', () => {
  it('offers the baseline presets and a browser-age window', () => {
    renderPicker();

    expect(screen.getAllByRole('option').map((option) => {
      return option.textContent;
    })).toEqual(['Baseline Widely Available', 'Baseline 2022', 'Browser age']);
  });

  it('hides the years stepper unless the age window is chosen', () => {
    renderPicker('widely');

    expect(screen.queryByLabelText('More years')).toBeNull();
  });

  it('shows how far back the window reaches and what it covers', () => {
    renderPicker('age-4');

    expect(screen.getByText('4 years back · 12 browsers')).toBeInstanceOf(HTMLElement);
  });

  it('steps the window wider', () => {
    const handlers = renderPicker('age-4');

    fireEvent.click(screen.getByLabelText('More years'));

    expect(handlers.onChangeYears).toHaveBeenCalledWith(5);
  });

  it('steps the window narrower', () => {
    const handlers = renderPicker('age-4');

    fireEvent.click(screen.getByLabelText('Fewer years'));

    expect(handlers.onChangeYears).toHaveBeenCalledWith(3);
  });

  it('refuses to step below one year', () => {
    renderPicker('age-1', 1);

    expect(screen.getByLabelText('Fewer years')).toHaveProperty('disabled', true);
  });

  it('refuses to step beyond fifteen years', () => {
    renderPicker('age-15', 15);

    expect(screen.getByLabelText('More years')).toHaveProperty('disabled', true);
  });

  it('reports the preset the developer picks', () => {
    const handlers = renderPicker('widely');

    fireEvent.change(screen.getByLabelText('Compatibility target'), {
      target: { value: 'baseline-2022' },
    });

    expect(handlers.onChangePreset).toHaveBeenCalledWith('baseline-2022');
  });
});
