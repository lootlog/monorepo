export const PERMISSIONS_CACHE_TTL_SECONDS = 900;

export const AUTH_TOKEN_CACHE_TTL_SECONDS = 300;

// A cached Discord token must stop being served before Discord expires it.
export const AUTH_TOKEN_EXPIRY_MARGIN_SECONDS = 60;

// Discord never accepts a rejected access token again, and its access tokens
// expire after seven days, so a rejection marker lasts the token's lifetime.
export const REJECTED_AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const EVENT_WRAPPED_CACHE_TTL_SECONDS = 3600;

const PERMISSIONS_CACHE_KEY_PREFIX = "perms";

const AUTH_TOKEN_CACHE_KEY_PREFIX = "auth:idp-token";

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

/** Marks one access token, by fingerprint, as rejected by Discord. */
export function getRejectedAuthTokenKey(
  userId: string,
  discordId: string,
  tokenFingerprint: string,
): string {
  return `${getAuthTokenCacheKey(userId, discordId)}:rejected:${tokenFingerprint}`;
}

export function getAuthTokenCachePattern(userId: string): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}:*`;
}

export function getLegacyAuthTokenCacheKey(userId: string): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}`;
}

export function getUserGuildPermissionsCacheScope(discordId: string): string {
  return `user-guild-permissions:${discordId}`;
}

export function getUserLootlogConfigCacheScope(discordId: string): string {
  return `${USER_LOOTLOG_CONFIG_CACHE_KEY_PREFIX}:${discordId}`;
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

export function getMemberReadCacheScope(guildId: string): string {
  return `${MEMBER_READ_CACHE_KEY_PREFIX}:${guildId}`;
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
  eventId = "*",
): string {
  return `${EVENT_WRAPPED_CACHE_KEY_PREFIX}:${guildId}:${eventId}:*`;
}

/** Read-cache generation scope of an Organization's loot list pages. */
export function getLootListCacheScope(guildId: string): string {
  return `loots:list:${guildId}`;
}

/** Read-cache generation scope of an Organization's loot statistics. */
export function getLootStatsCacheScope(guildId: string): string {
  return `loot-stats:${guildId}`;
}
