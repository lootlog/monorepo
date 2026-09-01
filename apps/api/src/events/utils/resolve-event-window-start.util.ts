import { temporalToDate, type DatabaseTemporal } from "#src/db/temporal";

export function resolveEventWindowStart(params: {
  killedAt: DatabaseTemporal;
  minSpawnTimeAtKill: DatabaseTemporal;
  windowOpenedAt?: DatabaseTemporal | null;
}): Date {
  const killedAt = temporalToDate(params.killedAt);
  const effectiveWindowStart = temporalToDate(
    params.windowOpenedAt ?? params.minSpawnTimeAtKill,
  );

  if (effectiveWindowStart > killedAt) {
    return killedAt;
  }

  return effectiveWindowStart;
}
