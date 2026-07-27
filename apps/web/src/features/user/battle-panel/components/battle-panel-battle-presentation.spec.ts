import type {
  Battle,
  BattleWarrior,
  PlayerVsPlayerBattle,
} from "@/lib/api/battlelog-types";
import { describe, expect, it } from "vitest";
import {
  formatBattleTeamNames,
  getBattleResult,
  getBattleTeams,
  getPlayerVsPlayerBattleResult,
} from "./battle-panel-battle-presentation";
import { getBattleResultRowClassName } from "./battle-result-status";

const createWarrior = ({
  name,
  originalId,
  team,
}: {
  name: string;
  originalId: string;
  team: number;
}): BattleWarrior =>
  ({
    name,
    originalId,
    team,
  }) as BattleWarrior;

const createBattle = (overrides: Partial<Battle> = {}): Battle =>
  ({
    characterId: "user-warrior",
    hasFlee: false,
    winningTeam: 2,
    warriors: [
      createWarrior({
        name: "Attacker",
        originalId: "attacker",
        team: 1,
      }),
      createWarrior({
        name: "User",
        originalId: "user-warrior",
        team: 2,
      }),
      createWarrior({
        name: "Ally",
        originalId: "ally",
        team: 2,
      }),
    ],
    ...overrides,
  }) as Battle;

const createPlayerVsPlayerBattle = (
  overrides: Partial<PlayerVsPlayerBattle> = {},
): PlayerVsPlayerBattle =>
  ({
    battleId: "battle-id",
    createdAt: "2026-01-01T12:00:00Z",
    duration: 15,
    winner: "User",
    loser: "Opponent",
    hasFlee: false,
    matchmaking: false,
    ratingDelta: 12,
    userRating: 1000,
    opponentRating: 990,
    userWarrior: {
      name: "User",
      lvl: 100,
      prof: "w",
      icon: "user.gif",
    },
    opponentWarrior: {
      name: "Opponent",
      lvl: 101,
      prof: "m",
      icon: "opponent.gif",
    },
    ...overrides,
  }) as PlayerVsPlayerBattle;

describe("battle panel battle presentation", () => {
  it("orders teams from the user warrior perspective", () => {
    const teams = getBattleTeams(createBattle());

    expect(teams.userWarrior?.name).toBe("User");
    expect(formatBattleTeamNames(teams.leftTeam)).toBe("User, Ally");
    expect(formatBattleTeamNames(teams.rightTeam)).toBe("Attacker");
  });

  it("derives battle results for wins, losses and flee outcomes", () => {
    expect(getBattleResult(createBattle({ winningTeam: 2 }))).toBe("won");
    expect(getBattleResult(createBattle({ winningTeam: 1 }))).toBe("lost");
    expect(getBattleResult(createBattle({ hasFlee: true }))).toBe("flee");
  });

  it("derives player-vs-player results from winner and flee state", () => {
    expect(getPlayerVsPlayerBattleResult(createPlayerVsPlayerBattle())).toBe(
      "won",
    );
    expect(
      getPlayerVsPlayerBattleResult(
        createPlayerVsPlayerBattle({ winner: "Opponent" }),
      ),
    ).toBe("lost");
    expect(
      getPlayerVsPlayerBattleResult(
        createPlayerVsPlayerBattle({ hasFlee: true }),
      ),
    ).toBe("flee");
  });

  it("falls back to neutral row colors when a result is not available", () => {
    expect(getBattleResultRowClassName(undefined)).toBe(
      "bg-background hover:bg-muted/50",
    );
  });
});
