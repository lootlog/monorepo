import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import type { W } from "@lootlog/margonem/game-events";

export const addAccountIdsToWarriors = (
  warriors: W,
  currentWarriors: BattleWarriorsWithAccountId,
  ingress?: RuntimeIngressSnapshot,
) => {
  const copy = { ...warriors } as BattleWarriorsWithAccountId;
  const game = ingress?.game ?? useGameStore.getState().game;

  Object.entries(copy).forEach(([key, warrior]) => {
    let accountId = currentWarriors[key]?.accountId;
    if (accountId === undefined && key === game?.hero.characterId) {
      accountId = Number(game.hero.accountId);
    } else if (accountId === undefined) {
      const normalizedAccountId = Number(
        ingress?.othersById[key]?.accountId ??
          useOthersStore.getState().getOther(key)?.accountId,
      );
      accountId = Number.isFinite(normalizedAccountId)
        ? normalizedAccountId
        : undefined;
    }

    copy[key] = {
      ...warrior,
      accountId,
    };
  });

  return copy;
};
