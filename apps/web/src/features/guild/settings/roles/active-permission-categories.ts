import { Capability } from "@lootlog/schema/permissions";
import { PERMISSION_CATEGORIES } from "./constants/permission-categories";

export const getActivePermissionCategories = (
  permissions: readonly Capability[],
) => {
  const activePermissions = new Set(permissions);
  const hasAdminPermission = activePermissions.has(Capability.ADMIN);

  return PERMISSION_CATEGORIES.flatMap((category) => {
    const visible = hasAdminPermission
      ? category.permissions.includes(Capability.ADMIN)
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
