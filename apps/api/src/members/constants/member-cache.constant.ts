import { RuntimeEnvironment } from 'src/types/runtime.types';

export function getMemberCacheTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 10 // 10 seconds in local
    : 1000 * 60 * 30; // 30 minutes in prod
}

export function getMemberCacheSoftTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 5 // 5 seconds in local
    : 1000 * 60 * 15; // 15 minutes in prod
}

export function getRefreshPermissionsTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 5 // 5 seconds in local
    : 1000 * 60 * 2; // 2 minutes in prod
}

export function getAdminBulkRefreshRateLimit(
  env: RuntimeEnvironment,
): number {
  return env === RuntimeEnvironment.LOCAL
    ? 1000 * 10 // 10 seconds in local
    : 1000 * 60 * 10; // 10 minutes in prod
}

// Legacy exports for backward compatibility (use prod values)
export const MEMBER_CACHE_TTL = 1000 * 60 * 30; // 30 minutes
export const MEMBER_CACHE_SOFT_TTL = 1000 * 60 * 15; // 15 minutes (stale-while-revalidate)
export const REFRESH_PERMISSIONS_TTL = 1000 * 60 * 2; // 2 minutes
export const ADMIN_BULK_REFRESH_RATE_LIMIT = 1000 * 60 * 10; // 10 minutes between bulk refreshes
