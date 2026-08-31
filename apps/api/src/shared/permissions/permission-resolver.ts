import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

/**
 * Utility class for resolving permissions with implicit grants.
 * Handles permission expansion while preserving OWNER as a distinct recovery
 * authority that ADMIN cannot impersonate.
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
    if (permissions.includes(Permission.OWNER)) {
      return this.ALL_PERMISSIONS;
    }

    if (permissions.includes(Permission.ADMIN)) {
      return this.ALL_PERMISSIONS.filter(
        (permission) => permission !== Permission.OWNER,
      );
    }

    return Array.from(new Set(permissions));
  }

  /**
   * Check if user has application access
   */
  static hasAccess(permissions: Permission[]): boolean {
    return (
      this.isAdministrative(permissions) ||
      permissions.includes(Permission.LOOTLOG_ACCESS)
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
