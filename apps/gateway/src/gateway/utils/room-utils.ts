import { NpcTypeEnum, Permission } from "@lootlog/types";
import type { UserGuildData, GuildRole } from "src/guilds/types/guild.types";
import { isAdministrativeUserFromRoles } from "src/guilds/utils/is-administrative-user";
import { Platform } from "src/gateway/enums/platform.enum";

export type FeatureName = "chat" | "timers" | "notifications";
export type TierName = "base" | "titans" | "heroes";

// Features excluded for web app (they don't need chat/notifications)
const WEB_EXCLUDED_FEATURES: FeatureName[] = ["chat", "notifications"];

export const FEATURE_ROOMS = {
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
} as const;

const ALL_FEATURE_ROOMS: Array<{ feature: FeatureName; tier: TierName }> = [
  { feature: "chat", tier: "base" },
  { feature: "chat", tier: "titans" },
  { feature: "chat", tier: "heroes" },
  { feature: "timers", tier: "base" },
  { feature: "timers", tier: "titans" },
  { feature: "timers", tier: "heroes" },
  { feature: "notifications", tier: "base" },
  { feature: "notifications", tier: "titans" },
  { feature: "notifications", tier: "heroes" },
];

export function buildRoomName(
  guildId: string,
  feature: FeatureName | "admin" | "presence" | "events",
  tier?: TierName,
): string {
  return tier ? `${guildId}:${feature}:${tier}` : `${guildId}:${feature}`;
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

export interface RoomCalculationResult {
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

  // Filter features based on platform (web doesn't need chat/notifications)
  const applicableFeatures =
    platform === Platform.WEB_APP
      ? ALL_FEATURE_ROOMS.filter(
          ({ feature }) => !WEB_EXCLUDED_FEATURES.includes(feature),
        )
      : ALL_FEATURE_ROOMS;

  for (const { guild, roles } of guilds) {
    const guildRooms: string[] = [];
    const isOwner = guild.ownerId === discordId;

    // Everyone gets presence and events rooms
    guildRooms.push(buildRoomName(guild.id, "presence"));
    guildRooms.push(buildRoomName(guild.id, "events"));

    // Owner/Admin get all feature rooms + admin room
    if (isOwner || isAdministrativeUserFromRoles(roles)) {
      guildRooms.push(buildRoomName(guild.id, "admin"));

      for (const { feature, tier } of applicableFeatures) {
        guildRooms.push(buildRoomName(guild.id, feature, tier));
      }
    } else {
      // Calculate based on specific permissions
      for (const { feature, tier } of applicableFeatures) {
        const requiredPermission = FEATURE_ROOMS[feature][tier];
        if (hasPermission(roles, requiredPermission)) {
          guildRooms.push(buildRoomName(guild.id, feature, tier));
        }
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

export function getNpcTier(npc?: { type?: string }): TierName {
  if (!npc?.type) return "base";
  if (npc.type === NpcTypeEnum.TITAN) return "titans";
  if (npc.type === NpcTypeEnum.HERO || npc.type === NpcTypeEnum.EVENT_HERO)
    return "heroes";
  return "base";
}

export function checkLevelRange(roles: GuildRole[], npcLevel: number): boolean {
  return roles.some(
    (role) => role.lvlRangeFrom <= npcLevel && role.lvlRangeTo >= npcLevel,
  );
}
