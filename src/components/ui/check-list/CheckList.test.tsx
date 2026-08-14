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

import { CheckList } from './CheckList';

import type { CheckListRow } from './utils/checkListUtils';

const row = (overrides: Partial<CheckListRow> = {}): CheckListRow => {
  return {
    label: 'Chrome',
    checked: true,
    active: true,
    count: { value: 3, noun: 'findings at this severity' },
    onToggle: vi.fn(),
    ...overrides,
  };
};

const renderList = (rows: readonly CheckListRow[] = [row()]) => {
  return render(() => {
    return <CheckList heading="Chromium Engine" rows={rows} />;
  });
};

describe('CheckList', () => {
  it('heads the section and lists what can be checked', () => {
    renderList();

    expect(screen.getByRole('heading', { name: 'Chromium Engine' })).toBeInstanceOf(HTMLElement);
    expect(screen.getByRole('checkbox')).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByText('Chrome')).toBeInstanceOf(HTMLElement);
  });

  it('says nothing at all when the section has no rows', () => {
    const { container } = renderList([]);

    expect(container.textContent).toBe('');
  });

  it('counts an active row and marks it as being checked', () => {
    renderList();

    expect(screen.getByText('3')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('Chrome').closest('label')?.getAttribute('data-active')).toBe('true');
  });

  it('keeps an inactive row listed and marks it as not being counted', () => {
    renderList([row({ active: false, checked: false })]);

    expect(screen.getByText('Chrome').closest('label')?.getAttribute('data-active')).toBe('false');
  });

  it('shows no number at all for a row that carries no count', () => {
    renderList([row({ count: undefined })]);

    expect(screen.getByText('Chrome')).toBeInstanceOf(HTMLElement);
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows the badge and pinned version a row carries', () => {
    renderList([row({ badge: 'retired 2022', meta: '≥ 121' })]);

    expect(screen.getByText('retired 2022')).toBeInstanceOf(HTMLElement);
    expect(screen.getByText('≥ 121')).toBeInstanceOf(HTMLElement);
  });

  it('keeps a sentence off the label line, so a badged row still reads its name', () => {
    renderList([row({ badge: 'retired 2021', note: 'no release inside this window' })]);

    const note = screen.getByText('no release inside this window');

    expect(note.closest('span')?.parentElement?.tagName).toBe('LABEL');
    expect(screen.getByText('Chrome').closest('span')).not.toBe(note.closest('span'));
  });

  it('asks the row that was clicked to toggle', () => {
    const onToggle = vi.fn();

    renderList([row({ onToggle })]);
    fireEvent.click(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
