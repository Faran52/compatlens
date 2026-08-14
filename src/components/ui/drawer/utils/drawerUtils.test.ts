import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  playSheetExit,
  SHEET_EXIT_EASING,
  SHEET_EXIT_MS,
} from './drawerUtils';

import type { SheetAnimation, SheetElement } from './drawerUtils';

interface Played {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

const sheet = (finished: Promise<unknown>) => {
  const played: Played[] = [];
  const element: SheetElement = {
    animate: (keyframes, options): SheetAnimation => {
      played.push({ keyframes, options });

      return { finished };
    },
  };

  return { element, played };
};

describe('playSheetExit', () => {
  it('slides the sheet back down and fades it out', async () => {
    const { element, played } = sheet(Promise.resolve());

    await playSheetExit(element, false);

    expect(played[0]?.keyframes).toStrictEqual([
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(100%)', opacity: 0 },
    ]);
  });

  it('holds the sheet down at the end rather than letting it snap back', async () => {
    const { element, played } = sheet(Promise.resolve());

    await playSheetExit(element, false);

    expect(played[0]?.options).toStrictEqual({
      duration: SHEET_EXIT_MS,
      easing: SHEET_EXIT_EASING,
      fill: 'forwards',
    });
  });

  it('closes at once when the reader asked for less motion', async () => {
    const { element, played } = sheet(Promise.resolve());

    await playSheetExit(element, true);

    expect(played).toStrictEqual([]);
  });

  it('closes at once when there is no sheet to animate', async () => {
    await expect(playSheetExit(undefined, false)).resolves.toBeUndefined();
  });

  it('still closes when the animation is cancelled out from under it', async () => {
    const { element } = sheet(Promise.reject(new Error('cancelled')));

    await expect(playSheetExit(element, false)).resolves.toBeUndefined();
  });
});
