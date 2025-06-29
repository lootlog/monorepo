import { Permission, Role } from 'generated/client';

export function mergeLevelRanges(
  roles: Role[],
  requiredPermissions: Permission[],
): { from: number; to: number }[] {
  return roles.reduce((acc, role) => {
    const hasAllPermissions = requiredPermissions.every((perm) =>
      role.permissions.includes(perm),
    );
    if (hasAllPermissions) {
      acc.push({
        from: role.lvlRangeFrom,
        to: role.lvlRangeTo,
      });
    }
    return acc;
  }, []);
}
