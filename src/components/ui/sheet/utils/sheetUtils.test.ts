import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  closeSheet,
  isSheetBackdropClick,
  openerFor,
  openSheet,
} from './sheetUtils';

import type { ExitAnimation, ExitAnimationResult } from '@utils';

const finishedAnimation = (): ExitAnimationResult => {
  return { playState: 'finished' };
};

const sheetFor = () => {
  const cancel = vi.fn();
  const dialog = {
    animate: (): ExitAnimation => {
      return { cancel, finished: Promise.resolve(finishedAnimation()) };
    },
    showModal: vi.fn(),
    close: vi.fn(),
  };

  return { cancel, closeButton: { focus: vi.fn() }, dialog };
};

describe('openerFor', () => {
  it('prefers the opener the caller named', () => {
    const named = { focus: vi.fn() };

    expect(openerFor(named, document.createElement('button'))).toBe(named);
  });

  it('falls back to whatever had focus when no opener was named', () => {
    const focused = document.createElement('button');

    expect(openerFor(undefined, focused)).toBe(focused);
  });

  it('has nothing to return to when focus was nowhere', () => {
    expect(openerFor(undefined, null)).toBeUndefined();
  });
});

describe('openSheet', () => {
  it('opens a modal sheet and moves focus to the control that closes it', () => {
    const { closeButton, dialog } = sheetFor();

    openSheet(dialog, closeButton, true);

    expect(dialog.showModal).toHaveBeenCalledTimes(1);
    expect(closeButton.focus).toHaveBeenCalledTimes(1);
  });

  it('moves focus into a plain sheet too, so opening one is announced', () => {
    const { closeButton, dialog } = sheetFor();

    openSheet(dialog, closeButton, false);

    expect(dialog.showModal).not.toHaveBeenCalled();
    expect(closeButton.focus).toHaveBeenCalledTimes(1);
  });

  it('opens nothing before the sheet is rendered', () => {
    expect(() => {
      openSheet(undefined, undefined, true);
    }).not.toThrow();
  });
});

describe('closeSheet', () => {
  it('closes the sheet only once it has finished leaving', async () => {
    const { cancel, dialog } = sheetFor();

    await closeSheet(dialog, 'left', false);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });

  it('hands focus back to whatever opened it, once the sheet is gone', async () => {
    const { dialog } = sheetFor();
    const opener = { focus: vi.fn() };

    await closeSheet(dialog, 'down', true, opener);

    expect(dialog.close).toHaveBeenCalledTimes(1);
    expect(opener.focus).toHaveBeenCalledTimes(1);
  });

  it('closes without an opener to return to', async () => {
    const { dialog } = sheetFor();

    await expect(closeSheet(dialog, 'down', true)).resolves.toBeUndefined();
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });

  it('closes at once when the developer asked for no motion', async () => {
    const { cancel, dialog } = sheetFor();

    await closeSheet(dialog, 'down', true);

    expect(cancel).not.toHaveBeenCalled();
    expect(dialog.close).toHaveBeenCalledTimes(1);
  });

  it('closes nothing before the sheet is rendered', async () => {
    await expect(closeSheet(undefined, 'down', false)).resolves.toBeUndefined();
  });
});

describe('isSheetBackdropClick', () => {
  it('recognises a click on the dialog itself as a backdrop click', () => {
    const dialog = document.createElement('dialog');

    expect(isSheetBackdropClick(dialog, dialog)).toBe(true);
  });

  it('rejects a click from content inside the dialog', () => {
    const dialog = document.createElement('dialog');
    const content = document.createElement('div');

    dialog.append(content);

    expect(isSheetBackdropClick(content, dialog)).toBe(false);
  });
});
