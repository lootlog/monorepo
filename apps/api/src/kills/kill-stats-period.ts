import { Schema } from "effect";

import { KillStatsPeriodSchema } from "#src/contracts/kills/schemas";

export type KillStatsPeriod = typeof KillStatsPeriodSchema.Type;

const PERIOD_HOURS: Record<Exclude<KillStatsPeriod, "all">, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "14d": 336,
  "30d": 720,
};

export const getKillStatsBucketStart = (date: Date): Date => {
  const bucketStart = new Date(date);
  bucketStart.setUTCMinutes(0, 0, 0);

  return bucketStart;
};

export const normalizeKillStatsPeriod = (
  period: string | undefined,
): KillStatsPeriod | undefined => {
  if (!period) {
    return undefined;
  }

  return Schema.is(KillStatsPeriodSchema)(period) ? period : undefined;
};

export const getKillStatsPeriodStart = (
  period: KillStatsPeriod | undefined,
  now = new Date(),
): Date | undefined => {
  if (!period || period === "all") {
    return undefined;
  }

  const periodStart = new Date(now);
  periodStart.setUTCHours(periodStart.getUTCHours() - PERIOD_HOURS[period]);

  return getKillStatsBucketStart(periodStart);
};
