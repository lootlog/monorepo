import { describe, expect, it } from "vitest";
import { getBattleTimelinePayloadTurn } from "./battle-hp-timeline-point.utils";

describe("getBattleTimelinePayloadTurn", () => {
  it("returns numeric turn from recharts payload", () => {
    expect(getBattleTimelinePayloadTurn({ turn: 12 })).toBe(12);
    expect(getBattleTimelinePayloadTurn({ turn: "8" })).toBe(8);
  });

  it("returns null for missing or invalid payload", () => {
    expect(getBattleTimelinePayloadTurn(null)).toBeNull();
    expect(getBattleTimelinePayloadTurn({})).toBeNull();
    expect(getBattleTimelinePayloadTurn({ turn: "abc" })).toBeNull();
  });
});
