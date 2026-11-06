import { describe, expect, it } from "vitest";
import { isHeroTrackersEvent, isHeroTrackersMonster } from "./hero-trackers";

describe("Tropiciele Herosów", () => {
  it("tells its editions from other events, which carry a year", () => {
    expect(isHeroTrackersEvent("Dzień Młodego Smoka")).toBe(true);
    expect(isHeroTrackersEvent("Dzień Koźca Mąciciela Ścieżek")).toBe(true);
    expect(isHeroTrackersEvent("Dzień Chłopaka 2026 r.")).toBe(false);
    expect(isHeroTrackersEvent("Halloween 2026 r.")).toBe(false);
  });

  it("marks heroes fought as colossi in their hideouts, not the heroes or real colossi", () => {
    expect(
      isHeroTrackersMonster({ type: "COLOSSUS", icon: "her/smokbarb.gif" }),
    ).toBe(true);
    expect(
      isHeroTrackersMonster({ type: "HERO", icon: "her/smokbarb.gif" }),
    ).toBe(false);
    expect(
      isHeroTrackersMonster({
        type: "COLOSSUS",
        icon: "kol/mamlambo_final2.gif",
      }),
    ).toBe(false);
  });
});
