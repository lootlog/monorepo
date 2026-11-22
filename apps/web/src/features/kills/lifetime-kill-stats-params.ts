import type { KillsControllerGetUserKillStatsParams } from "@lootlog/client/main";

export const LIFETIME_KILL_STATS_PARAMS = {
  period: "all",
} as const satisfies KillsControllerGetUserKillStatsParams;
