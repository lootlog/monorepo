/**
 * Shared presence analysis for one kill: which ranking participants watched
 * the hero, when, and alongside how many others. Live scoring, explicit
 * recalculation, the kill breakdown and the simulator all build the analysis
 * here so the same intervals always produce the same numbers.
 *
 * Time is computed on half-open intervals `[start, end)`: a member leaving at
 * the instant another one arrives never forms a two-person group. Presence at
 * the kill keeps its own explicit semantics (see {@link resolveKillPresenceState}).
 */

export type PresenceParticipantId = number | string;

export type PresenceInterval = {
  participantId: PresenceParticipantId;
  start: Date;
  /** `null` means the presence was still open when the window ended. */
  end: Date | null;
};

export type PresenceWindow = {
  /** Minimum respawn time; `null` when it is not known reliably. */
  start: Date | null;
  /** The kill. */
  end: Date;
};

type MsInterval = { start: number; end: number };

export type ParticipantPresence = {
  participantId: PresenceParticipantId;
  /**
   * Whether any counted presence record exists for this participant. Callers
   * pass every record that touches the window, so a kill participant without
   * one is missing data rather than absent.
   */
  hasData: boolean;
  /** Merged positive-length intervals inside the window, in ms. */
  intervals: readonly MsInterval[];
  countedMs: number;
  /** Counted time over window duration, unrounded (0–1). */
  windowShare: number;
  firstJoinAt: Date | null;
  joinDelayMs: number | null;
  presentAtKill: boolean;
  /** Last leave inside the window when not present at the kill. */
  lastLeaveAt: Date | null;
  /** Counted time of this participant split by concurrent group size. */
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
  /** `null` when the window start is unknown or not before the kill. */
  windowMs: number | null;
  participants: ReadonlyMap<PresenceParticipantId, ParticipantPresence>;
  /** Participants of the kill without any presence record. */
  missingParticipantIds: readonly PresenceParticipantId[];
  segments: readonly PresenceSegment[];
  /** Memoized per (counting, threshold) so every participant reuses it. */
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
  /** Upper bound for `BETWEEN`; ignored otherwise. */
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

/**
 * The window new presence conditions use: from the minimum respawn time to the
 * kill, where a kill after the maximum respawn time ends at that maximum, as
 * live tracking does. A start that is missing or not before the end is
 * unreliable and reported as `null`.
 */
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

/**
 * Whether a member's presence lasted until the window end, and otherwise when
 * they last left inside the window. A presence ending exactly at the window
 * end counts as present at the kill.
 */
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

/** Clips a participant's records to the window and merges them. */
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

/**
 * Sweeps the merged intervals' boundaries into constant-size segments and
 * each participant's time per group size. At equal times ends go first, so
 * `[a, t)` and `[t, b)` never overlap.
 */
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

/**
 * Builds the presence analysis of one kill. Participants are the kill's
 * ranking identities; a participant without any presence record is reported
 * as missing data, never as absent.
 */
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
  /** Unrounded percentage of the participant's own counted time (0–100). */
  percentage: number;
};

/** The part of a participant's own counted time spent in a matching group. */
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

/**
 * The presence-derived part of a member's scoring context: counted tracking
 * time and share (rounded as stored on kill points), presence at the kill and
 * the shared analysis for the presence conditions.
 */
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
