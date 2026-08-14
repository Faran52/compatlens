export interface SheetAnimation {
  finished: Promise<unknown>;
}

export interface SheetElement { // narrow view of an element, so the util needs no DOM
  animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => SheetAnimation;
}

export const SHEET_EXIT_MS = 200;

// The entry curve reversed.
export const SHEET_EXIT_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)';

const EXIT_FRAMES: Keyframe[] = [
  { transform: 'none', opacity: 1 },
  { transform: 'translateY(100%)', opacity: 0 },
];

// Solid unmounts the moment the value clears, so the sheet has to finish leaving before it does.
export const playSheetExit = async (
  element: SheetElement | undefined,
  reducedMotion: boolean,
): Promise<void> => {
  if (element === undefined || reducedMotion) {
    return;
  }

  try {
    await element.animate(EXIT_FRAMES, {
      duration: SHEET_EXIT_MS,
      easing: SHEET_EXIT_EASING,
      fill: 'forwards',
    }).finished;
  }
  catch {
    return; // a cancelled animation still means the sheet should close
  }
};
