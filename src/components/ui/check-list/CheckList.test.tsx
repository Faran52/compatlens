import {
  fireEvent,
  render,
  screen,
} from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { CheckList } from './CheckList';

import type { CheckListRow } from './CheckList';

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

  it('says what the number counts, since the column has no room to', () => {
    renderList([row({ count: { value: 0, noun: 'findings at this severity' } })]);

    expect(screen.getByText('0').getAttribute('title')).toBe('0 findings at this severity');
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

  it('keeps focus on the checkbox when activating it replaces its row data', () => {
    const [rows, setRows] = createSignal<readonly CheckListRow[]>([]);
    const onToggle = (): void => {
      setRows([row({ checked: false, onToggle })]);
    };

    setRows([row({ onToggle })]);
    render(() => {
      return <CheckList heading="Chromium Engine" rows={rows()} />;
    });

    const checkbox = screen.getByRole('checkbox');

    if (!(checkbox instanceof HTMLInputElement)) {
      throw new Error('The checklist control is not a checkbox.');
    }

    checkbox.focus();
    fireEvent.click(checkbox);

    expect(screen.getByRole('checkbox')).toBe(checkbox);
    expect(document.activeElement).toBe(checkbox);
  });
});
