export const CACHE_KEYS = {
  USER_GUILDS: 'user-guilds',
} as const;

export const CACHE_TTL = {
  USER_GUILDS: 60,
  /** Maximum age for stale cache fallback (5 minutes) */
  MAX_STALE_CACHE_AGE: 300,
} as const;

export function getUserGuildsCacheKey(
  discordId: string,
  userId: string,
  accountId?: string,
  characterId?: string,
): string {
  const normalizedAccountId =
    typeof accountId === 'string' && accountId.trim().length > 0
      ? accountId.trim()
      : 'none';
  const normalizedCharacterId =
    typeof characterId === 'string' && characterId.trim().length > 0
      ? characterId.trim()
      : 'none';

  return `${CACHE_KEYS.USER_GUILDS}:${discordId}:${userId}:${normalizedAccountId}:${normalizedCharacterId}`;
}

export function getUserGuildsCachePattern(
  discordId: string,
  userId: string,
): string {
  return `${CACHE_KEYS.USER_GUILDS}:${discordId}:${userId}:*`;
}
