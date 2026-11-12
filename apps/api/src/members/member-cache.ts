import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";

export function getMemberCacheSoftTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 60 * 5 // 5 minutes in local
    : 1000 * 60 * 15; // 15 minutes in prod
}

/**
 * How long a member synced with Discord keeps its access while a refresh is
 * pending, queued, or failing transiently.
 */
export const MEMBER_STALE_ACCESS_GRACE_MS = 6 * 60 * 60 * 1000;

export function getRefreshPermissionsTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 60 * 5 // 5 minutes in local
    : 1000 * 60 * 2; // 2 minutes in prod
}

export function getAdminBulkRefreshRateLimit(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 60 * 5 // 5 minutes in local
    : 1000 * 60 * 10; // 10 minutes in prod
}
