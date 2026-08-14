import {
  describe,
  expect,
  it,
} from 'vitest';

import { tabIdForKey } from './tabUtils';

import type { TabDefinition } from './tabUtils';

const tabs: readonly TabDefinition[] = [
  { id: 'findings', tabId: 'findings-tab', panelId: 'findings-panel', label: 'Findings', count: 18 },
  { id: 'modernise', tabId: 'modernise-tab', panelId: 'modernise-panel', label: 'Modernise', count: 5 },
];

describe('tabIdForKey', () => {
  it.each([
    ['findings', 'ArrowRight', 'modernise'],
    ['modernise', 'ArrowRight', 'findings'],
    ['modernise', 'ArrowLeft', 'findings'],
    ['findings', 'ArrowLeft', 'modernise'],
    ['modernise', 'Home', 'findings'],
    ['findings', 'End', 'modernise'],
  ])('moves from %s with %s to %s', (active, key, expected) => {
    expect(tabIdForKey(tabs, active, key)).toBe(expected);
  });

  it('leaves unrelated keys to the browser', () => {
    expect(tabIdForKey(tabs, 'findings', 'Enter')).toBeUndefined();
  });

  it('does not select a tab when the active tab is absent', () => {
    expect(tabIdForKey(tabs, 'missing', 'ArrowRight')).toBeUndefined();
  });
});
