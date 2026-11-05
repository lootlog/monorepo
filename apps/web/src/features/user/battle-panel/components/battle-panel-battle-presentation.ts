import type {
  Battle,
  BattleWarrior,
  PlayerVsPlayerBattle,
} from "@/lib/api/battlelog-types";
import type { BattleResultStatusValue } from "./battle-result-status";

export const getBattleTeams = (battle: Battle) => {
  const attackingTeam = battle.warriors.filter((warrior) => warrior.team === 1);
  const defendingTeam = battle.warriors.filter((warrior) => warrior.team === 2);

  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );

  if (userWarrior?.team === 1) {
    return {
      leftTeam: attackingTeam,
      rightTeam: defendingTeam,
      userWarrior,
    };
  }

  return {
    leftTeam: defendingTeam,
    rightTeam: attackingTeam,
    userWarrior,
  };
};

/**
 * Margonem names `?` the winner of a battle without one. Without a flee, the
 * battle reached the turn limit.
 */
export const isBattleDraw = (
  battle: Pick<Battle, "winner" | "hasFlee">,
): boolean => battle.winner === "?" && !battle.hasFlee;

export const getBattleResult = (battle: Battle): BattleResultStatusValue => {
  if (battle.unfinished) {
    return "unfinished";
  }

  if (battle.hasFlee) {
    return "flee";
  }

  if (isBattleDraw(battle)) {
    return "draw";
  }

  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );

  if (battle.winningTeam === userWarrior?.team) {
    return "won";
  }

  return "lost";
};

export const getPlayerVsPlayerBattleResult = (
  battle: PlayerVsPlayerBattle,
): BattleResultStatusValue => {
  if (battle.hasFlee) {
    return "flee";
  }

  if (isBattleDraw(battle)) {
    return "draw";
  }

  if (battle.userWarrior.name === battle.winner) {
    return "won";
  }

  return "lost";
};

export const formatBattleTeamNames = (team: BattleWarrior[]) => {
  if (team.length === 0) {
    return "";
  }

  return team.map((warrior) => warrior.name).join(", ");
};
