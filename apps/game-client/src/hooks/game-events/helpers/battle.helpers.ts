import { Game } from "@/lib/game";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import type { W } from "@lootlog/margonem/game-events";

export const addAccountIdsToWarriors = (
  warriors: W,
  currentWarriors: BattleWarriorsWithAccountId,
) => {
  const copy = { ...warriors } as BattleWarriorsWithAccountId;

  Object.entries(copy).forEach(([key, warrior]) => {
    copy[key] = {
      ...warrior,
      accountId:
        currentWarriors[key]?.accountId ||
        (key === String(Game.hero.id)
          ? Game.hero.account
          : Game.getOther(key)?.account),
    };
  });

  return copy;
};
