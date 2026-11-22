export type CursorPoint = { x: number; y: number };

export type BoxSize = { width: number; height: number };

export type CursorTooltipOffsets = {
  sideOffset: number;
  alignOffset: number;
  padding: number;
  growsWhileOpen?: boolean;
};

export type CursorTooltipPlacement = {
  left: number;
  top: number;
  side: "top" | "bottom";
  align: "start" | "end";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const placeTooltipAtCursor = (
  cursor: CursorPoint,
  size: BoxSize,
  viewport: BoxSize,
  { sideOffset, alignOffset, padding, growsWhileOpen }: CursorTooltipOffsets,
): CursorTooltipPlacement => {
  let align: CursorTooltipPlacement["align"] = "end";
  let left = cursor.x - alignOffset - size.width;

  if (left < padding) {
    align = "start";
    left = cursor.x + alignOffset;
  }

  let side: CursorTooltipPlacement["side"] = "bottom";
  let top = cursor.y + sideOffset;

  const flipsUp = growsWhileOpen
    ? cursor.y > viewport.height / 2
    : top + size.height > viewport.height - padding;

  if (flipsUp) {
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
