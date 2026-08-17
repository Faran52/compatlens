import { playExitAnimation } from '@utils';

import type { ExitAnimationElement, ExitDirection } from '@utils';

interface SheetDialog extends ExitAnimationElement { // adds what opening and closing needs
  showModal: () => void;
  close: () => void;
}

export interface SheetFocusable { // narrow view of a focus target, so the util needs no DOM
  focus: (options?: FocusOptions) => void;
}

// A caller holding a ref names its own opener; a row has none, so the focused element stands in.
export const openerFor = (
  named: SheetFocusable | undefined,
  focused: EventTarget | null,
): SheetFocusable | undefined => {
  if (named !== undefined) {
    return named;
  }

  return focused instanceof HTMLElement ? focused : undefined;
};

// Focus follows the sheet either way; only a modal one also needs the top layer and a backdrop.
export const openSheet = (
  dialog: SheetDialog | undefined,
  closeButton: SheetFocusable | undefined,
  modal: boolean,
): void => {
  if (modal) {
    dialog?.showModal();
  }

  // The sheet is still at its entrance keyframe's `from` position, off the edge it slides in
  // from, so a default focus() makes the browser scroll an ancestor to chase it there.
  closeButton?.focus({ preventScroll: true });
};

// The sheet is gone by the time the browser would restore focus, so it is handed back by name.
export const closeSheet = async (
  dialog: SheetDialog | undefined,
  exit: ExitDirection,
  reducedMotion: boolean,
  opener?: SheetFocusable,
): Promise<void> => {
  await playExitAnimation(dialog, exit, reducedMotion);
  dialog?.close();
  opener?.focus();
};

export const isSheetBackdropClick = (target: EventTarget | null, dialog: EventTarget): boolean => {
  return target === dialog;
};
