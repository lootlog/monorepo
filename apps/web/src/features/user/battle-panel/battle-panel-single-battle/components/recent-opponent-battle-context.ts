import type { Battle } from "@/lib/api/battlelog-types";

export type RecentOpponentBattleContext = {
  battleId: string;
  characterId: string;
  opponentId: string;
  opponentName: string;
  world: string;
};

type RecentOpponentBattleSource = Pick<
  Battle,
  "id" | "characterId" | "type" | "warriors" | "world"
>;

export const getRecentOpponentBattleContext = (
  battle: RecentOpponentBattleSource | null | undefined,
): RecentOpponentBattleContext | null => {
  if (!battle || battle.type !== "1v1" || battle.warriors.length !== 2) {
    return null;
  }

  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );
  const opponentWarrior = battle.warriors.find(
    (warrior) => warrior.originalId !== battle.characterId,
  );

  if (!userWarrior || !opponentWarrior) {
    return null;
  }

  return {
    battleId: battle.id,
    characterId: battle.characterId,
    opponentId: opponentWarrior.originalId,
    opponentName: opponentWarrior.name,
    world: battle.world,
  };
};
