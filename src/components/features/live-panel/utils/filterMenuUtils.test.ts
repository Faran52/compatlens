import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  FILTER_MENU_EXIT_EASING,
  FILTER_MENU_EXIT_MS,
  playFilterMenuExit,
} from './filterMenuUtils';

import type { FilterMenuAnimation, FilterMenuElement } from './filterMenuUtils';

interface Played {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

const filterMenu = (finished: Promise<unknown>) => {
  const played: Played[] = [];
  const element: FilterMenuElement = {
    animate: (keyframes, options): FilterMenuAnimation => {
      played.push({ keyframes, options });

      return { finished };
    },
  };

  return { element, played };
};

describe('playFilterMenuExit', () => {
  it('slides the filter menu back left and fades it out', async () => {
    const { element, played } = filterMenu(Promise.resolve());

    await playFilterMenuExit(element, false);

    expect(played[0]?.keyframes).toStrictEqual([
      { transform: 'none', opacity: 1 },
      { transform: 'translateX(-100%)', opacity: 0 },
    ]);
  });

  it('holds the filter menu left at the end rather than letting it snap back', async () => {
    const { element, played } = filterMenu(Promise.resolve());

    await playFilterMenuExit(element, false);

    expect(played[0]?.options).toStrictEqual({
      duration: FILTER_MENU_EXIT_MS,
      easing: FILTER_MENU_EXIT_EASING,
      fill: 'forwards',
    });
  });

  it('closes at once when the reader asked for less motion', async () => {
    const { element, played } = filterMenu(Promise.resolve());

    await playFilterMenuExit(element, true);

    expect(played).toStrictEqual([]);
  });

  it('closes at once when there is no filter menu to animate', async () => {
    await expect(playFilterMenuExit(undefined, false)).resolves.toBeUndefined();
  });

  it('still closes when the animation is cancelled out from under it', async () => {
    const { element } = filterMenu(Promise.reject(new Error('cancelled')));

    await expect(playFilterMenuExit(element, false)).resolves.toBeUndefined();
  });
});
