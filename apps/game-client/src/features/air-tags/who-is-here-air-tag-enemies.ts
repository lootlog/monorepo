import { isAirTagClanEnemy, type AirTagTarget } from "@lootlog/schema/air-tag";

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
