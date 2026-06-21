import { describe, expect, it } from "vitest";
import { getBattlePanelSelectedTurn } from "./battle-panel-single-battle-state";

describe("battle panel single battle state", () => {
  it("uses the requested URL turn when it exists in the timeline", () => {
    expect(
      getBattlePanelSelectedTurn({
        availableTurns: [1, 2, 3],
        requestedTurn: 2,
        selectedTurn: 1,
      }),
    ).toBe(2);
  });

  it("falls back to the selected turn when the URL turn is invalid", () => {
    expect(
      getBattlePanelSelectedTurn({
        availableTurns: [1, 2, 3],
        requestedTurn: 99,
        selectedTurn: 3,
      }),
    ).toBe(3);
  });

  it("falls back to the first available turn for missing or invalid state", () => {
    expect(
      getBattlePanelSelectedTurn({
        availableTurns: [4, 5],
        requestedTurn: 99,
        selectedTurn: 100,
      }),
    ).toBe(4);
  });
});
