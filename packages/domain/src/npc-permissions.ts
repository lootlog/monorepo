import { Permission } from "@lootlog/schema/permissions";

export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: readonly string[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

export const NOTIFICATION_SEND_PERMISSIONS = [
  Permission.LOOTLOG_NOTIFICATIONS_SEND,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_MANAGE,
] as const;

export const canManageOwnPartyGathering = (
  roles: readonly RolePermissionData[],
  organizerDiscordId: string,
  viewerDiscordId: string,
): boolean =>
  organizerDiscordId === viewerDiscordId &&
  roles.some((role) =>
    NOTIFICATION_SEND_PERMISSIONS.some((permission) =>
      role.permissions.includes(permission),
    ),
  );

export const NPC_FEATURE_PERMISSIONS = {
  timers: {
    base: "LOOTLOG_TIMERS_READ",
    titans: "LOOTLOG_TIMERS_TITANS_READ",
    heroes: "LOOTLOG_TIMERS_HEROES_READ",
  },
  chat: {
    base: "LOOTLOG_CHAT_READ",
    titans: "LOOTLOG_CHAT_TITANS_READ",
    heroes: "LOOTLOG_CHAT_HEROES_READ",
  },
  notifications: {
    base: "LOOTLOG_NOTIFICATIONS_READ",
    titans: "LOOTLOG_NOTIFICATIONS_TITANS_READ",
    heroes: "LOOTLOG_NOTIFICATIONS_HEROES_READ",
  },
} as const;

const TIMER_PERMISSION = NPC_FEATURE_PERMISSIONS.timers;

type TimerPermissionTier = keyof typeof TIMER_PERMISSION;

const TIMER_PERMISSION_TIER_BY_NPC_TYPE = new Map(
  Object.entries({
    TITAN: "titans",
    HERO: "heroes",
    EVENT_HERO: "heroes",
  } satisfies Record<string, TimerPermissionTier>),
);

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;

export const hasRolePermissionInLevelRange = (
  roles: readonly RolePermissionData[],
  permission: string,
  npcLevel: number,
): boolean =>
  roles.some(
    (role) =>
      role.permissions.includes(permission) &&
      isNpcLevelWithinRoleRange(role, npcLevel),
  );

const getRequiredTimerPermission = (npcType: string): string =>
  TIMER_PERMISSION[TIMER_PERMISSION_TIER_BY_NPC_TYPE.get(npcType) ?? "base"];

export const canViewNpcTimer = (
  npc: NpcPermissionData | null,
  roles: readonly RolePermissionData[],
): boolean => {
  if (!npc) return false;

  return hasRolePermissionInLevelRange(
    roles,
    getRequiredTimerPermission(npc.type),
    npc.lvl,
  );
};
