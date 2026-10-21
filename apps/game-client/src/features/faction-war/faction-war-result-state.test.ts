import type { FactionWarResponseDto } from "@lootlog/client/main";
import { describe, expect, it } from "vitest";
import { flagFactionWar } from "./faction-war-pick-state";
import {
  getFactionWarOutcome,
  shouldShowFactionWarResult,
} from "./faction-war-result-state";

const war = (
  status: FactionWarResponseDto["status"],
  id = "2026-barbatos-tanroth",
) => ({ id, status });

describe("shouldShowFactionWarResult", () => {
  it("shows an ended war's result until this browser saw it", () => {
    const seen = flagFactionWar({}, "2026-barbatos-tanroth");

    expect(shouldShowFactionWarResult(war("ENDED"), {})).toBe(true);
    expect(shouldShowFactionWarResult(war("ENDED"), seen)).toBe(false);
    expect(
      shouldShowFactionWarResult(war("ENDED", "2027-next-war"), seen),
    ).toBe(true);
  });

  it("waits for the war to end", () => {
    expect(shouldShowFactionWarResult(war("RUNNING"), {})).toBe(false);
    expect(shouldShowFactionWarResult(war("UPCOMING"), {})).toBe(false);
    expect(shouldShowFactionWarResult(undefined, {})).toBe(false);
  });
});

describe("getFactionWarOutcome", () => {
  it("names the single winner, a tie, or no winner", () => {
    expect(getFactionWarOutcome({ winners: ["TANROTH"] })).toEqual({
      kind: "winner",
      faction: "TANROTH",
    });
    expect(getFactionWarOutcome({ winners: ["BARBATOS", "TANROTH"] })).toEqual({
      kind: "tie",
    });
    expect(getFactionWarOutcome({ winners: [] })).toEqual({ kind: "none" });
  });
});
