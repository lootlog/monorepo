import {
  getNpcRoutingTier,
  Permission,
  type NpcRoutingData,
  type NpcRoutingTier,
} from "@lootlog/types";
import type { UserGuildData, GuildRole } from "#src/guilds/types/guild.types";
import { isAdministrativeUserFromRoles } from "#src/guilds/utils/is-administrative-user";
import { Platform } from "#src/gateway/enums/platform.enum";

const FEATURE_NAMES = ["chat", "timers", "notifications", "loots"] as const;
const TIER_NAMES = [
  "base",
  "titans",
  "heroes",
] as const satisfies readonly NpcRoutingTier[];

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type TierName = (typeof TIER_NAMES)[number];
const FEATURE_ROOMS = {
  chat: {
    base: Permission.LOOTLOG_CHAT_READ,
    titans: Permission.LOOTLOG_CHAT_TITANS_READ,
    heroes: Permission.LOOTLOG_CHAT_HEROES_READ,
  },
  timers: {
    base: Permission.LOOTLOG_TIMERS_READ,
    titans: Permission.LOOTLOG_TIMERS_TITANS_READ,
    heroes: Permission.LOOTLOG_TIMERS_HEROES_READ,
  },
  notifications: {
    base: Permission.LOOTLOG_NOTIFICATIONS_READ,
    titans: Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
    heroes: Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
  },
  loots: {
    base: Permission.LOOTLOG_LOOTS_READ,
    titans: Permission.LOOTLOG_LOOTS_TITANS_READ,
    heroes: Permission.LOOTLOG_LOOTS_HEROES_READ,
  },
} as const satisfies Record<FeatureName, Record<TierName, Permission>>;

type FeatureRoom = { feature: FeatureName; tier: TierName };

const ALL_FEATURE_ROOMS: FeatureRoom[] = FEATURE_NAMES.flatMap((feature) =>
  TIER_NAMES.map((tier) => ({ feature, tier })),
);
const PLATFORM_EXCLUDED_FEATURES = {
  [Platform.GAME]: ["loots"],
  [Platform.WEB_APP]: ["chat", "notifications"],
  [Platform.UNKNOWN]: ["loots"],
} as const satisfies Record<Platform, readonly FeatureName[]>;

function getApplicableFeatureRooms(platform: Platform): FeatureRoom[] {
  const excludedFeatures: readonly FeatureName[] =
    PLATFORM_EXCLUDED_FEATURES[platform];

  return ALL_FEATURE_ROOMS.filter(
    ({ feature }) => !excludedFeatures.includes(feature),
  );
}

export function buildRoomName(
  guildId: string,
  feature: FeatureName | "admin" | "presence" | "events" | "online-players",
  tier?: TierName,
): string {
  return tier ? `${guildId}:${feature}:${tier}` : `${guildId}:${feature}`;
}

export function buildUserGuildRoomName(
  discordId: string,
  guildId: string,
): string {
  return `user:${discordId}:guild:${guildId}`;
}

export function buildAirTagRoomName(
  guildId: string,
  world: string,
  mapId: number,
): string {
  return `air-tags:${guildId}:${world}:${mapId}`;
}

export function parseRoomName(
  room: string,
): { guildId: string; feature: string; tier?: string } | null {
  const parts = room.split(":");
  if (parts.length < 2) return null;
  return {
    guildId: parts[0],
    feature: parts[1],
    tier: parts[2],
  };
}

interface RoomCalculationResult {
  rooms: string[];
  roomsByGuild: Map<string, string[]>;
}

export function calculateUserRooms(
  guilds: UserGuildData[],
  discordId: string,
  platform: Platform = Platform.GAME,
): RoomCalculationResult {
  const result: RoomCalculationResult = {
    rooms: [],
    roomsByGuild: new Map(),
  };

  const applicableFeatures = getApplicableFeatureRooms(platform);

  for (const { guild, roles } of guilds) {
    const guildRooms: string[] = [];
    const hasFullGuildAccess =
      guild.ownerId === discordId || isAdministrativeUserFromRoles(roles);

    // Everyone gets presence and events rooms
    guildRooms.push(buildUserGuildRoomName(discordId, guild.id));
    guildRooms.push(buildRoomName(guild.id, "presence"));
    guildRooms.push(buildRoomName(guild.id, "events"));

    if (hasFullGuildAccess) {
      guildRooms.push(buildRoomName(guild.id, "admin"));
    }

    if (hasFullGuildAccess || hasOnlinePlayersAccess(roles)) {
      guildRooms.push(buildRoomName(guild.id, "online-players"));
    }

    for (const { feature, tier } of applicableFeatures) {
      const requiredPermission = FEATURE_ROOMS[feature][tier];
      if (hasFullGuildAccess || hasPermission(roles, requiredPermission)) {
        guildRooms.push(buildRoomName(guild.id, feature, tier));
      }
    }

    result.roomsByGuild.set(guild.id, guildRooms);
    result.rooms.push(...guildRooms);
  }

  return result;
}

function hasPermission(roles: GuildRole[], permission: Permission): boolean {
  return roles.some((role) => role.permissions.includes(permission));
}

export function getFeaturePermission(
  feature: FeatureName,
  tier: TierName,
): Permission {
  return FEATURE_ROOMS[feature][tier];
}

export function getNpcTier(npc?: NpcRoutingData): TierName {
  return getNpcRoutingTier(npc);
}

function isLevelWithinRoleRange(role: GuildRole, npcLevel: number): boolean {
  return role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel;
}

export function hasFeatureRoomAccess(
  roles: GuildRole[],
  feature: FeatureName,
  tier: TierName,
  npcLevel?: number,
): boolean {
  const requiredPermission = getFeaturePermission(feature, tier);

  return roles.some((role) => {
    if (!role.permissions.includes(requiredPermission)) {
      return false;
    }

    if (npcLevel === undefined) {
      return true;
    }

    return isLevelWithinRoleRange(role, npcLevel);
  });
}

export function hasOnlinePlayersAccess(roles: GuildRole[]): boolean {
  return hasPermission(roles, Permission.LOOTLOG_ONLINE_PLAYERS_READ);
}

export function canViewOnlinePlayers(
  guildData: UserGuildData,
  discordId: string,
): boolean {
  return (
    guildData.guild.ownerId === discordId ||
    isAdministrativeUserFromRoles(guildData.roles) ||
    hasOnlinePlayersAccess(guildData.roles)
  );
}
