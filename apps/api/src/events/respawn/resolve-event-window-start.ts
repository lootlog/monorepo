export function resolveEventWindowStart(params: {
  killedAt: Date;
  minSpawnTimeAtKill: Date;
  windowOpenedAt?: Date | null;
}): Date {
  const effectiveWindowStart =
    params.windowOpenedAt ?? params.minSpawnTimeAtKill;

  if (effectiveWindowStart > params.killedAt) {
    return params.killedAt;
  }

  return effectiveWindowStart;
}
