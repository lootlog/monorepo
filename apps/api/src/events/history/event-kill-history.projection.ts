import { Effect } from "effect";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { resolveEventWindowStart } from "#src/events/respawn/resolve-event-window-start";
import {
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
  getTrackingWindowStartTime,
  getEffectiveWindowEndAt,
} from "#src/events/monitoring/tracking-window";
import type { EventPoints } from "#src/events/kills/event-points.service";
import type { EventKillHistoryStore } from "#src/events/history/event-kill-history.store";

export const makeEventKillHistoryProjection = (
  repository: EventKillHistoryStore,
  pointsService: Pick<EventPoints, "getMembersPresenceStatsPerMap">,
) => {
  const getKillDetail = Effect.fnUntraced(function* (
    heroId: string,
    killId: string,
  ) {
    const kill = yield* repository.findKillDetail(heroId, killId);

    if (!kill) {
      return yield* Effect.fail(new ResourceNotFoundError("Kill not found"));
    }

    const heroMaps = yield* repository.findMaps(heroId);

    const effectiveKilledAt = getEffectiveWindowEndAt(
      kill.killedAt,
      kill.maxSpawnTimeAtKill,
    );

    const windowStartByKillId = yield* getEffectiveWindowStartByKillId([kill]);

    const overlapWindowStartTime =
      windowStartByKillId.get(kill.id) ??
      getTrackingWindowStartTime({
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
      });

    const mapIdToName = new Map(heroMaps.map((map) => [map.id, map.mapName]));
    const mapIds = heroMaps.map((m) => m.id);

    const memberIds = [...new Set(kill.points.map((point) => point.memberId))];

    const trackingWindowStartTime = getTrackingWindowStartTime({
      killedAt: effectiveKilledAt,
      minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
    });

    const normalizedPoints = kill.points.map((point) =>
      normalizeKillPointTracking(
        point,
        effectiveKilledAt,
        kill.minSpawnTimeAtKill,
      ),
    );

    const assignments = yield* repository.findAssignments({
      mapIds,
      memberIds,
      killedAt: effectiveKilledAt,
      overlapStart: overlapWindowStartTime,
    });

    const assignmentsByMember = Map.groupBy(
      assignments,
      (assignment) => assignment.memberId,
    );

    const fallbackMemberIds = [
      ...new Set(
        normalizedPoints
          .filter((point) => {
            const storedMapPresence = point.mapPresenceData;

            return !(storedMapPresence && storedMapPresence.length > 0);
          })
          .map((point) => point.memberId),
      ),
    ];

    const fallbackPresenceStats =
      yield* pointsService.getMembersPresenceStatsPerMap(
        mapIds,
        fallbackMemberIds,
        overlapWindowStartTime,
        effectiveKilledAt,
      );

    const fallbackPresenceByMemberMap = new Map<
      string,
      { presenceTimeSeconds: number; afkTimeSeconds: number }
    >();

    for (const stat of fallbackPresenceStats) {
      fallbackPresenceByMemberMap.set(`${stat.memberId}:${stat.mapId}`, {
        presenceTimeSeconds: stat.presenceTimeSeconds,
        afkTimeSeconds: stat.afkTimeSeconds,
      });
    }

    const pointsWithMapData = normalizedPoints.map((point) => {
      const pointAssignments = assignmentsByMember.get(point.memberId) ?? [];
      const storedMapPresence = point.mapPresenceData;

      let presenceByMapId: Map<
        string,
        { presenceTimeSeconds: number; afkTimeSeconds: number }
      >;

      if (storedMapPresence && storedMapPresence.length > 0) {
        presenceByMapId = new Map(
          storedMapPresence.map((s) => [
            s.mapId,
            {
              presenceTimeSeconds: s.presenceTimeSeconds,
              afkTimeSeconds: s.afkTimeSeconds,
            },
          ]),
        );
      } else {
        presenceByMapId = new Map(
          [...new Set(pointAssignments.map((a) => a.mapId))].map((mapId) => [
            mapId,
            fallbackPresenceByMemberMap.get(`${point.memberId}:${mapId}`) ?? {
              presenceTimeSeconds: 0,
              afkTimeSeconds: 0,
            },
          ]),
        );
      }

      const mapData = pointAssignments.map((assignment) => {
        const clippedAssignmentInterval = clipIntervalToWindow({
          start: assignment.assignedAt,
          end: assignment.unassignedAt ?? effectiveKilledAt,
          windowStart: trackingWindowStartTime,
          windowEnd: effectiveKilledAt,
        });

        const assignmentDurationSeconds = clippedAssignmentInterval
          ? Math.round(
              (clippedAssignmentInterval.end.getTime() -
                clippedAssignmentInterval.start.getTime()) /
                1000,
            )
          : 0;

        const presence = presenceByMapId.get(assignment.mapId);

        return {
          mapId: assignment.mapId,
          mapName: mapIdToName.get(assignment.mapId) ?? "",
          assignedAt: assignment.assignedAt.toISOString(),
          unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
          assignmentDurationSeconds,
          presenceTimeSeconds: presence?.presenceTimeSeconds ?? 0,
          afkTimeSeconds: presence?.afkTimeSeconds ?? 0,
        };
      });

      return {
        ...point,
        mapData,
      };
    });

    const respawnDurationSeconds = Math.max(
      0,
      getTrackingWindowDurationSeconds({
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
      }),
    );

    const resolvedAfterMaxSpawnTimeMs = Math.max(
      0,
      kill.killedAt.getTime() - kill.maxSpawnTimeAtKill.getTime(),
    );

    const windowDurationSeconds = Math.max(
      0,
      getSpawnWindowDurationSeconds(
        kill.minSpawnTimeAtKill,
        kill.maxSpawnTimeAtKill,
      ),
    );

    const scoringMode = normalizeEventScoringMode(
      kill.heroNpc.event.scoringMode,
    );

    const scoringRules =
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(kill.heroNpc.event.scoringRules)
        : null;

    return {
      kill: {
        ...kill,
        points: pointsWithMapData,
        respawnDurationSeconds,
        windowDurationSeconds,
        resolvedAfterMaxSpawnTimeMs,
      },
      eventConfig: {
        scoringMode,
        scoringRules,
      },
    };
  });

  function getEffectiveWindowStartByKillId(
    kills: Array<{
      id: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
  ) {
    return Effect.gen(function* () {
      const windowStartByKillId = new Map<string, Date>();

      if (kills.length === 0) {
        return windowStartByKillId;
      }

      const windowSummaries = yield* repository.findWindowSummaries(
        kills.map((kill) => kill.id),
      );

      const windowOpenedAtByKillId = new Map(
        windowSummaries.flatMap((summary) =>
          summary.killId
            ? [[summary.killId, summary.windowOpenedAt] as const]
            : [],
        ),
      );

      for (const kill of kills) {
        windowStartByKillId.set(
          kill.id,
          resolveEventWindowStart({
            killedAt: kill.killedAt,
            minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
            windowOpenedAt: windowOpenedAtByKillId.get(kill.id),
          }),
        );
      }

      return windowStartByKillId;
    });
  }

  const getKillTimelineData = Effect.fnUntraced(function* (
    heroId: string,
    killId: string,
  ) {
    const kill = yield* repository.findKill(heroId, killId);

    if (!kill) {
      return yield* Effect.fail(new ResourceNotFoundError("Kill not found"));
    }

    const summary = yield* repository.findWindowSummary(killId);

    const summaryGaps = summary?.gapsTimeline ?? [];

    const scoringWindowStartTime =
      summary?.windowOpenedAt ?? kill.minSpawnTimeAtKill;

    const maps = yield* repository.findMaps(heroId);

    const timelineAssignments = yield* repository.findTimelineAssignments({
      mapIds: maps.map((map) => map.id),
      killedAt: kill.killedAt,
      overlapStart: scoringWindowStartTime,
    });

    const assignmentsByMapId = Map.groupBy(
      timelineAssignments,
      (assignment) => assignment.mapId,
    );

    const results = maps.map((map) => {
      const gapsForMap = summaryGaps.filter((g) => g.mapId === map.id);
      const mapAssignments = assignmentsByMapId.get(map.id) ?? [];

      return {
        mapId: map.id,
        mapName: map.mapName,
        numericMapId: map.mapId,
        assignments: mapAssignments.map((assignment) => ({
          memberId: assignment.memberId,
          memberName: assignment.member.name,
          memberAvatar: assignment.member.avatar,
          memberUserId: assignment.member.userId,
          assignedAt: assignment.assignedAt.toISOString(),
          unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
        })),
        gaps: gapsForMap.map((g) => ({
          id: `${g.mapId}-${new Date(g.startedAt).getTime()}`,
          gapType: g.gapType,
          startedAt: new Date(g.startedAt).toISOString(),
          endedAt: g.endedAt ? new Date(g.endedAt).toISOString() : null,
          durationSeconds: g.durationSeconds,
        })),
      };
    });

    return results;
  });

  function getSpawnWindowDurationSeconds(
    minSpawnTimeAtKill: Date,
    maxSpawnTimeAtKill: Date,
  ): number {
    return Math.max(
      0,
      Math.floor(
        (maxSpawnTimeAtKill.getTime() - minSpawnTimeAtKill.getTime()) / 1000,
      ),
    );
  }

  return {
    detail: getKillDetail,
    timeline: getKillTimelineData,
  };
};

export function normalizeKillPointTracking<
  T extends {
    trackingDurationSeconds: number | null;
    trackingDurationPercentage: number | null;
  },
>(point: T, killedAt: Date, minSpawnTimeAtKill: Date): T {
  const windowDurationSeconds = getTrackingWindowDurationSeconds({
    killedAt,
    minSpawnTimeAtKill,
  });

  const rawTrackingDurationSeconds = point.trackingDurationSeconds;

  if (
    rawTrackingDurationSeconds === null ||
    rawTrackingDurationSeconds === undefined ||
    !Number.isFinite(rawTrackingDurationSeconds)
  ) {
    return {
      ...point,
      trackingDurationSeconds: null,
      trackingDurationPercentage: null,
    };
  }

  const sanitizedTrackingDurationSeconds = Math.max(
    0,
    Math.round(rawTrackingDurationSeconds),
  );

  const clampedTrackingDurationSeconds = Math.min(
    sanitizedTrackingDurationSeconds,
    windowDurationSeconds,
  );

  const trackingDurationPercentage =
    windowDurationSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (clampedTrackingDurationSeconds / windowDurationSeconds) * 100,
          ),
        )
      : null;

  return {
    ...point,
    trackingDurationSeconds: clampedTrackingDurationSeconds,
    trackingDurationPercentage,
  };
}
