import type { Permission, Role } from "#src/db/domain";
import { PermissionResolver } from "#src/shared/permissions/permission-resolver";

interface EventHeroWithLevel {
  npcLvl: number | null;
}

type EventHeroVisibilityRole = Pick<Role, "lvlRangeFrom" | "lvlRangeTo">;

/**
 * Check if a user can view an event hero based on level restrictions.
 *
 * Rules:
 * - OWNER or ADMIN permissions: can see all heroes
 * - npcLvl is null or 0: hero is visible (unknown level = no filtering)
 * - Otherwise: check if npcLvl falls within any role's level range
 */
function canViewEventHero(
  hero: EventHeroWithLevel,
  roles: EventHeroVisibilityRole[],
  permissions: Permission[],
): boolean {
  if (PermissionResolver.isAdministrative(permissions)) {
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

/**
 * Filter an array of heroes by level visibility.
 */
export function filterHeroesByLevel<T extends EventHeroWithLevel>(
  heroes: T[],
  roles: EventHeroVisibilityRole[],
  permissions: Permission[],
): T[] {
  return heroes.filter((hero) => canViewEventHero(hero, roles, permissions));
}
