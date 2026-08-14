import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  clampRailWidth,
  createRailResize,
  RAIL_MAX_WIDTH,
  RAIL_MIN_WIDTH,
  RAIL_NUDGE_STEP,
} from './railResizeUtils';

const resizeFrom = (start: number) => {
  const widths: number[] = [];
  let width = start;

  const resize = createRailResize({
    width: () => {
      return width;
    },
    onResize: (next) => {
      width = next;
      widths.push(next);
    },
  });

  return { resize, widths };
};

describe('clampRailWidth', () => {
  it('keeps a sensible width untouched', () => {
    expect(clampRailWidth(300)).toBe(300);
  });

  it('refuses to shrink the rail past the point its labels can be read', () => {
    expect(clampRailWidth(20)).toBe(RAIL_MIN_WIDTH);
  });

  it('refuses to let the rail crowd out the grid it is filtering', () => {
    expect(clampRailWidth(2000)).toBe(RAIL_MAX_WIDTH);
  });

  it('rounds to a whole pixel, since a fractional column edge shimmers', () => {
    expect(clampRailWidth(300.6)).toBe(301);
  });
});

describe('createRailResize', () => {
  it('follows the pointer once a drag has started', () => {
    const { resize, widths } = resizeFrom(240);

    resize.start({ clientX: 100 });
    resize.move({ clientX: 160 });

    expect(widths).toEqual([300]);
  });

  it('ignores movement before the handle was grabbed', () => {
    const { resize, widths } = resizeFrom(240);

    resize.move({ clientX: 900 });

    expect(widths).toEqual([]);
  });

  it('stops following once the pointer is released', () => {
    const { resize, widths } = resizeFrom(240);

    resize.start({ clientX: 100 });
    resize.stop();
    resize.move({ clientX: 400 });

    expect(widths).toEqual([]);
  });

  it('measures from where the drag began, so rounding cannot compound', () => {
    const { resize, widths } = resizeFrom(240);

    resize.start({ clientX: 100 });
    resize.move({ clientX: 110 });
    resize.move({ clientX: 120 });

    expect(widths).toEqual([250, 260]);
  });

  it('reports whether a drag is under way', () => {
    const { resize } = resizeFrom(240);

    expect(resize.dragging()).toBe(false);
    resize.start({ clientX: 100 });
    expect(resize.dragging()).toBe(true);
    resize.stop();
    expect(resize.dragging()).toBe(false);
  });

  it('moves by one step per arrow press, in either direction', () => {
    const { resize, widths } = resizeFrom(240);

    resize.nudge(1);
    resize.nudge(-1);

    expect(widths).toEqual([240 + RAIL_NUDGE_STEP, 240]);
  });

  it('stays put for a key that is not an arrow', () => {
    const { resize, widths } = resizeFrom(240);

    resize.nudge(0);

    expect(widths).toEqual([240]);
  });

  it('clamps a drag that overshoots rather than following it off the panel', () => {
    const { resize, widths } = resizeFrom(240);

    resize.start({ clientX: 100 });
    resize.move({ clientX: 5000 });

    expect(widths).toEqual([RAIL_MAX_WIDTH]);
  });
});
