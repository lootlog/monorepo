import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import type { W } from "@lootlog/margonem/game-events";

// Margonem passes raw hp fields through OneWarrior.updateWarrior without normalization.
// Preserve numeric primitives verbatim; only parsed strings require finite results.
export const parseNumericHpValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
};

const getModernHpPercentage = (
  warrior: Partial<W[string]>,
  currentWarrior?: BattleWarriorsWithAccountId[string],
) => {
  const hp = warrior.hp;
  if (!hp) return undefined;

  const hpPercentage = parseNumericHpValue(hp.hpp);
  if (hpPercentage !== null) return hpPercentage;

  const currentHp = parseNumericHpValue(hp.cur);
  if (currentHp !== null && currentHp <= 0) return 0;

  const currentHpData = currentWarrior?.hp;
  const maxHp = parseNumericHpValue(hp.max ?? currentHpData?.max);
  if (currentHp !== null && maxHp !== null && maxHp > 0) {
    return (currentHp / maxHp) * 100;
  }

  return undefined;
};

// Battle.js forwards each changed warrior to OneWarrior.updateWarrior, which
// updates only supplied keys. This merger accepts those patches against current participants.
export const mergeBattleWarriorPatches = (
  warriors: Readonly<Record<string, Partial<W[string]>>>,
  currentWarriors: BattleWarriorsWithAccountId,
  ingress?: RuntimeIngressSnapshot,
) => {
  const mergedWarriors: BattleWarriorsWithAccountId = {
    ...currentWarriors,
  };
  const game = ingress?.game ?? useGameStore.getState().game;

  Object.entries(warriors).forEach(([key, warrior]) => {
    const currentWarrior = currentWarriors[key];
    const modernHpPercentage = getModernHpPercentage(warrior, currentWarrior);
    let accountId = currentWarrior?.accountId;
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

    mergedWarriors[key] = {
      ...currentWarrior,
      ...warrior,
      accountId,
    };
    if (modernHpPercentage !== undefined) {
      mergedWarriors[key].hpp = modernHpPercentage;
    }
  });

  return mergedWarriors;
};
