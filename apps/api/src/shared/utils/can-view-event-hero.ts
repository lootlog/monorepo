import { Permission, type Role } from "prisma/generated/client";

export interface EventHeroWithLevel {
  npcLvl: number | null;
}

/**
 * Check if a user can view an event hero based on level restrictions.
 *
 * Rules:
 * - OWNER or ADMIN permissions: can see all heroes
 * - npcLvl is null or 0: hero is visible (unknown level = no filtering)
 * - Otherwise: check if npcLvl falls within any role's level range
 */
export function canViewEventHero(
  hero: EventHeroWithLevel,
  roles: Role[],
  permissions: Permission[],
): boolean {
  if (
    permissions.includes(Permission.OWNER) ||
    permissions.includes(Permission.ADMIN)
  ) {
    return true;
  }

  if (hero.npcLvl === null || hero.npcLvl === 0) {
    return true;
  }

  return roles.some(
    (role) =>
      (role.lvlRangeFrom ?? 0) <= hero.npcLvl! &&
      (role.lvlRangeTo ?? 500) >= hero.npcLvl!,
  );
}

/**
 * Filter an array of heroes by level visibility.
 */
export function filterHeroesByLevel<T extends EventHeroWithLevel>(
  heroes: T[],
  roles: Role[],
  permissions: Permission[],
): T[] {
  return heroes.filter((hero) => canViewEventHero(hero, roles, permissions));
}
