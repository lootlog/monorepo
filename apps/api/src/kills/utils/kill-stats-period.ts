import * as z from "zod";

export const KillStatsPeriodSchema = z.enum([
  "all",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
]);

export type KillStatsPeriod = z.infer<typeof KillStatsPeriodSchema>;

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

  const result = KillStatsPeriodSchema.safeParse(period);
  return result.success ? result.data : undefined;
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
