export const toSeenAt = (observedAt: string) => {
  const time = Date.parse(observedAt);

  return Number.isNaN(time) ? null : time;
};

export const earliestSeenAt = (
  first: number | null | undefined,
  second: number | null | undefined,
) => {
  if (first === null || first === undefined) return second ?? null;

  if (second === null || second === undefined) return first;

  return Math.min(first, second);
};
