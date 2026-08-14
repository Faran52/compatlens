export type ExitDirection = 'down' | 'left';

export interface ExitAnimationResult {
  readonly playState: AnimationPlayState;
}

export interface ExitAnimation {
  cancel: () => void;
  finished: Promise<ExitAnimationResult>;
}

export interface ExitAnimationElement { // narrow view of an element, so the util needs no DOM
  animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => ExitAnimation;
}

const EXIT_MS = 200;

const EXIT_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)'; // the shared entry curve reversed

const EXIT_OFFSETS: Readonly<Record<ExitDirection, string>> = {
  down: 'translateY(100%)',
  left: 'translateX(-100%)',
};

// Solid unmounts the moment the value clears, so a surface has to finish leaving before it does.
export const playExitAnimation = async (
  element: ExitAnimationElement | undefined,
  direction: ExitDirection,
  reducedMotion: boolean,
): Promise<void> => {
  if (element === undefined || reducedMotion) {
    return;
  }

  try {
    const animation = element.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: EXIT_OFFSETS[direction], opacity: 0 },
      ],
      {
        duration: EXIT_MS,
        easing: EXIT_EASING,
        fill: 'forwards',
      },
    );

    try {
      await animation.finished;
    }
    finally {
      animation.cancel(); // forwards fill would otherwise strand a reopened surface off screen
    }
  }
  catch {
    return; // a cancelled animation still means the surface should close
  }
};
