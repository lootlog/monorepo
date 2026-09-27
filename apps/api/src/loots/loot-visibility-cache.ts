import type { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";

type VisibilityRole = Pick<
  typeof roleTable.$inferSelect,
  "id" | "lvlRangeFrom" | "lvlRangeTo" | "permissions"
>;

export const buildLootVisibilityCacheRoles = (
  roles: readonly VisibilityRole[],
) =>
  roles
    .map((role) => ({
      id: role.id,
      lvlRangeFrom: role.lvlRangeFrom,
      lvlRangeTo: role.lvlRangeTo,
      permissions: [...role.permissions].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

export const buildLootVisibilityCacheScope = (
  permissions: readonly Permission[],
  roles: readonly VisibilityRole[],
) => ({
  permissions: [...permissions].sort(),
  roles: buildLootVisibilityCacheRoles(roles),
});
