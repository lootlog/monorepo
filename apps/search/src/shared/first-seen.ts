/** Epoch milliseconds of an ISO observation time; null when it is unknown. */
export const toSeenAt = (observedAt: string | undefined) => {
  if (observedAt === undefined) return null;

  const time = Date.parse(observedAt);

  return Number.isNaN(time) ? null : time;
};

/**
 * The earlier of two observations. Order of delivery is not chronology, so a
 * catalog entry keeps the earliest time any delivery reports.
 */
export const earliestSeenAt = (
  first: number | null | undefined,
  second: number | null | undefined,
) => {
  if (first === null || first === undefined) return second ?? null;

  if (second === null || second === undefined) return first;

  return Math.min(first, second);
};
