export const KILL_STATS_PERIODS = [
  "all",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
] as const;

export type KillStatsPeriod = (typeof KILL_STATS_PERIODS)[number];
