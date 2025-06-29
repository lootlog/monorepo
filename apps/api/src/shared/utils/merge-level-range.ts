import { Role } from 'generated/client';

export function mergeLevelRanges(
  roles: Role[],
): { from: number; to: number }[] {
  return roles.map((role) => ({
    from: role.lvlRangeFrom,
    to: role.lvlRangeTo,
  }));
}
