import { Permission } from "@lootlog/schema/permissions";
import { PERMISSION_CATEGORIES } from "./constants/permission-categories";

export const getActivePermissionCategories = (
  permissions: readonly Permission[],
) => {
  const activePermissions = new Set(permissions);
  const hasAdminPermission = activePermissions.has(Permission.ADMIN);
  return PERMISSION_CATEGORIES.flatMap((category) => {
    const visible = hasAdminPermission
      ? category.permissions.includes(Permission.ADMIN)
      : category.permissions.some((permission) =>
          activePermissions.has(permission),
        );
    return visible
      ? [
          {
            category,
            activePermissions: category.permissions.filter((permission) =>
              activePermissions.has(permission),
            ),
          },
        ]
      : [];
  });
};
