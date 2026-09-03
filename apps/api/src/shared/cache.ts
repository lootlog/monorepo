export const PERMISSIONS_CACHE_TTL_SECONDS = 900;
export const AUTH_TOKEN_CACHE_TTL_SECONDS = 300;
export const GUILD_CACHE_TTL_SECONDS = 3600;
export const EVENT_WRAPPED_CACHE_TTL_SECONDS = 3600;

const PERMISSIONS_CACHE_KEY_PREFIX = "perms";
const AUTH_TOKEN_CACHE_KEY_PREFIX = "auth:idp-token";
const GUILD_CACHE_KEY_PREFIX = "guild";
const USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX = "user-lootlog-config";
const EVENT_WRAPPED_CACHE_KEY_PREFIX = "event-wrapped:v2";
const MEMBER_READ_CACHE_KEY_PREFIX = "member-read";

export function getPermissionsCacheKey(
  userId: string,
  guildId: string,
): string {
  return `${PERMISSIONS_CACHE_KEY_PREFIX}:${userId}:${guildId}`;
}

export function getPermissionsCachePattern(guildId: string): string {
  return `${PERMISSIONS_CACHE_KEY_PREFIX}:*:${guildId}`;
}

export function getAuthTokenCacheKey(
  userId: string,
  discordId: string,
): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}:${discordId}`;
}

export function getAuthTokenCachePattern(userId: string): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}:*`;
}

export function getLegacyAuthTokenCacheKey(userId: string): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}`;
}

export function getGuildCacheKey(idOrVanityUrl: string): string {
  return `${GUILD_CACHE_KEY_PREFIX}:${idOrVanityUrl}`;
}

export function getUserLootlogConfigCachePattern(discordId: string): string {
  return `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}:*`;
}

export function getGuildMemberReferencesCacheKey(
  guildId: string,
  includeInactive: boolean,
): string {
  return `${MEMBER_READ_CACHE_KEY_PREFIX}:${guildId}:references:${
    includeInactive ? "all" : "active"
  }`;
}

export function getGuildMembersSummaryCacheKey(guildId: string): string {
  return `${MEMBER_READ_CACHE_KEY_PREFIX}:${guildId}:summary`;
}

export function getMemberLootlogConfigSummaryCacheKey(
  guildId: string,
  discordId: string,
): string {
  return `${MEMBER_READ_CACHE_KEY_PREFIX}:${guildId}:lootlog-config:${discordId}`;
}

export function getMemberReadCachePattern(guildId: string): string {
  return `${MEMBER_READ_CACHE_KEY_PREFIX}:${guildId}:*`;
}

export function getEventWrappedCacheKey(
  guildId: string,
  eventId: string,
  visibilityScope = "default",
): string {
  return `${EVENT_WRAPPED_CACHE_KEY_PREFIX}:${guildId}:${eventId}:${visibilityScope}`;
}

export function getEventWrappedCachePattern(
  guildId: string,
  eventId: string,
): string {
  return `${EVENT_WRAPPED_CACHE_KEY_PREFIX}:${guildId}:${eventId}:*`;
}
