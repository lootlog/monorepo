import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";

type BattleTeamNumber = 1 | 2;

type BattleTeamSides = {
  leftTeam: BattleWarrior[];
  rightTeam: BattleWarrior[];
  leftTeamNumber: BattleTeamNumber;
  rightTeamNumber: BattleTeamNumber;
  userWarrior: BattleWarrior | undefined;
};

export const getBattleTeamSides = (
  battle: Battle,
  characterId = battle.characterId,
): BattleTeamSides => {
  const attackingTeam = battle.warriors.filter((warrior) => warrior.team === 1);
  const defendingTeam = battle.warriors.filter((warrior) => warrior.team === 2);
  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === characterId,
  );

  if (userWarrior?.team === 1) {
    return {
      leftTeam: attackingTeam,
      rightTeam: defendingTeam,
      leftTeamNumber: 1,
      rightTeamNumber: 2,
      userWarrior,
    };
  }

  return {
    leftTeam: defendingTeam,
    rightTeam: attackingTeam,
    leftTeamNumber: 2,
    rightTeamNumber: 1,
    userWarrior,
  };
};
