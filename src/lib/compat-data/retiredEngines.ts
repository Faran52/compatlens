import type { EngineId } from '@engine';

// Editorial, not BCD: browser-compat-data records versions and engines, never end-of-life dates.
export const retiredEngines: Readonly<Partial<Record<EngineId, string>>> = {
  Trident: '2022', // Internet Explorer retired 15 June 2022
  EdgeHTML: '2021', // Edge Legacy support ended 9 March 2021
  Presto: '2013', // Opera moved to Blink with version 15
};
