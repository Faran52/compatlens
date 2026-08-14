import type { ChromeDevToolsFacade } from './chromeTypes';

// DevTools keeps the panel across a navigation, but the document it was watching is gone with it.
export const subscribeToNavigation = (
  api: ChromeDevToolsFacade,
  onNavigated: (url: string) => void,
): (() => void) => {
  api.network.onNavigated.addListener(onNavigated);

  return () => {
    api.network.onNavigated.removeListener(onNavigated);
  };
};
