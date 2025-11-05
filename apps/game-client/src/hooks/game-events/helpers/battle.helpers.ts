import { Game } from "@/lib/game";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import type { W } from "@/types/margonem/game-events/f";

export const addAccountIdsToWarriors = (
  warriors: W,
  currentWarriors: BattleWarriorsWithAccountId,
) => {
  const copy = { ...warriors } as BattleWarriorsWithAccountId;

  Object.entries(copy).forEach(([key, warrior]) => {
    if (currentWarriors[key]?.accountId) return;
    if (key === String(Game.hero.id)) {
      copy[key] = {
        ...warrior,
        accountId: Game.hero.account,
      };
      return;
    }

    const other = Game.getOther(key);

    if (other) {
      copy[key] = {
        ...warrior,
        accountId: other.account,
      };
    }
  });

  return copy;
};
