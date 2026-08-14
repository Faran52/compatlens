import type {
  DevToolsInspectedWindow,
  DevToolsNetwork,
  HarLog,
  InspectedResource,
} from './chromeTypes';

export const readHar = async (api: DevToolsNetwork): Promise<HarLog> => {
  return new Promise((resolve) => {
    api.getHAR((har) => {
      resolve(har);
    });
  });
};

export const readResources = async (
  api: DevToolsInspectedWindow,
): Promise<InspectedResource[]> => {
  return new Promise((resolve) => {
    // Firefox implements no getResources, so there the HAR is the only stylesheet source.
    if (api.getResources === undefined) {
      resolve([]);

      return;
    }

    api.getResources((resources) => {
      resolve(resources);
    });
  });
};
