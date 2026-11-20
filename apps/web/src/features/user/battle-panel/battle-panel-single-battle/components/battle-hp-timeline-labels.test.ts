import { describe, expect, it } from "vitest";
import { getBattleHpTimelineTeamLabel } from "./battle-hp-timeline-labels";

describe("battle HP timeline labels", () => {
  it("uses the single warrior name as the team label", () => {
    expect(
      getBattleHpTimelineTeamLabel(
        [
          { name: "Demodras", team: 2 },
          { name: "zpwrama", team: 1 },
        ],
        2,
        "Drużyna 2",
      ),
    ).toBe("Demodras");
  });

  it("joins names for group battles", () => {
    expect(
      getBattleHpTimelineTeamLabel(
        [
          { name: "Alpha", team: 1 },
          { name: "Beta", team: 1 },
          { name: "Enemy", team: 2 },
        ],
        1,
        "Drużyna 1",
      ),
    ).toBe("Alpha, Beta");
  });

  it("falls back when the team has no named warriors", () => {
    expect(
      getBattleHpTimelineTeamLabel(
        [
          { name: "   ", team: 1 },
          { name: "Enemy", team: 2 },
        ],
        1,
        "Drużyna 1",
      ),
    ).toBe("Drużyna 1");
  });
});
