import { Period } from "@lootlog/schema/http-scalars";

const LONG_PERIODS = ["90d", "180d"] as const satisfies ReadonlyArray<Period>;

/** Kill statistics offer no window longer than 30 days. */
export type KillStatsPeriod = Exclude<Period, (typeof LONG_PERIODS)[number]>;

const isKillStatsPeriod = (period: Period): period is KillStatsPeriod =>
  !LONG_PERIODS.some((longPeriod) => longPeriod === period);

export const KILL_STATS_PERIODS = Period.literals.filter(isKillStatsPeriod);
