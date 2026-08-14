export interface DevToolsPanelsApi {
  create(title: string, iconPath: string, pagePath: string, callback: () => void): void;
}

export const registerCompatLensPanel = (api: DevToolsPanelsApi): Promise<void> => {
  return new Promise((resolve) => {
    api.create('CompatLens', 'icons/panel-32.png', 'panel.html', () => { // callback-only
      resolve();
    });
  });
};
