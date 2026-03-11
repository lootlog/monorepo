import { RuntimeEnvironment } from "src/types/runtime.types";

export function getMemberCacheTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 60 * 5 // 5 minutes in local
    : 1000 * 60 * 60; // 60 minutes in prod
}

export function getMemberCacheSoftTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 60 // 1 minute in local
    : 1000 * 60 * 15; // 15 minutes in prod
}

export function getRefreshPermissionsTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 5 // 5 seconds in local
    : 1000 * 60 * 2; // 2 minutes in prod
}

export function getAdminBulkRefreshRateLimit(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 10 // 10 seconds in local
    : 1000 * 60 * 10; // 10 minutes in prod
}

/**
 * Rate limit for game-client Discord refresh.
 * Users can only refresh their Discord roles once per 15 minutes via game-client.
 */
export function getGameClientRefreshRateLimit(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 30 // 30 seconds in local
    : 1000 * 60 * 15; // 15 minutes in prod
}
