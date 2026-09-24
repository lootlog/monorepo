import { isObjectRecord as isRecord } from "@lootlog/schema/records";
import type {
  APIGuildMember,
  RESTAPIPartialCurrentUserGuild,
  RESTGetAPICurrentUserGuildsResult,
} from "discord-api-types/v10";

export interface DiscordIdentity {
  userId: string;
  discordId: string;
}

export interface DiscordGuildMemberIdentity extends DiscordIdentity {
  guildId: string;
}

export interface DiscordGuildMemberCacheKeys {
  data: string;
  lock: string;
  notFound: string;
  unauthorized: string;
}

export function getUserGuildsCacheKey(identity: DiscordIdentity): string {
  return `user:${identity.userId}:discord:${identity.discordId}:guilds:v2:data`;
}

export function getLegacyUserGuildsCacheKeys(userId: string): string[] {
  return [
    `user:${userId}:discord-guilds:v2:data`,
    `user:${userId}:discord-guilds:data`,
  ];
}

export function getUserGuildsLockKey(identity: DiscordIdentity): string {
  return `user:${identity.userId}:discord:${identity.discordId}:guilds:lock`;
}

export function getCompleteUserGuildsRequestKey(
  identity: DiscordIdentity,
): string {
  return `user:${identity.userId}:discord:${identity.discordId}:complete-guilds`;
}

export function getCompleteUserGuildsLockKey(
  identity: DiscordIdentity,
): string {
  return `${getCompleteUserGuildsRequestKey(identity)}:lock`;
}

export function getCompleteUserGuildsCacheKey(
  identity: DiscordIdentity,
): string {
  return `${getCompleteUserGuildsRequestKey(identity)}:data`;
}

export function getGuildMemberCacheKeys(
  identity: DiscordGuildMemberIdentity,
): DiscordGuildMemberCacheKeys {
  const base = `guild:${identity.guildId}:member:${identity.userId}:discord:${identity.discordId}`;

  return {
    data: `${base}:data`,
    lock: `${base}:lock`,
    notFound: `${base}:not-found`,
    unauthorized: `${base}:unauthorized`,
  };
}

export function getLegacyGuildMemberCacheKeys(options: {
  guildId: string;
  userId: string;
}): Omit<DiscordGuildMemberCacheKeys, "lock"> {
  const base = `guild:${options.guildId}:member:${options.userId}`;

  return {
    data: `${base}:data`,
    notFound: `${base}:not-found`,
    unauthorized: `${base}:unauthorized`,
  };
}

export function isApiGuildArray(
  value: unknown,
): value is RESTGetAPICurrentUserGuildsResult {
  return Array.isArray(value) && value.every(isApiGuild);
}

export function isApiGuildMember(value: unknown): value is APIGuildMember {
  if (!isRecord(value)) {
    return false;
  }

  const user = value.user;

  return (
    isRecord(user) && typeof user.id === "string" && Array.isArray(value.roles)
  );
}

function isApiGuild(value: unknown): value is RESTAPIPartialCurrentUserGuild {
  return isRecord(value) && typeof value.id === "string";
}
