import { type DevToolsPanelsApi, registerCompatLensPanel } from '@extension';

interface DevToolsChromeGlobal {
  devtools: {
    panels: DevToolsPanelsApi;
  };
}

declare const chrome: DevToolsChromeGlobal; // the only place the ambient global is touched

void registerCompatLensPanel(chrome.devtools.panels);
