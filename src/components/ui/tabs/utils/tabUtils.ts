export interface TabDefinition {
  id: string;
  tabId: string;
  panelId: string;
  label: string;
  count: number;
}

export const tabIdForKey = (
  tabs: readonly TabDefinition[],
  activeId: string,
  key: string,
): string | undefined => {
  const activeIndex = tabs.findIndex((tab) => {
    return tab.id === activeId;
  });

  if (activeIndex < 0) {
    return undefined;
  }

  if (key === 'ArrowLeft') {
    const previousIndex = activeIndex === 0 ? tabs.length - 1 : activeIndex - 1;

    return tabs[previousIndex]?.id;
  }

  if (key === 'ArrowRight') {
    const nextIndex = activeIndex === tabs.length - 1 ? 0 : activeIndex + 1;

    return tabs[nextIndex]?.id;
  }

  if (key === 'Home') {
    return tabs[0]?.id;
  }

  if (key === 'End') {
    return tabs[tabs.length - 1]?.id;
  }

  return undefined;
};
