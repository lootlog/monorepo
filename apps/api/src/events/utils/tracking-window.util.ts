export type TrackingWindowInterval = {
  start: Date;
  end: Date;
};

export function clipIntervalToWindow(params: {
  start: Date;
  end: Date;
  windowStart: Date;
  windowEnd: Date;
}): TrackingWindowInterval | null {
  const clippedStart =
    params.start > params.windowStart ? params.start : params.windowStart;
  const clippedEnd =
    params.end < params.windowEnd ? params.end : params.windowEnd;

  if (clippedEnd < clippedStart) {
    return null;
  }

  return { start: clippedStart, end: clippedEnd };
}

export function calculateTrackingDurationSeconds(
  intervals: TrackingWindowInterval[],
): number {
  if (intervals.length === 0) {
    return 0;
  }

  const sortedIntervals = [...intervals].sort(
    (leftInterval, rightInterval) =>
      leftInterval.start.getTime() - rightInterval.start.getTime(),
  );

  let totalMs = 0;
  let currentStartMs = sortedIntervals[0].start.getTime();
  let currentEndMs = sortedIntervals[0].end.getTime();

  for (let index = 1; index < sortedIntervals.length; index++) {
    const nextStartMs = sortedIntervals[index].start.getTime();
    const nextEndMs = sortedIntervals[index].end.getTime();

    if (nextStartMs <= currentEndMs) {
      currentEndMs = Math.max(currentEndMs, nextEndMs);
      continue;
    }

    totalMs += currentEndMs - currentStartMs;
    currentStartMs = nextStartMs;
    currentEndMs = nextEndMs;
  }

  totalMs += currentEndMs - currentStartMs;
  return Math.round(totalMs / 1000);
}

export function getTrackingWindowStartTime(params: {
  killedAt: Date;
  minSpawnTimeAtKill: Date;
}): Date {
  return params.minSpawnTimeAtKill > params.killedAt
    ? params.killedAt
    : params.minSpawnTimeAtKill;
}

export function getTrackingWindowDurationSeconds(params: {
  killedAt: Date;
  minSpawnTimeAtKill: Date;
}): number {
  const trackingWindowStartTime = getTrackingWindowStartTime(params);

  return Math.max(
    0,
    Math.floor(
      (params.killedAt.getTime() - trackingWindowStartTime.getTime()) / 1000,
    ),
  );
}
