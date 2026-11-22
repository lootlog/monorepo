import { isAirTagClanEnemy, type AirTagTarget } from "@lootlog/schema/air-tag";

/**
 * Clan enemies other members report on this map that the player cannot see,
 * by nickname.
 */
export function selectUnseenAirTagEnemies(
  targets: readonly AirTagTarget[],
  isSeenByHero: (target: AirTagTarget) => boolean,
): AirTagTarget[] {
  return targets
    .filter(
      (target) => isAirTagClanEnemy(target.relation) && !isSeenByHero(target),
    )
    .sort((first, second) => first.nickname.localeCompare(second.nickname));
}
