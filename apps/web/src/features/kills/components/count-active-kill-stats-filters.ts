import type { KillStatsFiltersProps } from "./kill-stats-filters";

/**
 * How many kill statistics filters narrow the results, for the button that
 * opens them on narrow pages. A level range counts once, whichever bound it
 * sets; the period counts once it leaves the default of all time.
 */
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
