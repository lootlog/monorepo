const CACHE_KEYS = {
  USER_GUILDS: "user-guilds",
} as const;

export const CACHE_TTL = {
  /** Age after which a join serves the projection while refreshing it. */
  USER_GUILDS: 60,
  /**
   * Retention and maximum age of a projection served to a join. Explicit
   * invalidation, not age, revokes access, so a projection that has not been
   * invalidated carries the same authority as a session that joined with it.
   * Matches the API's per-Organization permission cache (15 minutes).
   */
  MAX_STALE_CACHE_AGE: 900,
} as const;

export function getUserGuildsCacheKey(
  discordId: string,
  userId: string,
): string {
  return `${CACHE_KEYS.USER_GUILDS}:${discordId}:${userId}`;
}
