import type { KillsControllerGetUserKillStatsParams } from "@lootlog/client/main";

/**
 * All-time personal kill totals. The API counts only the last 7 days when the
 * period is omitted; sharing one params object also shares one cache entry.
 */
export const LIFETIME_KILL_STATS_PARAMS = {
  period: "all",
} as const satisfies KillsControllerGetUserKillStatsParams;
