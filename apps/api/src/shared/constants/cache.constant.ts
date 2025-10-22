export const PERMISSIONS_CACHE_TTL_SECONDS = 60;
export const AUTH_TOKEN_CACHE_TTL_SECONDS = 300;

export const PERMISSIONS_CACHE_KEY_PREFIX = 'perms';
export const AUTH_TOKEN_CACHE_KEY_PREFIX = 'auth:idp-token';

export function getPermissionsCacheKey(
  userId: string,
  guildId: string,
): string {
  return `${PERMISSIONS_CACHE_KEY_PREFIX}:${userId}:${guildId}`;
}

export function getAuthTokenCacheKey(userId: string): string {
  return `${AUTH_TOKEN_CACHE_KEY_PREFIX}:${userId}`;
}
