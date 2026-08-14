import type { TabDefinition } from '../Tabs';

// Returns the tab rather than its id, so the caller needs no second lookup to reach its element.
export const tabForKey = (
  tabs: readonly TabDefinition[],
  activeId: string,
  key: string,
): TabDefinition | undefined => {
  const activeIndex = tabs.findIndex((tab) => {
    return tab.id === activeId;
  });

  if (activeIndex < 0) {
    return undefined;
  }

  if (key === 'ArrowLeft') {
    return tabs[activeIndex === 0 ? tabs.length - 1 : activeIndex - 1];
  }

  if (key === 'ArrowRight') {
    return tabs[activeIndex === tabs.length - 1 ? 0 : activeIndex + 1];
  }

  if (key === 'Home') {
    return tabs[0];
  }

  if (key === 'End') {
    return tabs[tabs.length - 1];
  }

  return undefined;
};
