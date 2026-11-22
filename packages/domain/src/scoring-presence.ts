export type PresenceParticipantId = number | string;

export type PresenceInterval = {
  participantId: PresenceParticipantId;
  start: Date;
  end: Date | null;
};

export type PresenceWindow = {
  start: Date | null;
  end: Date;
};

type MsInterval = { start: number; end: number };

export type ParticipantPresence = {
  participantId: PresenceParticipantId;
  hasData: boolean;
  intervals: readonly MsInterval[];
  countedMs: number;
  windowShare: number;
  firstJoinAt: Date | null;
  joinDelayMs: number | null;
  presentAtKill: boolean;
  lastLeaveAt: Date | null;
  msByGroupSize: ReadonlyMap<number, number>;
};

type PresenceSegment = MsInterval & { size: number };

export const GROUP_COUNTINGS = [
  "WINDOW",
  "AT_KILL",
  "MIN_SHARE",
  "TIMELINE",
] as const;

export type GroupCounting = (typeof GROUP_COUNTINGS)[number];

type GroupMemberExclusion =
  | "NO_COUNTED_TIME"
  | "BELOW_MIN_SHARE"
  | "NOT_PRESENT_AT_KILL";

export type GroupMembership = {
  participantId: PresenceParticipantId;
  included: boolean;
  exclusion: GroupMemberExclusion | null;
  windowShare: number;
};

export type EventKillPresence = {
  window: PresenceWindow;
  windowMs: number | null;
  participants: ReadonlyMap<PresenceParticipantId, ParticipantPresence>;
  missingParticipantIds: readonly PresenceParticipantId[];
  segments: readonly PresenceSegment[];
  groupMembership: (
    counting: Exclude<GroupCounting, "TIMELINE">,
    minSharePercentage: number,
  ) => readonly GroupMembership[];
};

export const GROUP_SIZE_COMPARISONS = [
  "EXACT",
  "AT_MOST",
  "AT_LEAST",
  "BETWEEN",
] as const;

type GroupSizeComparison = (typeof GROUP_SIZE_COMPARISONS)[number];

export type GroupSizeRange = {
  comparison: GroupSizeComparison;
  value: number;
  to: number;
};

export function isGroupSizeInRange(size: number, range: GroupSizeRange) {
  switch (range.comparison) {
    case "EXACT":
      return size === range.value;
    case "AT_MOST":
      return size >= 1 && size <= range.value;
    case "AT_LEAST":
      return size >= range.value;
    case "BETWEEN":
      return size >= range.value && size <= range.to;
  }
}

export function resolveEventScoringWindow(params: {
  killedAt: Date;
  minSpawnTimeAtKill: Date | null | undefined;
  maxSpawnTimeAtKill: Date | null | undefined;
}): PresenceWindow {
  const end =
    params.maxSpawnTimeAtKill && params.maxSpawnTimeAtKill < params.killedAt
      ? params.maxSpawnTimeAtKill
      : params.killedAt;

  const start =
    params.minSpawnTimeAtKill &&
    Number.isFinite(params.minSpawnTimeAtKill.getTime()) &&
    params.minSpawnTimeAtKill < end
      ? params.minSpawnTimeAtKill
      : null;

  return { start, end };
}

export function resolveKillPresenceState(params: {
  intervals: ReadonlyArray<Pick<PresenceInterval, "start" | "end">>;
  windowStart: Date;
  windowEnd: Date;
}) {
  let memberPresentAtKill = false;
  let memberLeaveTime: Date | null = null;

  for (const interval of params.intervals) {
    if (interval.start > params.windowEnd) continue;

    if (!interval.end || interval.end >= params.windowEnd) {
      memberPresentAtKill = true;
      continue;
    }

    if (
      interval.end >= params.windowStart &&
      (!memberLeaveTime || interval.end > memberLeaveTime)
    ) {
      memberLeaveTime = interval.end;
    }
  }

  return { memberPresentAtKill, memberLeaveTime };
}

function mergeIntervals(intervals: MsInterval[]): MsInterval[] {
  const sorted = [...intervals].sort((left, right) => left.start - right.start);
  const merged: MsInterval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];

    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function groupByParticipant(intervals: readonly PresenceInterval[]) {
  const byId = new Map<PresenceParticipantId, PresenceInterval[]>();

  for (const interval of intervals) {
    const group = byId.get(interval.participantId);

    if (group) group.push(interval);
    else byId.set(interval.participantId, [interval]);
  }

  return byId;
}

function clipToWindow(
  intervals: readonly PresenceInterval[],
  startMs: number,
  endMs: number,
) {
  const clipped: MsInterval[] = [];

  for (const interval of intervals) {
    const start = Math.max(interval.start.getTime(), startMs);
    const end = Math.min(interval.end?.getTime() ?? endMs, endMs);

    if (end > start) clipped.push({ start, end });
  }

  return mergeIntervals(clipped);
}

function sweepGroupSizes(
  mergedById: ReadonlyMap<PresenceParticipantId, readonly MsInterval[]>,
) {
  const msByGroupSizeById = new Map<PresenceParticipantId, Map<number, number>>(
    [...mergedById.keys()].map((id) => [id, new Map()]),
  );

  const boundaries = [...mergedById].flatMap(([id, intervals]) =>
    intervals.flatMap((interval) => [
      { at: interval.start, delta: 1, id },
      { at: interval.end, delta: -1, id },
    ]),
  );

  boundaries.sort(
    (left, right) => left.at - right.at || left.delta - right.delta,
  );

  const segments: PresenceSegment[] = [];
  const active = new Set<PresenceParticipantId>();
  let previousAt = boundaries[0]?.at ?? 0;

  for (const boundary of boundaries) {
    if (boundary.at > previousAt && active.size > 0) {
      const size = active.size;
      const last = segments[segments.length - 1];

      if (last && last.end === previousAt && last.size === size) {
        last.end = boundary.at;
      } else {
        segments.push({ start: previousAt, end: boundary.at, size });
      }

      for (const id of active) {
        const bySize = msByGroupSizeById.get(id);
        bySize?.set(size, (bySize.get(size) ?? 0) + boundary.at - previousAt);
      }
    }

    previousAt = boundary.at;

    if (boundary.delta > 0) active.add(boundary.id);
    else active.delete(boundary.id);
  }

  return { segments, msByGroupSizeById };
}

export function analyzeEventKillPresence(params: {
  window: PresenceWindow;
  participantIds: readonly PresenceParticipantId[];
  intervals: readonly PresenceInterval[];
}): EventKillPresence {
  const { window } = params;
  const endMs = window.end.getTime();
  const startMs = window.start?.getTime() ?? null;
  const windowMs = startMs === null ? null : endMs - startMs;
  const rawById = groupByParticipant(params.intervals);

  const ids = [...new Set([...params.participantIds, ...rawById.keys()])];

  const mergedById = new Map(
    ids.map((id) => [
      id,
      startMs === null
        ? []
        : clipToWindow(rawById.get(id) ?? [], startMs, endMs),
    ]),
  );

  const { segments, msByGroupSizeById } = sweepGroupSizes(mergedById);

  const participants = new Map(
    ids.map((id): [PresenceParticipantId, ParticipantPresence] => {
      const intervals = mergedById.get(id) ?? [];
      const first = intervals[0];

      const { memberPresentAtKill, memberLeaveTime } = resolveKillPresenceState(
        {
          intervals: rawById.get(id) ?? [],
          windowStart: window.start ?? window.end,
          windowEnd: window.end,
        },
      );

      const countedMs = intervals.reduce(
        (sum, interval) => sum + interval.end - interval.start,
        0,
      );

      return [
        id,
        {
          participantId: id,
          hasData: rawById.has(id),
          intervals,
          countedMs,
          windowShare: windowMs ? countedMs / windowMs : 0,
          firstJoinAt: first ? new Date(first.start) : null,
          joinDelayMs: first && startMs !== null ? first.start - startMs : null,
          presentAtKill: memberPresentAtKill,
          lastLeaveAt: memberPresentAtKill ? null : memberLeaveTime,
          msByGroupSize: msByGroupSizeById.get(id) ?? new Map(),
        },
      ];
    }),
  );

  const membershipCache = new Map<string, GroupMembership[]>();

  const groupMembership: EventKillPresence["groupMembership"] = (
    counting,
    minSharePercentage,
  ) => {
    const key = `${counting}:${minSharePercentage}`;

    const membership =
      membershipCache.get(key) ??
      [...participants.values()].map((participant): GroupMembership => {
        const exclusion = getGroupExclusion(
          participant,
          counting,
          minSharePercentage,
          windowMs,
        );

        return {
          participantId: participant.participantId,
          included: exclusion === null,
          exclusion,
          windowShare: participant.windowShare,
        };
      });

    membershipCache.set(key, membership);

    return membership;
  };

  return {
    window,
    windowMs: windowMs !== null && windowMs > 0 ? windowMs : null,
    participants,
    missingParticipantIds: ids.filter((id) => !rawById.has(id)),
    segments,
    groupMembership,
  };
}

function getGroupExclusion(
  participant: ParticipantPresence,
  counting: Exclude<GroupCounting, "TIMELINE">,
  minSharePercentage: number,
  windowMs: number | null,
): GroupMemberExclusion | null {
  if (counting === "AT_KILL") {
    return participant.presentAtKill ? null : "NOT_PRESENT_AT_KILL";
  }

  if (participant.countedMs <= 0) return "NO_COUNTED_TIME";

  if (
    counting === "MIN_SHARE" &&
    (windowMs === null ||
      participant.countedMs * 100 < minSharePercentage * windowMs)
  ) {
    return "BELOW_MIN_SHARE";
  }

  return null;
}

export type GroupTimeShare = {
  matchedMs: number;
  ownMs: number;
  percentage: number;
};

export function getGroupTimeShare(
  participant: ParticipantPresence,
  range: GroupSizeRange,
): GroupTimeShare {
  let matchedMs = 0;

  for (const [size, ms] of participant.msByGroupSize) {
    if (isGroupSizeInRange(size, range)) matchedMs += ms;
  }

  return {
    matchedMs,
    ownMs: participant.countedMs,
    percentage:
      participant.countedMs > 0 ? (matchedMs / participant.countedMs) * 100 : 0,
  };
}

export function getPresenceScoringContext(
  analysis: EventKillPresence,
  participantId: PresenceParticipantId,
) {
  const participant = analysis.participants.get(participantId);

  const trackingDurationSeconds = Math.round(
    (participant?.countedMs ?? 0) / 1000,
  );

  const windowSeconds =
    analysis.windowMs === null ? 0 : Math.floor(analysis.windowMs / 1000);

  return {
    trackingDurationSeconds,
    trackingDurationPercentage:
      windowSeconds > 0
        ? Math.min(
            100,
            Math.round((trackingDurationSeconds / windowSeconds) * 100),
          )
        : undefined,
    respawnStartTime: analysis.window.start ?? analysis.window.end,
    killTime: analysis.window.end,
    memberPresentAtKill: participant?.presentAtKill ?? false,
    memberLeaveTime: participant?.lastLeaveAt ?? null,
    presence: { analysis, participantId },
  };
}
