import { describe, expect, it } from "vitest";
import {
  BATTLE_HP_TIMELINE_COLORS,
  getBattleHpTimelinePlayerTeam,
  getBattleHpTimelineTeamColor,
} from "./battle-hp-timeline-colors";

describe("battle HP timeline colors", () => {
  it("uses friendly color for the player's team", () => {
    expect(getBattleHpTimelineTeamColor(1, 1)).toBe(
      BATTLE_HP_TIMELINE_COLORS.friendly,
    );
  });

  it("uses enemy color for the opponent team", () => {
    expect(getBattleHpTimelineTeamColor(2, 1)).toBe(
      BATTLE_HP_TIMELINE_COLORS.enemy,
    );
  });

  it("falls back to team 1 as friendly and team 2 as enemy", () => {
    expect(getBattleHpTimelineTeamColor(1, null)).toBe(
      BATTLE_HP_TIMELINE_COLORS.friendly,
    );
    expect(getBattleHpTimelineTeamColor(2, null)).toBe(
      BATTLE_HP_TIMELINE_COLORS.enemy,
    );
  });

  it("reverses colors when the player is in team 2", () => {
    const playerTeam = getBattleHpTimelinePlayerTeam(
      [
        { originalId: "opponent", team: 1 },
        { originalId: "player", team: 2 },
      ],
      "player",
    );

    expect(playerTeam).toBe(2);
    expect(getBattleHpTimelineTeamColor(1, playerTeam)).toBe(
      BATTLE_HP_TIMELINE_COLORS.enemy,
    );
    expect(getBattleHpTimelineTeamColor(2, playerTeam)).toBe(
      BATTLE_HP_TIMELINE_COLORS.friendly,
    );
  });
});
