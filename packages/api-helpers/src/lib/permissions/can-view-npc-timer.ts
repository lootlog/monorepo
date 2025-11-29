/**
 * NPC type constants matching Prisma schema
 */
export const NPC_TYPE = {
  COMMON: "COMMON",
  ELITE: "ELITE",
  ELITE2: "ELITE2",
  ELITE3: "ELITE3",
  HERO: "HERO",
  EVENT_HERO: "EVENT_HERO",
  TITAN: "TITAN",
  COLOSSUS: "COLOSSUS",
  NPC: "NPC",
} as const;

/**
 * Permission constants matching Prisma schema
 */
export const PERMISSION = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  LOOTLOG_MANAGE: "LOOTLOG_MANAGE",
  LOOTLOG_READ: "LOOTLOG_READ",
  LOOTLOG_WRITE: "LOOTLOG_WRITE",
  LOOTLOG_RESERVATIONS: "LOOTLOG_RESERVATIONS",
  LOOTLOG_READ_TIMERS_TITANS: "LOOTLOG_READ_TIMERS_TITANS",
  LOOTLOG_READ_LOOTS_TITANS: "LOOTLOG_READ_LOOTS_TITANS",
  LOOTLOG_READ_TIMERS_HEROES: "LOOTLOG_READ_TIMERS_HEROES",
  LOOTLOG_READ_LOOTS_HEROES: "LOOTLOG_READ_LOOTS_HEROES",
  LOOTLOG_CHAT_READ: "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE: "LOOTLOG_CHAT_WRITE",
  LOOTLOG_NOTIFICATIONS_SEND: "LOOTLOG_NOTIFICATIONS_SEND",
  LOOTLOG_NOTIFICATIONS_READ: "LOOTLOG_NOTIFICATIONS_READ",
} as const;

/**
 * Type for NPC data required for permission checking
 */
export type NpcPermissionData = {
  lvl: number;
  type: string;
};

/**
 * Type for Role data required for permission checking
 */
export type RolePermissionData = {
  permissions: string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

/**
 * Determines if a user can view an NPC timer based on their roles and permissions.
 *
 * This shared utility is used by both API and Gateway services to maintain
 * consistent permission logic across the application.
 *
 * Permission hierarchy:
 * - TITAN timers: Requires LOOTLOG_READ_TIMERS_TITANS permission
 * - HERO/EVENT_HERO timers: Requires LOOTLOG_READ_TIMERS_HEROES permission
 * - Other NPCs: Requires LOOTLOG_READ permission
 *
 * All permissions are also subject to level range filtering based on role configuration.
 *
 * @param npc - NPC data containing level and type information
 * @param roles - Array of roles with permissions and level ranges
 * @returns true if user has permission to view the timer, false otherwise
 *
 * @example
 * ```typescript
 * const npc = { lvl: 150, type: 'TITAN' };
 * const roles = [
 *   {
 *     permissions: ['LOOTLOG_READ_TIMERS_TITANS'],
 *     lvlRangeFrom: 100,
 *     lvlRangeTo: 200
 *   }
 * ];
 *
 * const canView = canViewNpcTimer(npc, roles); // true
 * ```
 */
export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: RolePermissionData[],
): boolean => {
  if (!npc) return false;

  if (npc.type === NPC_TYPE.TITAN) {
    return roles.some(
      (role) =>
        role.permissions.includes(PERMISSION.LOOTLOG_READ_TIMERS_TITANS) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  if (npc.type === NPC_TYPE.HERO || npc.type === NPC_TYPE.EVENT_HERO) {
    return roles.some(
      (role) =>
        role.permissions.includes(PERMISSION.LOOTLOG_READ_TIMERS_HEROES) &&
        role.lvlRangeFrom <= npc.lvl &&
        role.lvlRangeTo >= npc.lvl,
    );
  }

  return roles.some(
    (role) =>
      role.lvlRangeFrom <= npc.lvl &&
      role.lvlRangeTo >= npc.lvl &&
      role.permissions.includes(PERMISSION.LOOTLOG_READ),
  );
};
