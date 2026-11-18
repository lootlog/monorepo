import { describe, expect, it } from "vitest";
import { placeTooltipAtCursor } from "./cursor-tooltip-placement";

const size = { width: 100, height: 30 };

const viewport = { width: 800, height: 600 };

const offsets = { sideOffset: 14, alignOffset: 6, padding: 8 };

describe("placeTooltipAtCursor", () => {
  it("hangs the tooltip off the bottom-left corner of the cursor", () => {
    expect(
      placeTooltipAtCursor({ x: 400, y: 300 }, size, viewport, offsets),
    ).toEqual({ left: 294, top: 314, side: "bottom", align: "end" });
  });

  it("moves to the right of the cursor when the left edge is too close", () => {
    expect(
      placeTooltipAtCursor({ x: 50, y: 300 }, size, viewport, offsets),
    ).toEqual({ left: 56, top: 314, side: "bottom", align: "start" });
  });

  it("moves above the cursor when the bottom edge is too close", () => {
    expect(
      placeTooltipAtCursor({ x: 400, y: 580 }, size, viewport, offsets),
    ).toEqual({ left: 294, top: 536, side: "top", align: "end" });
  });

  it("goes to the top-right of the cursor in the bottom-left corner", () => {
    expect(
      placeTooltipAtCursor({ x: 20, y: 590 }, size, viewport, offsets),
    ).toEqual({ left: 26, top: 546, side: "top", align: "start" });
  });

  it("keeps a growing tooltip on one side of the cursor while it unfolds", () => {
    const growing = { ...offsets, growsWhileOpen: true };
    const cursor = { x: 400, y: 380 };

    // In the lower half it opens above the cursor although it fits below,
    // so unfolding to a height that would not fit below does not flip it.
    const collapsed = placeTooltipAtCursor(cursor, size, viewport, growing);

    const unfolded = placeTooltipAtCursor(
      cursor,
      { width: 100, height: 300 },
      viewport,
      growing,
    );

    expect(collapsed).toMatchObject({ side: "top", top: 336 });
    expect(unfolded).toMatchObject({ side: "top", top: 66 });
  });

  it("keeps the tooltip inside the viewport padding when flipping is not enough", () => {
    const placement = placeTooltipAtCursor(
      { x: 780, y: 10 },
      size,
      viewport,
      offsets,
    );

    expect(placement.left).toBe(674);
    expect(placement.top).toBe(24);
  });
});
