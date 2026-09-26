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

type MapPresenceData = Effect.Success<
  ReturnType<EventKillHistoryStore["findPoints"]>
>[number]["mapPresenceData"];

type KillPointMapDataEntry = {
  mapId: string;
  mapName: string;
  assignedAt: string;
  unassignedAt: string | null;
  assignmentDurationSeconds: number;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
};

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

    const assignmentsByMember = new Map<
      number,
      Array<{
        mapId: string;
        assignedAt: Date;
        unassignedAt: Date | null;
      }>
    >();

    for (const assignment of assignments) {
      if (!assignmentsByMember.has(assignment.memberId)) {
        assignmentsByMember.set(assignment.memberId, []);
      }

      assignmentsByMember.get(assignment.memberId)?.push({
        mapId: assignment.mapId,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
      });
    }

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

  function buildKillPointMapDataByKillMember(
    kills: Array<{
      id: string;
      heroNpcId: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
      points: Array<{
        memberId: number;
        mapPresenceData: MapPresenceData;
      }>;
    }>,
    windowStartByKillId: Map<string, Date>,
  ) {
    return Effect.gen(function* () {
      const mapDataByKillMember = new Map<string, KillPointMapDataEntry[]>();

      if (kills.length === 0) {
        return mapDataByKillMember;
      }

      const heroIds = [...new Set(kills.map((kill) => kill.heroNpcId))];

      const memberIds = [
        ...new Set(
          kills.flatMap((kill) => kill.points.map((point) => point.memberId)),
        ),
      ];

      if (heroIds.length === 0 || memberIds.length === 0) {
        return mapDataByKillMember;
      }

      const maxKillTime = new Date(
        Math.max(...kills.map((kill) => kill.killedAt.getTime())),
      );

      const minTrackingWindowStart = new Date(
        Math.min(
          ...kills.map((kill) =>
            (
              windowStartByKillId.get(kill.id) ??
              getTrackingWindowStartTime({
                killedAt: kill.killedAt,
                minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
              })
            ).getTime(),
          ),
        ),
      );

      const heroMaps = (yield* repository.findMapsForHeroes(heroIds)) ?? [];

      if (heroMaps.length === 0) {
        return mapDataByKillMember;
      }

      const mapIdToName = new Map(heroMaps.map((map) => [map.id, map.mapName]));

      const assignments =
        (yield* repository.findAssignments({
          heroNpcIds: heroIds,
          memberIds,
          killedAt: maxKillTime,
          overlapStart: minTrackingWindowStart,
        })) ?? [];

      const assignmentsByHeroMember = new Map<
        string,
        Array<{
          mapId: string;
          memberId: number;
          assignedAt: Date;
          unassignedAt: Date | null;
        }>
      >();

      for (const assignment of assignments) {
        const key = `${assignment.heroNpcId}:${assignment.memberId}`;
        const current = assignmentsByHeroMember.get(key) ?? [];
        current.push({
          mapId: assignment.mapId,
          memberId: assignment.memberId,
          assignedAt: assignment.assignedAt,
          unassignedAt: assignment.unassignedAt,
        });
        assignmentsByHeroMember.set(key, current);
      }

      for (const kill of kills) {
        const overlapWindowStartTime =
          windowStartByKillId.get(kill.id) ??
          getTrackingWindowStartTime({
            killedAt: kill.killedAt,
            minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
          });

        for (const point of kill.points) {
          const pointAssignments =
            assignmentsByHeroMember.get(
              `${kill.heroNpcId}:${point.memberId}`,
            ) ?? [];

          const presenceByMapId = getPresenceByMapId(point.mapPresenceData);

          const mapData = pointAssignments
            .map((assignment) => {
              const clippedAssignmentInterval = clipIntervalToWindow({
                start: assignment.assignedAt,
                end: assignment.unassignedAt ?? kill.killedAt,
                windowStart: overlapWindowStartTime,
                windowEnd: kill.killedAt,
              });

              if (!clippedAssignmentInterval) {
                return null;
              }

              const assignmentDurationSeconds = Math.round(
                (clippedAssignmentInterval.end.getTime() -
                  clippedAssignmentInterval.start.getTime()) /
                  1000,
              );

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
            })
            .filter((entry): entry is KillPointMapDataEntry => entry !== null);

          mapDataByKillMember.set(`${kill.id}:${point.memberId}`, mapData);
        }
      }

      return mapDataByKillMember;
    });
  }

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

  function getPresenceByMapId(
    mapPresenceData: MapPresenceData,
  ): Map<string, { presenceTimeSeconds: number; afkTimeSeconds: number }> {
    const presenceByMapId = new Map<
      string,
      { presenceTimeSeconds: number; afkTimeSeconds: number }
    >();

    for (const entry of mapPresenceData ?? []) {
      if (entry.mapId.length === 0) continue;

      const presenceTimeSeconds = Number.isFinite(entry.presenceTimeSeconds)
        ? Math.max(0, Math.round(entry.presenceTimeSeconds))
        : 0;

      const afkTimeSeconds = Number.isFinite(entry.afkTimeSeconds)
        ? Math.max(0, Math.round(entry.afkTimeSeconds))
        : 0;

      presenceByMapId.set(entry.mapId, {
        presenceTimeSeconds,
        afkTimeSeconds,
      });
    }

    return presenceByMapId;
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

    const assignmentsByMapId = new Map<
      string,
      Array<{
        memberId: number;
        assignedAt: Date;
        unassignedAt: Date | null;
        member: {
          name: string;
          avatar: string | null;
          userId: string | null;
        };
      }>
    >();

    const timelineAssignments = yield* repository.findTimelineAssignments({
      mapIds: maps.map((map) => map.id),
      killedAt: kill.killedAt,
      overlapStart: scoringWindowStartTime,
    });

    for (const assignment of timelineAssignments) {
      const currentAssignments = assignmentsByMapId.get(assignment.mapId) ?? [];

      currentAssignments.push({
        memberId: assignment.memberId,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        member: assignment.member,
      });
      assignmentsByMapId.set(assignment.mapId, currentAssignments);
    }

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
    getEffectiveWindowStartByKillId,
    buildKillPointMapDataByKillMember,
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
