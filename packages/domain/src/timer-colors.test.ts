import { describe, expect, it } from "bun:test";
import { getTimerColorConfig } from "./timer-colors.js";

describe("getTimerColorConfig", () => {
  it("resolves selected default, custom, and overridden colors", () => {
    expect(
      getTimerColorConfig(
        "Tanroth",
        {
          Tanroth: "white",
        },
        {},
        {
          white: {
            backgroundColor: "#111",
            borderColor: "#222",
          },
        },
      ),
    ).toEqual({
      selectedColor: "white",
      customColor: undefined,
      overriddenColor: {
        backgroundColor: "#111",
        borderColor: "#222",
      },
    });

    expect(
      getTimerColorConfig(
        "Mushita",
        {
          Mushita: "custom-red",
        },
        {
          "custom-red": {
            id: "custom-red",
            name: "Custom Red",
            backgroundColor: "#faa",
            borderColor: "#f00",
          },
        },
        {},
      ),
    ).toEqual({
      selectedColor: "custom-red",
      customColor: {
        id: "custom-red",
        name: "Custom Red",
        backgroundColor: "#faa",
        borderColor: "#f00",
      },
      overriddenColor: undefined,
    });
  });
});
