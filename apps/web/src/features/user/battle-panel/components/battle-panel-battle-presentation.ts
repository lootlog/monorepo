import type {
  Battle,
  BattleWarrior,
  PlayerVsPlayerBattle,
} from "@/lib/api/battlelog-types";
import { getBattleTeamSides } from "@/components/battle/utils/battle-team-sides";
import type { BattleResultStatusValue } from "./battle-result-status";

export const getBattleTeams = (battle: Battle) => {
  const { leftTeam, rightTeam, userWarrior } = getBattleTeamSides(battle);

  return { leftTeam, rightTeam, userWarrior };
};

export const getBattleResult = (battle: Battle): BattleResultStatusValue => {
  if (battle.hasFlee) {
    return "flee";
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
