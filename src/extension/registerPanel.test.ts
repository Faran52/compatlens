import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { registerCompatLensPanel } from './registerPanel';

describe('registerCompatLensPanel', () => {
  it('registers one CompatLens panel with the packaged entry', async () => {
    const create = vi.fn((
      _title: string,
      _iconPath: string,
      _pagePath: string,
      callback: (panel: object) => void,
    ) => {
      callback({});
    });

    await registerCompatLensPanel({ create });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      'CompatLens',
      'icons/panel-32.png',
      'panel.html',
      expect.any(Function),
    );
  });
});
