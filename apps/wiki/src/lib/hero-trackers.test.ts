import { describe, expect, it } from "vitest";
import { eventsByPriority, isHeroTrackersEvent } from "./hero-trackers";

describe("Tropiciele Herosów", () => {
  it("tells its editions from other events, which carry a year", () => {
    expect(isHeroTrackersEvent("Dzień Młodego Smoka")).toBe(true);
    expect(isHeroTrackersEvent("Dzień Koźca Mąciciela Ścieżek")).toBe(true);
    expect(isHeroTrackersEvent("Dzień Chłopaka 2026 r.")).toBe(false);
    expect(isHeroTrackersEvent("Halloween 2026 r.")).toBe(false);
  });

  it("lists the game's own events ahead of its editions, keeping each one's order", () => {
    expect(
      eventsByPriority([
        "Dzień Lichwiarza Grauhaza",
        "Halloween 2026 r.",
        "Dzień Negthotepa Czarnego Kapłana",
        "Dzień Chłopaka 2026 r.",
      ]),
    ).toEqual([
      "Halloween 2026 r.",
      "Dzień Chłopaka 2026 r.",
      "Dzień Lichwiarza Grauhaza",
      "Dzień Negthotepa Czarnego Kapłana",
    ]);
  });
});
