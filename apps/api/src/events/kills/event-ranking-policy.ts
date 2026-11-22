export const KILL_POINT_ADJUSTMENTS_TRACKED_SINCE = new Date(
  "2026-03-12T22:15:00.000Z",
);

export const roundPoints = (value: number) =>
  Math.round(value * 10_000) / 10_000;

export const isKillPointCountedInRanking = (point: {
  confirmationDeadlineAt: Date | null;
  confirmedAt: Date | null;
}) =>
  point.confirmationDeadlineAt === null ||
  (point.confirmedAt !== null &&
    point.confirmedAt.getTime() <= point.confirmationDeadlineAt.getTime());

export function getTrackingDurationSecondsForRanking(params: {
  trackingDurationSeconds: number | null | undefined;
}): number {
  if (!Number.isFinite(params.trackingDurationSeconds)) {
    return 0;
  }

  return Math.max(0, Math.round(params.trackingDurationSeconds ?? 0));
}
