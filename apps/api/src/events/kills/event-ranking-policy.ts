/**
 * When kill-point edits started living in `EventKillPoint.manualAdjustmentPoints`
 * (migration 20260312221500). Before it, a kill-point edit changed only the
 * kill's points and the ranking total, so recalculation, which recomputes kill
 * points from scratch, must carry those edits on the ranking instead.
 */
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
