import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { playExitAnimation } from './exitAnimationUtils';

import type {
  ExitAnimation,
  ExitAnimationElement,
  ExitAnimationResult,
} from './exitAnimationUtils';

interface Played {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

const finishedAnimation = (): ExitAnimationResult => {
  return { playState: 'finished' };
};

const surface = (finished: Promise<ExitAnimationResult>) => {
  const played: Played[] = [];
  const cancel = vi.fn();
  const element: ExitAnimationElement = {
    animate: (keyframes, options): ExitAnimation => {
      played.push({ keyframes, options });

      return { cancel, finished };
    },
  };

  return { cancel, element, played };
};

describe('playExitAnimation', () => {
  it('slides a sheet back down and fades it out', async () => {
    const { element, played } = surface(Promise.resolve(finishedAnimation()));

    await playExitAnimation(element, 'down', false);

    expect(played[0]?.keyframes).toStrictEqual([
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(100%)', opacity: 0 },
    ]);
  });

  it('slides a drawer back left and fades it out', async () => {
    const { element, played } = surface(Promise.resolve(finishedAnimation()));

    await playExitAnimation(element, 'left', false);

    expect(played[0]?.keyframes).toStrictEqual([
      { transform: 'none', opacity: 1 },
      { transform: 'translateX(-100%)', opacity: 0 },
    ]);
  });

  it('holds the surface at the end rather than letting it snap back', async () => {
    const { element, played } = surface(Promise.resolve(finishedAnimation()));

    await playExitAnimation(element, 'down', false);

    expect(played[0]?.options).toStrictEqual({
      duration: 200,
      easing: 'cubic-bezier(0.32, 0, 0.67, 0)',
      fill: 'forwards',
    });
  });

  it('removes the finished effect before the surface can reopen', async () => {
    const { cancel, element } = surface(Promise.resolve(finishedAnimation()));

    await playExitAnimation(element, 'left', false);

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('closes at once when the reader asked for less motion', async () => {
    const { element, played } = surface(Promise.resolve(finishedAnimation()));

    await playExitAnimation(element, 'down', true);

    expect(played).toStrictEqual([]);
  });

  it('closes at once when there is no surface to animate', async () => {
    await expect(playExitAnimation(undefined, 'down', false)).resolves.toBeUndefined();
  });

  it('still closes when the animation is cancelled out from under it', async () => {
    const { element } = surface(Promise.reject<ExitAnimationResult>(new Error('cancelled')));

    await expect(playExitAnimation(element, 'left', false)).resolves.toBeUndefined();
  });
});
