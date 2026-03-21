import { Permission } from "prisma/generated/client";

/**
 * Utility class for resolving permissions with implicit grants.
 * Handles permission expansion (OWNER/ADMIN → all, LOOTLOG_MANAGE → ACCESS).
 */
export class PermissionResolver {
  private static readonly ADMIN_PERMISSIONS: Permission[] = [
    Permission.OWNER,
    Permission.ADMIN,
  ];

  private static readonly ALL_PERMISSIONS = Object.values(Permission);

  /**
   * Resolves permissions with implicit grants
   */
  static resolve(permissions: Permission[]): Permission[] {
    const resolved = new Set<Permission>(permissions);

    // OWNER and ADMIN have all permissions
    if (this.isAdministrative(permissions)) {
      return this.ALL_PERMISSIONS;
    }

    // LOOTLOG_MANAGE implies LOOTLOG_ACCESS
    if (resolved.has(Permission.LOOTLOG_MANAGE)) {
      resolved.add(Permission.LOOTLOG_ACCESS);
    }

    return Array.from(resolved);
  }

  /**
   * Check if user has application access
   */
  static hasAccess(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_ACCESS) ||
      permissions.includes(Permission.LOOTLOG_MANAGE)
    );
  }

  /**
   * Check if user can read loots
   */
  static canReadLoots(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_LOOTS_READ)
    );
  }

  /**
   * Check if user can read timers
   */
  static canReadTimers(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_TIMERS_READ)
    );
  }

  /**
   * Check if user can read members
   */
  static canReadMembers(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_MEMBERS_READ)
    );
  }

  /**
   * Check if user is administrative (OWNER or ADMIN)
   */
  static isAdministrative(permissions: Permission[]): boolean {
    return permissions.some((p) => this.ADMIN_PERMISSIONS.includes(p));
  }

  /**
   * Check if user is administrative or has LOOTLOG_MANAGE
   */
  static isAdministrativeOrManager(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_MANAGE)
    );
  }
}
