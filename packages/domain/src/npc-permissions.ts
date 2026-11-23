import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { getNpcTypeRoutingTier } from "@lootlog/schema/npc-routing";
import { Capability } from "@lootlog/schema/permissions";
import { Schema } from "effect";

export type NpcPermissionData = {
  lvl: number;
  type: string;
};

export type RolePermissionData = {
  permissions: readonly string[];
  lvlRangeFrom: number | null;
  lvlRangeTo: number | null;
};

export const NOTIFICATION_SEND_PERMISSIONS = [
  Capability.LOOTLOG_NOTIFICATIONS_SEND,
  Capability.OWNER,
  Capability.ADMIN,
  Capability.LOOTLOG_MANAGE,
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
    base: Capability.LOOTLOG_TIMERS_READ,
    titans: Capability.LOOTLOG_TIMERS_TITANS_READ,
    heroes: Capability.LOOTLOG_TIMERS_HEROES_READ,
  },
  chat: {
    base: Capability.LOOTLOG_CHAT_READ,
    titans: Capability.LOOTLOG_CHAT_TITANS_READ,
    heroes: Capability.LOOTLOG_CHAT_HEROES_READ,
  },
  notifications: {
    base: Capability.LOOTLOG_NOTIFICATIONS_READ,
    titans: Capability.LOOTLOG_NOTIFICATIONS_TITANS_READ,
    heroes: Capability.LOOTLOG_NOTIFICATIONS_HEROES_READ,
  },
} as const;

export const HERO_SIGHTING_READ_FEATURE: NpcFeature = "timers";

export const HERO_SIGHTING_WRITE_PERMISSION = Capability.LOOTLOG_TIMERS_WRITE;

const TIMER_PERMISSION = NPC_FEATURE_PERMISSIONS.timers;

const isNpcType = Schema.is(NpcTypeSchema);

const isNpcLevelWithinRoleRange = (
  role: RolePermissionData,
  npcLevel: number,
): boolean =>
  (role.lvlRangeFrom ?? 0) <= npcLevel && (role.lvlRangeTo ?? 500) >= npcLevel;

const hasRolePermissionInLevelRange = (
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
  TIMER_PERMISSION[
    isNpcType(npcType) ? getNpcTypeRoutingTier(npcType) : "base"
  ];

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

export type NpcFeature = keyof typeof NPC_FEATURE_PERMISSIONS;

type NpcFeatureTier = keyof (typeof NPC_FEATURE_PERMISSIONS)[NpcFeature];

export type NpcFeatureSource = {
  readonly tier: NpcFeatureTier;
  readonly npcLevel?: number;
};

export const canReadNpcFeatureSource = (
  roles: readonly RolePermissionData[],
  feature: NpcFeature,
  source: NpcFeatureSource | null,
): boolean => {
  if (
    !roles.some((role) =>
      role.permissions.includes(NPC_FEATURE_PERMISSIONS[feature].base),
    )
  )
    return false;

  if (!source) return true;

  const permission = NPC_FEATURE_PERMISSIONS[feature][source.tier];

  if (source.npcLevel === undefined)
    return roles.some((role) => role.permissions.includes(permission));

  return hasRolePermissionInLevelRange(roles, permission, source.npcLevel);
};

export const canReadHeroSighting = (
  roles: readonly RolePermissionData[],
  heroLvl: number,
): boolean =>
  canReadNpcFeatureSource(roles, HERO_SIGHTING_READ_FEATURE, {
    tier: "heroes",
    npcLevel: heroLvl,
  });
