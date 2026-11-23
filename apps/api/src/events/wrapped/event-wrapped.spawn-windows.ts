import { roundEventDisplayValue } from "#src/events/round-event-display-value";

type SpawnWindow = {
  killedAt: Date;
  minSpawnTimeAtKill: Date;
};

type AssignmentInterval = {
  mapId: string;
  memberId: number;
  assignedAt: Date;
  unassignedAt: Date | null;
};

export type MemberRespawnMapStats = {
  maxMapsPerRespawn: number;
  avgMapsPerRespawn: number;
};

type SpawnWindowCoverage = {
  minSpawnTime: number;
  mapIds: Set<string>;
  mapIdsByMember: Map<number, Set<string>>;
};

const SweepStep = {
  assignmentStart: 0,
  windowOpen: 1,
  windowClose: 2,
  assignmentEnd: 3,
} as const;

type AssignmentStep =
  | typeof SweepStep.assignmentStart
  | typeof SweepStep.assignmentEnd;

type WindowStep = typeof SweepStep.windowOpen | typeof SweepStep.windowClose;

type SweepEvent =
  | { at: number; step: AssignmentStep; assignment: AssignmentInterval }
  | { at: number; step: WindowStep; window: SpawnWindowCoverage };

const endsAtOrAfter = (end: Date | null, time: number) =>
  end === null || end.getTime() >= time;

export const summarizeSpawnWindowAssignments = (
  kills: ReadonlyArray<SpawnWindow>,
  assignments: ReadonlyArray<AssignmentInterval>,
) => {
  const events: SweepEvent[] = [];

  for (const assignment of assignments) {
    events.push({
      at: assignment.assignedAt.getTime(),
      step: SweepStep.assignmentStart,
      assignment,
    });

    if (assignment.unassignedAt !== null) {
      events.push({
        at: assignment.unassignedAt.getTime(),
        step: SweepStep.assignmentEnd,
        assignment,
      });
    }
  }

  for (const kill of kills) {
    const killedAt = kill.killedAt.getTime();

    const window: SpawnWindowCoverage = {
      minSpawnTime: kill.minSpawnTimeAtKill.getTime(),
      mapIds: new Set(),
      mapIdsByMember: new Map(),
    };

    events.push({
      at: Math.min(window.minSpawnTime, killedAt),
      step: SweepStep.windowOpen,
      window,
    });

    if (window.minSpawnTime <= killedAt) {
      events.push({ at: killedAt, step: SweepStep.windowClose, window });
    }
  }

  events.sort((left, right) => left.at - right.at || left.step - right.step);

  const activeAssignments = new Set<AssignmentInterval>();

  const openWindows = new Set<SpawnWindowCoverage>();

  const memberTotals = new Map<
    number,
    { windowCount: number; totalMaps: number; maxMaps: number }
  >();

  let totalAssignedMaps = 0;

  const cover = (
    window: SpawnWindowCoverage,
    assignment: AssignmentInterval,
  ) => {
    window.mapIds.add(assignment.mapId);

    const memberMapIds =
      window.mapIdsByMember.get(assignment.memberId) ?? new Set<string>();

    memberMapIds.add(assignment.mapId);
    window.mapIdsByMember.set(assignment.memberId, memberMapIds);
  };

  const close = (window: SpawnWindowCoverage) => {
    totalAssignedMaps += window.mapIds.size;

    for (const [memberId, mapIds] of window.mapIdsByMember) {
      const totals = memberTotals.get(memberId) ?? {
        windowCount: 0,
        totalMaps: 0,
        maxMaps: 0,
      };

      totals.windowCount += 1;
      totals.totalMaps += mapIds.size;
      totals.maxMaps = Math.max(totals.maxMaps, mapIds.size);
      memberTotals.set(memberId, totals);
    }
  };

  for (const event of events) {
    if (event.step === SweepStep.assignmentStart) {
      const { assignment } = event;

      for (const window of openWindows) {
        if (endsAtOrAfter(assignment.unassignedAt, window.minSpawnTime)) {
          cover(window, assignment);
        }
      }

      if (endsAtOrAfter(assignment.unassignedAt, event.at)) {
        activeAssignments.add(assignment);
      }
    } else if (event.step === SweepStep.assignmentEnd) {
      activeAssignments.delete(event.assignment);
    } else if (event.step === SweepStep.windowClose) {
      openWindows.delete(event.window);
      close(event.window);
    } else if (event.step === SweepStep.windowOpen) {
      const { window } = event;

      for (const assignment of activeAssignments) {
        if (endsAtOrAfter(assignment.unassignedAt, window.minSpawnTime)) {
          cover(window, assignment);
        }
      }

      if (window.minSpawnTime > event.at) {
        close(window);
      } else {
        openWindows.add(window);
      }
    }
  }

  return {
    avgMapsPerSpawnWindow:
      kills.length > 0 ? totalAssignedMaps / kills.length : 0,
    memberStats: new Map(
      Array.from(memberTotals, ([memberId, totals]) => [
        memberId,
        {
          maxMapsPerRespawn: totals.maxMaps,
          avgMapsPerRespawn: roundEventDisplayValue(
            totals.totalMaps / totals.windowCount,
          ),
        } satisfies MemberRespawnMapStats,
      ]),
    ),
  };
};
