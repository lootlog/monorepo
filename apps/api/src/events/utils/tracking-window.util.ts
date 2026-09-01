import { temporalToDate, type DatabaseTemporal } from "#src/db/temporal";

type TrackingWindowInterval = {
  start: Date;
  end: Date;
};

/**
 * Clips an interval (with optional open end) to a window, returning the
 * clamped start/end as Dates. A `null` end is treated as `windowEnd`.
 */
export function clipToWindow(params: {
  start: DatabaseTemporal;
  end: DatabaseTemporal | null;
  windowStart: DatabaseTemporal;
  windowEnd: DatabaseTemporal;
}): { start: Date; end: Date } {
  const start = temporalToDate(params.start);
  const windowStart = temporalToDate(params.windowStart);
  const windowEnd = temporalToDate(params.windowEnd);
  const effectiveEnd = temporalToDate(params.end) ?? windowEnd;
  return {
    start: new Date(Math.max(start.getTime(), windowStart.getTime())),
    end: new Date(Math.min(effectiveEnd.getTime(), windowEnd.getTime())),
  };
}

/**
 * Like {@link clipToWindow} but returns the duration in whole seconds,
 * clamped to a minimum of 0.
 */
export function clipToWindowSeconds(params: {
  start: DatabaseTemporal;
  end: DatabaseTemporal | null;
  windowStart: DatabaseTemporal;
  windowEnd: DatabaseTemporal;
}): number {
  const { start, end } = clipToWindow(params);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
}

export function clipIntervalToWindow(params: {
  start: DatabaseTemporal;
  end: DatabaseTemporal;
  windowStart: DatabaseTemporal;
  windowEnd: DatabaseTemporal;
}): TrackingWindowInterval | null {
  const start = temporalToDate(params.start);
  const end = temporalToDate(params.end);
  const windowStart = temporalToDate(params.windowStart);
  const windowEnd = temporalToDate(params.windowEnd);
  const clippedStart = start > windowStart ? start : windowStart;
  const clippedEnd = end < windowEnd ? end : windowEnd;

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
  killedAt: DatabaseTemporal;
  minSpawnTimeAtKill: DatabaseTemporal;
}): Date {
  const killedAt = temporalToDate(params.killedAt);
  const minSpawnTimeAtKill = temporalToDate(params.minSpawnTimeAtKill);
  return minSpawnTimeAtKill > killedAt ? killedAt : minSpawnTimeAtKill;
}

export function getTrackingWindowDurationSeconds(params: {
  killedAt: DatabaseTemporal;
  minSpawnTimeAtKill: DatabaseTemporal;
}): number {
  const killedAt = temporalToDate(params.killedAt);
  const trackingWindowStartTime = getTrackingWindowStartTime(params);

  return Math.max(
    0,
    Math.floor((killedAt.getTime() - trackingWindowStartTime.getTime()) / 1000),
  );
}
