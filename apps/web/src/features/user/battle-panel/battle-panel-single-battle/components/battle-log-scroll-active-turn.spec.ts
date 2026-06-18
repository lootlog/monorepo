import { describe, expect, it } from "vitest";
import { getBattleLogScrollActiveTurn } from "./battle-log-scroll-active-turn";

describe("getBattleLogScrollActiveTurn", () => {
  const turnPositions = [
    { turn: 1, top: 120, bottom: 160 },
    { turn: 2, top: 160, bottom: 210 },
    { turn: 3, top: 230, bottom: 280 },
  ];

  it("returns the turn covering the visible top anchor", () => {
    expect(
      getBattleLogScrollActiveTurn({
        turnPositions,
        viewportTop: 140,
        viewportBottom: 320,
      }),
    ).toBe(1);
  });

  it("uses sticky chart occlusion as the active top edge", () => {
    expect(
      getBattleLogScrollActiveTurn({
        turnPositions,
        viewportTop: 80,
        viewportBottom: 320,
        occlusionBottom: 180,
      }),
    ).toBe(2);
  });

  it("returns the closest visible turn when no row contains the anchor", () => {
    expect(
      getBattleLogScrollActiveTurn({
        turnPositions,
        viewportTop: 200,
        viewportBottom: 320,
      }),
    ).toBe(3);
  });

  it("returns null when no turns are visible", () => {
    expect(
      getBattleLogScrollActiveTurn({
        turnPositions,
        viewportTop: 20,
        viewportBottom: 80,
      }),
    ).toBeNull();
  });
});
