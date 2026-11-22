const CACHE_KEYS = {
  USER_GUILDS: "user-guilds",
} as const;

export const CACHE_TTL = {
  USER_GUILDS: 600,
  MAX_STALE_CACHE_AGE: 900,
} as const;

export function getUserGuildsCacheKey(
  discordId: string,
  userId: string,
): string {
  return `${CACHE_KEYS.USER_GUILDS}:${discordId}:${userId}`;
}
