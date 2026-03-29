export type TimeBucket = "24h" | "3d" | "7d" | "30d" | "all";

const HOURS_MAP: Record<Exclude<TimeBucket, "all">, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "30d": 720,
};

export function getDateThreshold(bucket: TimeBucket): Date | null {
  if (bucket === "all") return null;
  const threshold = new Date(Date.now() - HOURS_MAP[bucket] * 3_600_000);
  threshold.setUTCHours(0, 0, 0, 0);
  return threshold;
}

export function getTodayDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function buildDateCondition(bucket?: TimeBucket) {
  const threshold = getDateThreshold(bucket ?? "all");
  return threshold ? { killedAtDate: { gte: threshold } } : {};
}
