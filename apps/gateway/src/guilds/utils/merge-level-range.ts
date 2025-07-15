import { Permission } from 'src/guilds/enum/permission.type';
import { Role } from 'src/guilds/types/role.type';

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
