import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";

type BattleTeamNumber = 1 | 2;

type BattleTeamPresentation = {
  characterId: string;
  leftTeam: BattleWarrior[];
  rightTeam: BattleWarrior[];
  leftTeamNumber: BattleTeamNumber;
  rightTeamNumber: BattleTeamNumber;
  userWarrior: BattleWarrior | undefined;
};

const ATTACKING_TEAM_NUMBER = 1 satisfies BattleTeamNumber;
const DEFENDING_TEAM_NUMBER = 2 satisfies BattleTeamNumber;

const getPresentationCharacterId = (
  battle: Battle,
  preferredCharacterId: string | undefined,
) => {
  if (preferredCharacterId) {
    return preferredCharacterId;
  }

  return battle.characterId;
};

export const getBattleTeamPresentation = (
  battle: Battle,
  preferredCharacterId?: string,
): BattleTeamPresentation => {
  const characterId = getPresentationCharacterId(battle, preferredCharacterId);
  const attackingTeam = battle.warriors.filter(
    (warrior) => warrior.team === ATTACKING_TEAM_NUMBER,
  );
  const defendingTeam = battle.warriors.filter(
    (warrior) => warrior.team === DEFENDING_TEAM_NUMBER,
  );
  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === characterId,
  );

  if (userWarrior?.team === ATTACKING_TEAM_NUMBER) {
    return {
      characterId,
      leftTeam: attackingTeam,
      rightTeam: defendingTeam,
      leftTeamNumber: ATTACKING_TEAM_NUMBER,
      rightTeamNumber: DEFENDING_TEAM_NUMBER,
      userWarrior,
    };
  }

  return {
    characterId,
    leftTeam: defendingTeam,
    rightTeam: attackingTeam,
    leftTeamNumber: DEFENDING_TEAM_NUMBER,
    rightTeamNumber: ATTACKING_TEAM_NUMBER,
    userWarrior,
  };
};
