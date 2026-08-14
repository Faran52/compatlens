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

import { Tabs } from './Tabs';

const tabs = [
  { id: 'findings', tabId: 'findings-tab', panelId: 'findings-panel', label: 'Findings', count: 18 },
  { id: 'modernise', tabId: 'modernise-tab', panelId: 'modernise-panel', label: 'Modernise', count: 6 },
];

const renderTabs = (active = 'findings', onSelect = vi.fn()) => {
  render(() => {
    return <Tabs active={active} onSelect={onSelect} tabs={tabs} />;
  });

  return onSelect;
};

describe('Tabs', () => {
  it('counts what each tab holds', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: /Findings/ }).textContent).toContain('18');
    expect(screen.getByRole('tab', { name: /Modernise/ }).textContent).toContain('6');
  });

  it('marks the active tab for assistive technology', () => {
    renderTabs('modernise');

    expect(screen.getByRole('tab', { name: /Modernise/ }).getAttribute('aria-selected'))
      .toBe('true');
    expect(screen.getByRole('tab', { name: /Findings/ }).getAttribute('aria-selected'))
      .toBe('false');
  });

  it('reports the tab that was pressed', () => {
    const onSelect = renderTabs('findings', vi.fn());

    fireEvent.click(screen.getByRole('tab', { name: /Modernise/ }));

    expect(onSelect).toHaveBeenCalledWith('modernise');
  });

  it('associates each tab with its panel', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: /Findings/u }).id).toBe('findings-tab');
    expect(screen.getByRole('tab', { name: /Findings/u }).getAttribute('aria-controls'))
      .toBe('findings-panel');
  });

  it('leaves the inactive tab pointing at no panel', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: /Modernise/u }).getAttribute('aria-controls'))
      .toBeNull();
  });

  it('keeps only the active tab in the page tab order', () => {
    renderTabs('modernise');

    expect(screen.getByRole('tab', { name: /Modernise/u }).tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: /Findings/u }).tabIndex).toBe(-1);
  });

  it('selects and focuses the tab reached by an arrow key', () => {
    const onSelect = renderTabs('findings', vi.fn());
    const modernise = screen.getByRole('tab', { name: /Modernise/u });

    fireEvent.keyDown(screen.getByRole('tab', { name: /Findings/u }), { key: 'ArrowRight' });

    expect(onSelect).toHaveBeenCalledWith('modernise');
    expect(document.activeElement).toBe(modernise);
  });
});
