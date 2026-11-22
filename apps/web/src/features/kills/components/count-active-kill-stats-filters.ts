import type { KillStatsFiltersProps } from "./kill-stats-filters";

export const countActiveKillStatsFilters = ({
  world,
  period,
  level,
  npcType,
}: KillStatsFiltersProps) =>
  [
    Boolean(world?.value),
    period !== undefined && period !== "all",
    Boolean(npcType?.value),
    Boolean(level?.minLvl || level?.maxLvl),
  ].filter(Boolean).length;
