interface DragPoint { // narrow view of a pointer event, so the util needs no DOM
  clientX: number;
}

interface RailResizeInput {
  width: () => number;
  onResize: (width: number) => void;
}

interface RailResize {
  start: (point: DragPoint) => void;
  move: (point: DragPoint) => void;
  stop: () => void;
  nudge: (steps: number) => void;
}

interface DragOrigin {
  x: number;
  width: number;
}

export const RAIL_MIN_WIDTH = 180;

export const RAIL_MAX_WIDTH = 520;

export const RAIL_NUDGE_STEP = 16; // one arrow press, matching the grid's own column rhythm

export const clampRailWidth = (width: number): number => {
  return Math.min(Math.max(Math.round(width), RAIL_MIN_WIDTH), RAIL_MAX_WIDTH);
};

// The width at pointerdown is the anchor: reading it live would compound every rounding step.
export const createRailResize = (input: RailResizeInput): RailResize => {
  let origin: DragOrigin | null = null;

  return {
    start: (point) => {
      origin = { x: point.clientX, width: input.width() };
    },
    move: (point) => {
      if (origin === null) {
        return;
      }

      input.onResize(clampRailWidth(origin.width + point.clientX - origin.x));
    },
    stop: () => {
      origin = null;
    },
    nudge: (steps) => {
      input.onResize(clampRailWidth(input.width() + steps * RAIL_NUDGE_STEP));
    },
  };
};
