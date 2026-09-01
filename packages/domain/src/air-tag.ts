import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  type AirTagRelation,
  type AirTagTarget,
} from "@lootlog/schema/air-tag";

export const getAirTagEffectiveRelation = (
  target: Pick<
    AirTagTarget,
    "relation" | "enemyObservedAt" | "clanEnemyObservedAt"
  >,
  now: number,
  ttlMs: number,
): AirTagRelation => {
  if (
    target.clanEnemyObservedAt !== undefined &&
    now - target.clanEnemyObservedAt < ttlMs
  ) {
    return AIR_TAG_CLAN_ENEMY_RELATION;
  }

  if (
    target.enemyObservedAt !== undefined &&
    now - target.enemyObservedAt < ttlMs
  ) {
    return AIR_TAG_ENEMY_RELATION;
  }

  return target.relation;
};
