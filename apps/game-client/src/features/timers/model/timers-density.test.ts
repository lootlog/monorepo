import { describe, expect, it } from "vitest";
import { getTimersDensityStyle } from "./timers-density";

describe("getTimersDensityStyle", () => {
  it.each([
    [70, "7.7px", "14px"],
    [100, "11px", "20px"],
    [150, "16.5px", "30px"],
  ])(
    "scales the tile typography and row height at %s%%",
    (fontScalePercent, fontSize, rowMinHeight) => {
      const style = getTimersDensityStyle({
        fontScalePercent,
        gapPx: 3,
        minColumnWidth: 130,
      });

      expect(style["--ll-timers-font-size"]).toBe(fontSize);
      expect(style["--ll-timers-row-min-height"]).toBe(rowMinHeight);
      expect(style["--ll-timers-gap"]).toBe("3px");
      expect(style["--ll-timers-min-column"]).toBe("130px");
    },
  );
});
