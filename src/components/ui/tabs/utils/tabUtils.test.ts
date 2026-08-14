import {
  describe,
  expect,
  it,
} from 'vitest';

import { tabForKey } from './tabUtils';

import type { TabDefinition } from '../Tabs';

const tabs: readonly TabDefinition[] = [
  { id: 'findings', tabId: 'findings-tab', panelId: 'findings-panel', label: 'Findings', count: 18 },
  { id: 'modernise', tabId: 'modernise-tab', panelId: 'modernise-panel', label: 'Modernise', count: 5 },
];

describe('tabForKey', () => {
  it.each([
    ['findings', 'ArrowRight', 'modernise'],
    ['modernise', 'ArrowRight', 'findings'],
    ['modernise', 'ArrowLeft', 'findings'],
    ['findings', 'ArrowLeft', 'modernise'],
    ['modernise', 'Home', 'findings'],
    ['findings', 'End', 'modernise'],
  ])('moves from %s with %s to %s', (active, key, expected) => {
    expect(tabForKey(tabs, active, key)?.id).toBe(expected);
  });

  it('carries the element id, so the caller can move focus without searching again', () => {
    expect(tabForKey(tabs, 'findings', 'ArrowRight')?.tabId).toBe('modernise-tab');
  });

  it('leaves unrelated keys to the browser', () => {
    expect(tabForKey(tabs, 'findings', 'Enter')).toBeUndefined();
  });

  it('does not select a tab when the active tab is absent', () => {
    expect(tabForKey(tabs, 'missing', 'ArrowRight')).toBeUndefined();
  });
});
