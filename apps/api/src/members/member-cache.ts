import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";

export function getMemberCacheSoftTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL ? 1000 * 60 * 5 : 1000 * 60 * 15;
}

export const MEMBER_STALE_ACCESS_GRACE_MS = 6 * 60 * 60 * 1000;

export function getRefreshPermissionsTtl(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL ? 1000 * 60 * 5 : 1000 * 60 * 2;
}

export function getAdminBulkRefreshRateLimit(env: RuntimeEnvironment): number {
  return env === RuntimeEnvironment.LOCAL ? 1000 * 60 * 5 : 1000 * 60 * 10;
}
