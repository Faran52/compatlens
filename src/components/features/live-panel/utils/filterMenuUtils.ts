export interface FilterMenuAnimation {
  finished: Promise<unknown>;
}

export interface FilterMenuElement { // narrow view of an element, so the util needs no DOM
  animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => FilterMenuAnimation;
}

export const FILTER_MENU_EXIT_MS = 200;

// The entry curve reversed.
export const FILTER_MENU_EXIT_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)';

const EXIT_FRAMES: Keyframe[] = [
  { transform: 'none', opacity: 1 },
  { transform: 'translateX(-100%)', opacity: 0 },
];

export const playFilterMenuExit = async (
  element: FilterMenuElement | undefined,
  reducedMotion: boolean,
): Promise<void> => {
  if (element === undefined || reducedMotion) {
    return;
  }

  try {
    await element.animate(EXIT_FRAMES, {
      duration: FILTER_MENU_EXIT_MS,
      easing: FILTER_MENU_EXIT_EASING,
      fill: 'forwards',
    }).finished;
  }
  catch {
    return; // a cancelled animation still means the filter menu should close
  }
};
