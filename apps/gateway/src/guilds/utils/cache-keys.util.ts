export const CACHE_KEYS = {
  USER_GUILDS: 'user-guilds',
} as const;

export const CACHE_TTL = {
  USER_GUILDS: 1800,
} as const;

export function getUserGuildsCacheKey(discordId: string, userId: string): string {
  return `${CACHE_KEYS.USER_GUILDS}:${discordId}:${userId}`;
}
