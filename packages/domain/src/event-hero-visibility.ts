import { createAccessPolicy } from "./access-policy.js";
import { Capability } from "@lootlog/schema/permissions";

interface EventHeroWithLevel {
  npcLvl: number | null;
}

type EventHeroVisibilityRole = {
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
};

export function canViewEventHero(
  hero: EventHeroWithLevel,
  roles: readonly EventHeroVisibilityRole[],
  permissions: readonly Capability[],
): boolean {
  if (
    createAccessPolicy({ capabilities: permissions }).allows(Capability.ADMIN)
  ) {
    return true;
  }

  const heroLevel = hero.npcLvl;

  if (heroLevel === null || heroLevel === 0) {
    return true;
  }

  return roles.some(
    (role) =>
      (role.lvlRangeFrom ?? 0) <= heroLevel &&
      (role.lvlRangeTo ?? 500) >= heroLevel,
  );
}

export function filterHeroesByLevel<T extends EventHeroWithLevel>(
  heroes: T[],
  roles: readonly EventHeroVisibilityRole[],
  permissions: readonly Capability[],
): T[] {
  return heroes.filter((hero) => canViewEventHero(hero, roles, permissions));
}
