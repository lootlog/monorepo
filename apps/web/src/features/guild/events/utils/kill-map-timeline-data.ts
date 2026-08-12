import type { MapAssignment, MapGap, MapTimelineData } from "../types/api";

export type NormalizedMapGap = Omit<
  MapGap,
  "id" | "endedAt" | "durationSeconds"
> & {
  id: string;
  endedAt: string;
  durationSeconds: number;
  sourceIds: string[];
};

export interface NormalizedAssignmentPeriod {
  id: string;
  assignedAt: string;
  unassignedAt: string;
  durationSeconds: number;
}

export interface GroupedMapAssignment {
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  memberUserId: string;
  periods: NormalizedAssignmentPeriod[];
  totalDurationSeconds: number;
}

export interface KillMapTimelineDiagnostics {
  isValidWindow: boolean;
  totalSeconds: number;
  coveredSeconds: number;
  coveragePercent: number;
  uncoveredSeconds: number;
  uncoveredCount: number;
  unassignedSeconds: number;
  unassignedCount: number;
  gaps: NormalizedMapGap[];
  assignments: GroupedMapAssignment[];
}

interface RawInterval {
  startMs: number;
  endMs: number;
}

interface ClippedGapInterval extends RawInterval {
  gapType: MapGap["gapType"];
  sourceId: string;
}

interface GapSegment extends RawInterval {
  gapType: MapGap["gapType"];
  sourceIds: Set<string>;
}

const toValidTimestamp = (value: string | Date): number | null => {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const clipInterval = (
  startValue: string,
  endValue: string | null,
  windowStartMs: number,
  windowEndMs: number,
): RawInterval | null => {
  const intervalStartMs = toValidTimestamp(startValue);
  const intervalEndMs = endValue ? toValidTimestamp(endValue) : windowEndMs;

  if (intervalStartMs === null || intervalEndMs === null) return null;

  const startMs = Math.max(intervalStartMs, windowStartMs);
  const endMs = Math.min(intervalEndMs, windowEndMs);
  return endMs > startMs ? { startMs, endMs } : null;
};

const getGapId = (segment: GapSegment): string => {
  const sourceIds = [...segment.sourceIds].sort();
  return [
    segment.gapType,
    new Date(segment.startMs).toISOString(),
    new Date(segment.endMs).toISOString(),
    sourceIds.join(","),
  ].join(":");
};

const normalizeGaps = (
  gaps: MapGap[],
  windowStartMs: number,
  windowEndMs: number,
): NormalizedMapGap[] => {
  const clippedGaps: ClippedGapInterval[] = [];

  for (const gap of gaps) {
    const interval = clipInterval(
      gap.startedAt,
      gap.endedAt,
      windowStartMs,
      windowEndMs,
    );
    if (!interval) continue;

    clippedGaps.push({
      ...interval,
      gapType: gap.gapType,
      sourceId: gap.id,
    });
  }

  const boundaries = [
    ...new Set(clippedGaps.flatMap((gap) => [gap.startMs, gap.endMs])),
  ].sort((first, second) => first - second);
  const segments: GapSegment[] = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index];
    const endMs = boundaries[index + 1];
    if (startMs === undefined || endMs === undefined) continue;
    const activeGaps = clippedGaps.filter(
      (gap) => gap.startMs < endMs && gap.endMs > startMs,
    );
    if (activeGaps.length === 0) continue;

    const gapType = activeGaps.some((gap) => gap.gapType === "UNASSIGNED")
      ? "UNASSIGNED"
      : "UNCOVERED";
    const sourceIds = new Set(
      activeGaps
        .filter((gap) => gap.gapType === gapType)
        .map((gap) => gap.sourceId),
    );
    const previousSegment = segments[segments.length - 1];

    if (
      previousSegment?.gapType === gapType &&
      previousSegment.endMs === startMs
    ) {
      previousSegment.endMs = endMs;
      for (const sourceId of sourceIds) {
        previousSegment.sourceIds.add(sourceId);
      }
      continue;
    }

    segments.push({ startMs, endMs, gapType, sourceIds });
  }

  return segments.map((segment) => ({
    id: getGapId(segment),
    gapType: segment.gapType,
    startedAt: new Date(segment.startMs).toISOString(),
    endedAt: new Date(segment.endMs).toISOString(),
    durationSeconds: Math.round((segment.endMs - segment.startMs) / 1000),
    sourceIds: [...segment.sourceIds].sort(),
  }));
};

const normalizeAssignmentPeriods = (
  assignments: MapAssignment[],
  windowStartMs: number,
  windowEndMs: number,
): GroupedMapAssignment[] => {
  const assignmentsByMember = new Map<number, MapAssignment[]>();

  for (const assignment of assignments) {
    const memberAssignments =
      assignmentsByMember.get(assignment.memberId) ?? [];
    memberAssignments.push(assignment);
    assignmentsByMember.set(assignment.memberId, memberAssignments);
  }

  const groups: GroupedMapAssignment[] = [];

  for (const [memberId, memberAssignments] of assignmentsByMember) {
    const sortedAssignments = [...memberAssignments].sort((first, second) =>
      first.assignedAt.localeCompare(second.assignedAt),
    );
    const intervals = sortedAssignments
      .map((assignment) =>
        clipInterval(
          assignment.assignedAt,
          assignment.unassignedAt,
          windowStartMs,
          windowEndMs,
        ),
      )
      .filter((interval): interval is RawInterval => interval !== null)
      .sort((first, second) => first.startMs - second.startMs);
    const mergedIntervals: RawInterval[] = [];

    for (const interval of intervals) {
      const previousInterval = mergedIntervals[mergedIntervals.length - 1];
      if (previousInterval && interval.startMs <= previousInterval.endMs) {
        previousInterval.endMs = Math.max(
          previousInterval.endMs,
          interval.endMs,
        );
      } else {
        mergedIntervals.push({ ...interval });
      }
    }

    if (mergedIntervals.length === 0) continue;

    const representative = sortedAssignments[0];
    if (!representative) continue;
    const periods = mergedIntervals.map((interval) => ({
      id: `${memberId}:${new Date(interval.startMs).toISOString()}:${new Date(interval.endMs).toISOString()}`,
      assignedAt: new Date(interval.startMs).toISOString(),
      unassignedAt: new Date(interval.endMs).toISOString(),
      durationSeconds: Math.round((interval.endMs - interval.startMs) / 1000),
    }));

    groups.push({
      memberId,
      memberName: representative.memberName,
      memberAvatar: representative.memberAvatar,
      memberUserId: representative.memberUserId,
      periods,
      totalDurationSeconds: periods.reduce(
        (total, period) => total + period.durationSeconds,
        0,
      ),
    });
  }

  return groups.sort((first, second) =>
    first.memberName.localeCompare(second.memberName, "pl"),
  );
};

export const getKillMapTimelineDiagnostics = (
  map: MapTimelineData,
  startTime: Date,
  endTime: Date,
): KillMapTimelineDiagnostics => {
  const windowStartMs = toValidTimestamp(startTime);
  const windowEndMs = toValidTimestamp(endTime);

  if (
    windowStartMs === null ||
    windowEndMs === null ||
    windowEndMs <= windowStartMs
  ) {
    return {
      isValidWindow: false,
      totalSeconds: 0,
      coveredSeconds: 0,
      coveragePercent: 0,
      uncoveredSeconds: 0,
      uncoveredCount: 0,
      unassignedSeconds: 0,
      unassignedCount: 0,
      gaps: [],
      assignments: [],
    };
  }

  const gaps = normalizeGaps(map.gaps, windowStartMs, windowEndMs);
  let uncoveredSeconds = 0;
  let uncoveredCount = 0;
  let unassignedSeconds = 0;
  let unassignedCount = 0;

  for (const gap of gaps) {
    if (gap.gapType === "UNASSIGNED") {
      unassignedSeconds += gap.durationSeconds;
      unassignedCount += 1;
    } else {
      uncoveredSeconds += gap.durationSeconds;
      uncoveredCount += 1;
    }
  }

  const totalSeconds = Math.round((windowEndMs - windowStartMs) / 1000);
  const coveredSeconds = Math.max(
    0,
    totalSeconds - uncoveredSeconds - unassignedSeconds,
  );

  return {
    isValidWindow: true,
    totalSeconds,
    coveredSeconds,
    coveragePercent: Math.round((coveredSeconds / totalSeconds) * 100),
    uncoveredSeconds,
    uncoveredCount,
    unassignedSeconds,
    unassignedCount,
    gaps,
    assignments: normalizeAssignmentPeriods(
      map.assignments,
      windowStartMs,
      windowEndMs,
    ),
  };
};
