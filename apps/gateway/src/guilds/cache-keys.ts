const CACHE_KEYS = {
  USER_GUILDS: "user-guilds",
} as const;

export const CACHE_TTL = {
  /**
   * Age after which a join serves the projection while refreshing it. Every
   * access change already reaches the gateway as a member delivery event
   * (`guilds.members.*`), which invalidates the projection and rebalances the
   * user's sockets, so age only bounds how long a lost event can delay a grant.
   */
  USER_GUILDS: 600,
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
