import { describe, expect, it } from "vitest";
import {
  brightenHexColor,
  getTimerColorConfig,
  resolveTimerTileColors,
} from "./timer-colors";

describe("timer-colors", () => {
  it("resolves selected default, custom, and overridden colors", () => {
    expect(
      getTimerColorConfig(
        "Tanroth",
        { Tanroth: "white" },
        {},
        { white: { backgroundColor: "#111", borderColor: "#222" } },
      ),
    ).toEqual({
      selectedColor: "white",
      customColor: undefined,
      overriddenColor: { backgroundColor: "#111", borderColor: "#222" },
    });

    const customRed = {
      id: "custom-red",
      name: "Custom Red",
      backgroundColor: "#faa",
      borderColor: "#f00",
    };

    expect(
      getTimerColorConfig(
        "Mushita",
        { Mushita: "custom-red" },
        { "custom-red": customRed },
        {},
      ),
    ).toEqual({
      selectedColor: "custom-red",
      customColor: customRed,
      overriddenColor: undefined,
    });
  });

  it("paints stock colours with classes and explicit colours inline with a hover shade", () => {
    expect(
      resolveTimerTileColors({
        selectedColor: "red",
        customColor: undefined,
        overriddenColor: undefined,
      }),
    ).toEqual({
      className: "ll:bg-red-500/20 ll:hover:bg-red-500/40 ll:border-red-500",
    });

    expect(
      resolveTimerTileColors({
        selectedColor: "red",
        customColor: undefined,
        overriddenColor: {
          backgroundColor: "#10203033",
          borderColor: "#abcdef",
        },
      }),
    ).toEqual({
      style: {
        backgroundColor: "#10203033",
        borderColor: "#abcdef",
        "--ll-tile-bg-hover": "#43536333",
      },
    });
  });

  it("keeps the alpha channel and clamps channels when brightening", () => {
    expect(brightenHexColor("#10203033", 20)).toBe("#43536333");
    expect(brightenHexColor("#f0f0f0", 20)).toBe("#ffffff");
  });
});
