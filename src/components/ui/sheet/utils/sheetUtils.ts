import { playExitAnimation } from '@utils';

import type { ExitAnimationElement, ExitDirection } from '@utils';

interface SheetDialog extends ExitAnimationElement { // adds what opening and closing needs
  showModal: () => void;
  close: () => void;
}

export interface SheetFocusable { // narrow view of a focus target, so the util needs no DOM
  focus: () => void;
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

  closeButton?.focus();
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

/**
 * The dialog's own platform behaviour, wired to the element rather than through JSX props. Escape is handled here
 * explicitly because `cancel` fires only for a modal dialog, so a non-modal sheet had no keyboard dismissal at all.
 *
 * The real `HTMLDialogElement`, unlike the narrow structural types above: this registers listeners, so there is no
 * DOM-free view of it that still says what the three events carry.
 */
export const wireSheetDismissal = (dialog: HTMLDialogElement | undefined, close: () => void): void => {
  dialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  dialog?.addEventListener('click', (event) => {
    if (isSheetBackdropClick(event.target, dialog)) {
      close();
    }
  });

  dialog?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
};
