import { describe, expect, it } from "vitest";
import {
  createDefaultScoringAction,
  createDefaultScoringCondition,
} from "./scoring-condition-defaults";

describe("createDefaultScoringCondition", () => {
  it("returns a valid boolean condition", () => {
    expect(createDefaultScoringCondition("BOOLEAN")).toEqual({
      type: "BOOLEAN",
      factor: "eligible",
      value: true,
    });
  });

  it("returns a valid kill time window condition", () => {
    expect(createDefaultScoringCondition("KILL_TIME_IN_WINDOW")).toEqual({
      type: "KILL_TIME_IN_WINDOW",
      from: "00:00",
      to: "23:59",
    });
  });

  it("returns a valid respawn coverage condition", () => {
    expect(createDefaultScoringCondition("RESPAWN_WINDOW_COVERAGE")).toEqual({
      type: "RESPAWN_WINDOW_COVERAGE",
      from: "00:00",
      to: "23:59",
      operator: ">=",
      value: 0,
    });
  });
});

describe("createDefaultScoringAction", () => {
  it("returns a zero-base action without points", () => {
    expect(createDefaultScoringAction("ZERO_BASE")).toEqual({
      type: "ZERO_BASE",
    });
  });

  it("returns a points-based action with default points", () => {
    expect(createDefaultScoringAction("ADD_BONUS")).toEqual({
      type: "ADD_BONUS",
      points: 0,
    });
  });
});
