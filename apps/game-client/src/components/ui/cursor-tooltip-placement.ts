export type CursorPoint = { x: number; y: number };

export type BoxSize = { width: number; height: number };

export type CursorTooltipOffsets = {
  /** Gap between the cursor and the tooltip on the vertical axis. */
  sideOffset: number;
  /** Gap between the cursor and the tooltip on the horizontal axis. */
  alignOffset: number;
  /** Minimum distance kept from every viewport edge. */
  padding: number;
};

export type CursorTooltipPlacement = {
  left: number;
  top: number;
  side: "top" | "bottom";
  align: "start" | "end";
};

/**
 * Not `es-toolkit`'s `clamp`: a tooltip wider or taller than the viewport
 * makes `max` fall below `min`, and this collapses that inverted range onto
 * `min` (the padded top-left) instead of letting the upper bound win.
 */
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Places a tooltip next to the cursor the way Margonem's own tips are placed:
 * hanging off the bottom-left corner of the pointer, flipped to the right or
 * above it whenever the preferred spot would leave the viewport.
 */
export const placeTooltipAtCursor = (
  cursor: CursorPoint,
  size: BoxSize,
  viewport: BoxSize,
  { sideOffset, alignOffset, padding }: CursorTooltipOffsets,
): CursorTooltipPlacement => {
  let align: CursorTooltipPlacement["align"] = "end";
  let left = cursor.x - alignOffset - size.width;

  if (left < padding) {
    align = "start";
    left = cursor.x + alignOffset;
  }

  let side: CursorTooltipPlacement["side"] = "bottom";
  let top = cursor.y + sideOffset;

  if (top + size.height > viewport.height - padding) {
    side = "top";
    top = cursor.y - sideOffset - size.height;
  }

  return {
    left: clamp(left, padding, viewport.width - size.width - padding),
    top: clamp(top, padding, viewport.height - size.height - padding),
    side,
    align,
  };
};
