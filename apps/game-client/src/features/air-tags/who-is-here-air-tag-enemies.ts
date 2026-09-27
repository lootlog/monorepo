import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  type AirTagTarget,
} from "@lootlog/schema/air-tag";
import { getAirTagEffectiveRelation } from "@lootlog/domain/air-tag";

export type WhoIsHereAirTagEnemy = AirTagTarget & {
  effectiveRelation:
    | typeof AIR_TAG_ENEMY_RELATION
    | typeof AIR_TAG_CLAN_ENEMY_RELATION;
};

/**
 * Enemies other members report on this map that the player cannot see: clan
 * enemies first, then personal enemies, each by nickname.
 */
export function selectUnseenAirTagEnemies(
  targets: readonly AirTagTarget[],
  {
    now,
    ttlMs,
    isShownByGame,
  }: {
    now: number;
    ttlMs: number;
    isShownByGame: (targetId: string) => boolean;
  },
): WhoIsHereAirTagEnemy[] {
  return targets
    .flatMap((target) => {
      if (isShownByGame(target.targetId)) return [];
      const effectiveRelation = getAirTagEffectiveRelation(target, now, ttlMs);

      return effectiveRelation === AIR_TAG_CLAN_ENEMY_RELATION ||
        effectiveRelation === AIR_TAG_ENEMY_RELATION
        ? [{ ...target, effectiveRelation }]
        : [];
    })
    .sort(
      (first, second) =>
        second.effectiveRelation - first.effectiveRelation ||
        first.nickname.localeCompare(second.nickname),
    );
}
