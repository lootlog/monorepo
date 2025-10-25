import {
  isAdministrativeUser,
  isAdministrativeUserFromRoles,
  isOwnerOrAdmin,
  isOwnerOrAdminFromRoles,
} from './is-administrative-user';
import { Permission } from '../enum/permission.type';
import { GuildRole } from '../types/guild.types';

describe('isAdministrativeUser', () => {
  it('should return true for OWNER permission', () => {
    const permissions = [Permission.OWNER];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it('should return true for ADMIN permission', () => {
    const permissions = [Permission.ADMIN];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it('should return true for LOOTLOG_MANAGE permission', () => {
    const permissions = [Permission.LOOTLOG_MANAGE];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it('should return false for non-administrative permissions', () => {
    const permissions = [
      Permission.LOOTLOG_READ,
      Permission.LOOTLOG_WRITE,
      Permission.LOOTLOG_CHAT_READ,
    ];

    expect(isAdministrativeUser(permissions)).toBe(false);
  });

  it('should return true when at least one administrative permission exists', () => {
    const permissions = [
      Permission.LOOTLOG_READ,
      Permission.ADMIN,
      Permission.LOOTLOG_WRITE,
    ];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });

  it('should return false for empty permissions array', () => {
    expect(isAdministrativeUser([])).toBe(false);
  });

  it('should return true when multiple administrative permissions exist', () => {
    const permissions = [
      Permission.OWNER,
      Permission.ADMIN,
      Permission.LOOTLOG_MANAGE,
    ];

    expect(isAdministrativeUser(permissions)).toBe(true);
  });
});

describe('isAdministrativeUserFromRoles', () => {
  const createRole = (permissions: Permission[]): GuildRole => ({
    id: 'role-id',
    permissions,
    lvlRangeFrom: 1,
    lvlRangeTo: 999,
  });

  it('should return true when role has OWNER permission', () => {
    const roles = [createRole([Permission.OWNER])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it('should return true when role has ADMIN permission', () => {
    const roles = [createRole([Permission.ADMIN])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it('should return true when role has LOOTLOG_MANAGE permission', () => {
    const roles = [createRole([Permission.LOOTLOG_MANAGE])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it('should return false when no administrative permissions', () => {
    const roles = [
      createRole([Permission.LOOTLOG_READ, Permission.LOOTLOG_WRITE]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(false);
  });

  it('should flatten permissions from multiple roles', () => {
    const roles = [
      createRole([Permission.LOOTLOG_READ]),
      createRole([Permission.ADMIN]),
      createRole([Permission.LOOTLOG_WRITE]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it('should return false for empty roles array', () => {
    expect(isAdministrativeUserFromRoles([])).toBe(false);
  });

  it('should handle roles with multiple permissions', () => {
    const roles = [
      createRole([
        Permission.LOOTLOG_READ,
        Permission.LOOTLOG_WRITE,
        Permission.LOOTLOG_MANAGE,
      ]),
    ];

    expect(isAdministrativeUserFromRoles(roles)).toBe(true);
  });

  it('should handle roles with empty permissions', () => {
    const roles = [createRole([])];

    expect(isAdministrativeUserFromRoles(roles)).toBe(false);
  });
});

describe('isOwnerOrAdmin', () => {
  it('should return true for OWNER permission', () => {
    const permissions = [Permission.OWNER];

    expect(isOwnerOrAdmin(permissions)).toBe(true);
  });

  it('should return true for ADMIN permission', () => {
    const permissions = [Permission.ADMIN];

    expect(isOwnerOrAdmin(permissions)).toBe(true);
  });

  it('should return false for LOOTLOG_MANAGE permission', () => {
    const permissions = [Permission.LOOTLOG_MANAGE];

    expect(isOwnerOrAdmin(permissions)).toBe(false);
  });

  it('should return false for non-administrative permissions', () => {
    const permissions = [
      Permission.LOOTLOG_READ,
      Permission.LOOTLOG_WRITE,
      Permission.LOOTLOG_CHAT_READ,
    ];

    expect(isOwnerOrAdmin(permissions)).toBe(false);
  });

  it('should return true when at least one owner/admin permission exists', () => {
    const permissions = [
      Permission.LOOTLOG_READ,
      Permission.OWNER,
      Permission.LOOTLOG_WRITE,
    ];

    expect(isOwnerOrAdmin(permissions)).toBe(true);
  });

  it('should return false for empty permissions array', () => {
    expect(isOwnerOrAdmin([])).toBe(false);
  });

  it('should return true when both OWNER and ADMIN permissions exist', () => {
    const permissions = [Permission.OWNER, Permission.ADMIN];

    expect(isOwnerOrAdmin(permissions)).toBe(true);
  });
});

describe('isOwnerOrAdminFromRoles', () => {
  const createRole = (permissions: Permission[]): GuildRole => ({
    id: 'role-id',
    permissions,
    lvlRangeFrom: 1,
    lvlRangeTo: 999,
  });

  it('should return true when role has OWNER permission', () => {
    const roles = [createRole([Permission.OWNER])];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(true);
  });

  it('should return true when role has ADMIN permission', () => {
    const roles = [createRole([Permission.ADMIN])];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(true);
  });

  it('should return false when role has LOOTLOG_MANAGE permission', () => {
    const roles = [createRole([Permission.LOOTLOG_MANAGE])];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(false);
  });

  it('should return false when no owner/admin permissions', () => {
    const roles = [
      createRole([
        Permission.LOOTLOG_READ,
        Permission.LOOTLOG_WRITE,
        Permission.LOOTLOG_MANAGE,
      ]),
    ];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(false);
  });

  it('should flatten permissions from multiple roles', () => {
    const roles = [
      createRole([Permission.LOOTLOG_READ]),
      createRole([Permission.OWNER]),
      createRole([Permission.LOOTLOG_WRITE]),
    ];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(true);
  });

  it('should return false for empty roles array', () => {
    expect(isOwnerOrAdminFromRoles([])).toBe(false);
  });

  it('should handle roles with multiple permissions including admin', () => {
    const roles = [
      createRole([
        Permission.LOOTLOG_READ,
        Permission.LOOTLOG_WRITE,
        Permission.ADMIN,
      ]),
    ];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(true);
  });

  it('should handle roles with empty permissions', () => {
    const roles = [createRole([])];

    expect(isOwnerOrAdminFromRoles(roles)).toBe(false);
  });

  it('should correctly distinguish between administrative and owner/admin', () => {
    const rolesWithManage = [createRole([Permission.LOOTLOG_MANAGE])];
    const rolesWithAdmin = [createRole([Permission.ADMIN])];

    expect(isAdministrativeUserFromRoles(rolesWithManage)).toBe(true);
    expect(isOwnerOrAdminFromRoles(rolesWithManage)).toBe(false);

    expect(isAdministrativeUserFromRoles(rolesWithAdmin)).toBe(true);
    expect(isOwnerOrAdminFromRoles(rolesWithAdmin)).toBe(true);
  });
});
