import {
  getTrackingDurationSecondsForRanking,
  isKillPointCountedInRanking,
  KILL_POINT_ADJUSTMENTS_TRACKED_SINCE,
  roundPoints,
} from "#src/events/kills/event-ranking-policy";
import { invalidateEventCache } from "#src/events/catalog/event-cache-invalidation";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, eq } from "drizzle-orm";
import { Array as Arr, Effect, Schema } from "effect";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import {
  analyzeEventKillPresence,
  resolveEventScoringWindow,
  resolveKillPresenceState,
  type EventKillPresence,
} from "@lootlog/domain/scoring-presence";
import { resolveEventWindowStart } from "#src/events/respawn/resolve-event-window-start";
import { calculateMemberPoints } from "#src/events/kills/event-member-points";
import type { EventPointsStore } from "#src/events/kills/event-points.repository";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
} from "#src/events/monitoring/tracking-window";
import { ApiDatabase } from "#src/database/drizzle/database";
import { eventTable } from "#src/database/drizzle/event.schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/cache";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";

export interface EventPointRecalculator {
  readonly recalculate: (
    eventId: string,
    basePointsPerKill: number,
  ) => Effect.Effect<void, unknown>;
}

class EventPointRecalculationError extends TaggedErrorClass<EventPointRecalculationError>()(
  "EventPointRecalculationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventPointRecalculation =
  (
    database: typeof ApiDatabase.Service,
    redis: RedisService,
    points: EventPointRecalculator,
    logger: Logger,
  ) =>
  (guild: { id: string }, eventId: string) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select({
          id: eventTable.id,
          basePointsPerKill: eventTable.basePointsPerKill,
        })
        .from(eventTable)
        .where(
          and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
        )
        .limit(1)
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventPointRecalculationError({
                operation: "events.points.findEvent",
                cause,
              }),
          ),
        );

      const event = rows[0];

      if (!event) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      yield* points.recalculate(event.id, event.basePointsPerKill);
      yield* invalidateEventCache(
        redis,
        logger,
        guild.id,
        eventId,
        "Failed to invalidate event cache",
        getEventWrappedCachePattern(guild.id, eventId),
      );

      return { success: true };
    }).pipe(Effect.withSpan("EventsController_recalculateEventPoints"));

export type EventPointRecalculation = ReturnType<
  typeof makeEventPointRecalculation
>;

/**
 * One presence analysis per kill, shared by every participant: the kill's
 * ranking members and their assignment records on the hero's maps.
 */
function analyzePresenceByKillId(params: {
  killPointsByKillId: Record<
    string,
    ReadonlyArray<{
      memberId: number;
      kill: {
        killedAt: Date;
        minSpawnTimeAtKill: Date;
        maxSpawnTimeAtKill: Date;
      };
    }>
  >;
  heroMapIdsByKillId: ReadonlyMap<string, ReadonlySet<string>>;
  assignmentsByMember: Record<
    string,
    ReadonlyArray<{
      mapId: string;
      assignedAt: Date;
      unassignedAt: Date | null;
    }>
  >;
}) {
  const presenceByKillId = new Map<string, EventKillPresence>();

  for (const [killId, points] of Object.entries(params.killPointsByKillId)) {
    const kill = points[0]?.kill;

    if (!kill) continue;

    const heroMapIds = params.heroMapIdsByKillId.get(killId) ?? new Set();
    const memberIds = [...new Set(points.map((point) => point.memberId))];

    presenceByKillId.set(
      killId,
      analyzeEventKillPresence({
        window: resolveEventScoringWindow(kill),
        participantIds: memberIds,
        intervals: memberIds.flatMap((memberId) =>
          (params.assignmentsByMember[String(memberId)] ?? []).flatMap(
            (assignment) =>
              heroMapIds.has(assignment.mapId)
                ? [
                    {
                      participantId: memberId,
                      start: assignment.assignedAt,
                      end: assignment.unassignedAt,
                    },
                  ]
                : [],
          ),
        ),
      }),
    );
  }

  return presenceByKillId;
}

/**
 * The ranking's manual adjustment comes from its edit history rather than
 * the stored column: recalculation before 5ef9e687a3 wrote unrecorded
 * adjustments there, and an adjustment backed by no edit is not one.
 */
function resolveManualAdjustmentPoints(
  adjustments: ReadonlyMap<string, number>,
  existingRanking?: { id: string },
): number {
  return roundPoints(
    (existingRanking && adjustments.get(existingRanking.id)) ?? 0,
  );
}

function createRankingKey(params: {
  memberId: number;
  heroNpcName: string;
}): string {
  return `${params.memberId}:${params.heroNpcName}`;
}

function calculateTrackingDurationPercentage(params: {
  trackingDurationSeconds: number | null | undefined;
  killedAt: Date;
  minSpawnTimeAtKill: Date;
}): number | undefined {
  if (!Number.isFinite(params.trackingDurationSeconds)) {
    return undefined;
  }

  const trackingWindowDurationSeconds =
    getTrackingWindowDurationSeconds(params);

  if (trackingWindowDurationSeconds <= 0) {
    return undefined;
  }

  return Math.min(
    100,
    Math.round(
      (params.trackingDurationSeconds / trackingWindowDurationSeconds) * 100,
    ),
  );
}

function calculateTrackingMetricsForKill(params: {
  assignments: Array<{
    mapId: string;
    memberId: number;
    assignedAt: Date;
    unassignedAt: Date | null;
  }>;
  heroMapIds: Set<string>;
  killTime: Date;
  respawnStartTime: Date;
}) {
  const trackingIntervals: Array<{ start: Date; end: Date }> = [];

  for (const assignment of params.assignments) {
    if (!params.heroMapIds.has(assignment.mapId)) {
      continue;
    }

    if (assignment.assignedAt > params.killTime) {
      continue;
    }

    const clippedInterval = clipIntervalToWindow({
      start: assignment.assignedAt,
      end: assignment.unassignedAt ?? params.killTime,
      windowStart: params.respawnStartTime,
      windowEnd: params.killTime,
    });

    if (!clippedInterval) {
      continue;
    }

    if (clippedInterval.end > clippedInterval.start) {
      trackingIntervals.push(clippedInterval);
    }
  }

  const trackingDurationSeconds =
    calculateTrackingDurationSeconds(trackingIntervals);

  const trackingDurationPercentage = calculateTrackingDurationPercentage({
    trackingDurationSeconds,
    killedAt: params.killTime,
    minSpawnTimeAtKill: params.respawnStartTime,
  });

  return {
    trackingDurationSeconds,
    trackingDurationPercentage,
  };
}

/** Recomputes every kill point and ranking of an event under its current scoring rules. */
export const makeEventPointsRecalculator = (
  repository: Pick<
    EventPointsStore,
    | "findEvent"
    | "findRankings"
    | "findRankingAdjustments"
    | "findKillPointsForEvent"
    | "findWindowSummaries"
    | "findAssignments"
    | "applyRecalculation"
  >,
  emitRankingUpdateByEventId: (eventId: string) => Effect.Effect<void, unknown>,
) => {
  function recalculateEventPointsWithCurrentRules(eventId: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(eventId);

      if (!event) {
        return;
      }

      const scoringMode = normalizeEventScoringMode(event.scoringMode);

      const scoringRules =
        scoringMode === "ADVANCED"
          ? normalizeEventScoringRules(event.scoringRules)
          : null;

      const existingRankings = yield* repository.findRankings(eventId);

      const rankingAdjustments = yield* repository.findRankingAdjustments(
        eventId,
        KILL_POINT_ADJUSTMENTS_TRACKED_SINCE,
      );

      const existingRankingsByKey = new Map(
        existingRankings.map((ranking) => [
          createRankingKey({
            memberId: ranking.memberId,
            heroNpcName: ranking.heroNpcName,
          }),
          ranking,
        ]),
      );

      const killPoints = yield* repository.findKillPointsForEvent(eventId);

      if (killPoints.length === 0) {
        return;
      }

      const killPointsByKillId = Arr.groupBy(
        killPoints,
        (killPoint) => killPoint.killId,
      );

      const heroMapIdsByKillId = new Map<string, Set<string>>();

      for (const [killId, points] of Object.entries(killPointsByKillId)) {
        const first = points[0];
        heroMapIdsByKillId.set(
          killId,
          new Set(first?.kill.heroNpc.maps.map((map) => map.id) ?? []),
        );
      }

      const assignedMembersCountByKillId = new Map<string, number>();

      for (const [killId, points] of Object.entries(killPointsByKillId)) {
        const uniqueMembers = new Set(points.map((p) => p.memberId));
        assignedMembersCountByKillId.set(killId, uniqueMembers.size);
      }

      const allMapIds = Array.from(
        new Set(
          [...heroMapIdsByKillId.values()].flatMap((mapIds) =>
            Array.from(mapIds),
          ),
        ),
      );

      const allMemberIds = Array.from(
        new Set(killPoints.map((point) => point.memberId)),
      );

      const latestKillTime = new Date(
        Math.max(...killPoints.map((point) => point.kill.killedAt.getTime())),
      );

      const windowSummaries = yield* repository.findWindowSummaries(
        Array.from(new Set(killPoints.map((point) => point.kill.id))),
      );

      const windowOpenedAtByKillId = new Map(
        windowSummaries.flatMap((summary) =>
          summary.killId
            ? [[summary.killId, summary.windowOpenedAt] as const]
            : [],
        ),
      );

      const earliestOverlapWindowStart = new Date(
        Math.min(
          ...killPoints.map((point) =>
            Math.min(
              resolveEventWindowStart({
                killedAt: point.kill.killedAt,
                minSpawnTimeAtKill: point.kill.minSpawnTimeAtKill,
                windowOpenedAt: windowOpenedAtByKillId.get(point.kill.id),
              }).getTime(),
              point.kill.minSpawnTimeAtKill.getTime(),
            ),
          ),
        ),
      );

      const assignmentHistory =
        allMapIds.length > 0 && allMemberIds.length > 0
          ? yield* repository.findAssignments(
              allMapIds,
              allMemberIds,
              latestKillTime,
              earliestOverlapWindowStart,
            )
          : [];

      const assignmentsByMember = Arr.groupBy(assignmentHistory, (assignment) =>
        String(assignment.memberId),
      );

      const presenceByKillId = analyzePresenceByKillId({
        killPointsByKillId,
        heroMapIdsByKillId,
        assignmentsByMember,
      });

      const presenceForKill = (killId: string, memberId: number) => {
        const analysis = presenceByKillId.get(killId);

        return analysis ? { analysis, participantId: memberId } : null;
      };

      const recalculatedKillPoints = killPoints.map((killPoint) => {
        const assignedMembersCount =
          assignedMembersCountByKillId.get(killPoint.killId) ?? 1;

        const trackingWindowStartTime = resolveEventWindowStart({
          killedAt: killPoint.kill.killedAt,
          minSpawnTimeAtKill: killPoint.kill.minSpawnTimeAtKill,
        });

        const trackingMetrics = calculateTrackingMetricsForKill({
          assignments: assignmentsByMember[String(killPoint.memberId)] ?? [],
          heroMapIds: heroMapIdsByKillId.get(killPoint.killId) ?? new Set(),
          killTime: killPoint.kill.killedAt,
          respawnStartTime: trackingWindowStartTime,
        });

        const trackingDurationSeconds = trackingMetrics.trackingDurationSeconds;

        const trackingDurationPercentage =
          trackingMetrics.trackingDurationPercentage;

        const heroMapIds =
          heroMapIdsByKillId.get(killPoint.killId) ?? new Set();

        const memberState = resolveKillPresenceState({
          intervals: (assignmentsByMember[String(killPoint.memberId)] ?? [])
            .filter((assignment) => heroMapIds.has(assignment.mapId))
            .map((assignment) => ({
              start: assignment.assignedAt,
              end: assignment.unassignedAt,
            })),
          windowStart: trackingWindowStartTime,
          windowEnd: killPoint.kill.killedAt,
        });

        const { totalPoints, basePoints, appliedBonuses } =
          calculateMemberPoints({
            scoringMode,
            scoringRules,
            eligible: true,
            trackingDurationPercentage,
            trackingDurationSeconds,
            assignedMembersCount,
            killTime: killPoint.kill.killedAt,
            respawnStartTime: trackingWindowStartTime,
            maxRespawnTime: killPoint.kill.maxSpawnTimeAtKill,
            memberLeaveTime: memberState.memberPresentAtKill
              ? null
              : memberState.memberLeaveTime,
            memberPresentAtKill: memberState.memberPresentAtKill,
            timeOnMapSeconds: killPoint.timeOnMapSeconds,
            afkPercentage: killPoint.afkPercentage,
            wasPresent: killPoint.wasPresent,
            presence: presenceForKill(killPoint.killId, killPoint.memberId),
          });

        const effectivePoints = roundPoints(
          totalPoints + killPoint.manualAdjustmentPoints,
        );

        return {
          killPointId: killPoint.id,
          memberId: killPoint.memberId,
          heroNpcName: killPoint.kill.heroNpc.npcName,
          confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
          confirmedAt: killPoint.confirmedAt,
          afkPercentage: killPoint.afkPercentage,
          points: effectivePoints,
          trackingDurationSeconds,
          hasManualPointsAdjustment: killPoint.manualAdjustmentPoints !== 0,
          updateData: {
            basePoints,
            points: effectivePoints,
            trackingDurationSeconds,
            trackingDurationPercentage: trackingDurationPercentage ?? null,
            bonusBreakdown: appliedBonuses,
          },
        };
      });

      const rankingMap = new Map<
        string,
        {
          memberId: number;
          heroNpcName: string;
          totalPoints: number;
          totalKills: number;
          totalTimeSeconds: number;
          afkSum: number;
        }
      >();

      const manualAdjustmentRankingKeys = new Set<string>();

      for (const recalculatedKillPoint of recalculatedKillPoints) {
        if (
          !isKillPointCountedInRanking({
            confirmationDeadlineAt:
              recalculatedKillPoint.confirmationDeadlineAt,
            confirmedAt: recalculatedKillPoint.confirmedAt,
          })
        ) {
          continue;
        }

        const key = createRankingKey({
          memberId: recalculatedKillPoint.memberId,
          heroNpcName: recalculatedKillPoint.heroNpcName,
        });

        const existing = rankingMap.get(key);

        const rankingTrackingDurationSeconds =
          getTrackingDurationSecondsForRanking({
            trackingDurationSeconds:
              recalculatedKillPoint.trackingDurationSeconds,
          });

        if (recalculatedKillPoint.hasManualPointsAdjustment) {
          manualAdjustmentRankingKeys.add(key);
        }

        if (existing) {
          existing.totalPoints = roundPoints(
            existing.totalPoints + recalculatedKillPoint.points,
          );
          existing.totalKills += 1;
          existing.totalTimeSeconds += rankingTrackingDurationSeconds;
          existing.afkSum += recalculatedKillPoint.afkPercentage;
        } else {
          rankingMap.set(key, {
            memberId: recalculatedKillPoint.memberId,
            heroNpcName: recalculatedKillPoint.heroNpcName,
            totalPoints: recalculatedKillPoint.points,
            totalKills: 1,
            totalTimeSeconds: rankingTrackingDurationSeconds,
            afkSum: recalculatedKillPoint.afkPercentage,
          });
        }
      }

      const processedRankingKeys = new Set<string>();

      const killPointUpdates = recalculatedKillPoints.map(
        (recalculatedKillPoint) => ({
          id: recalculatedKillPoint.killPointId,
          data: recalculatedKillPoint.updateData,
        }),
      );

      const rankingUpdates: Parameters<
        EventPointsStore["applyRecalculation"]
      >[1] = [];

      for (const ranking of rankingMap.values()) {
        const rankingKey = createRankingKey({
          memberId: ranking.memberId,
          heroNpcName: ranking.heroNpcName,
        });

        const existingRanking = existingRankingsByKey.get(rankingKey);

        const manualAdjustmentPoints = resolveManualAdjustmentPoints(
          rankingAdjustments,
          existingRanking,
        );

        const persistedRankingData = {
          totalPoints: roundPoints(
            ranking.totalPoints + manualAdjustmentPoints,
          ),
          manualAdjustmentPoints,
          totalKills: ranking.totalKills,
          totalTimeSeconds: ranking.totalTimeSeconds,
          avgAfkPercentage:
            Math.round((ranking.afkSum / ranking.totalKills) * 100) / 100,
          pointsModified:
            manualAdjustmentPoints !== 0 ||
            manualAdjustmentRankingKeys.has(rankingKey),
        };

        processedRankingKeys.add(rankingKey);

        if (existingRanking) {
          rankingUpdates.push({
            kind: "update",
            id: existingRanking.id,
            data: persistedRankingData,
          });
          continue;
        }

        rankingUpdates.push({
          kind: "create",
          data: {
            eventId,
            memberId: ranking.memberId,
            heroNpcName: ranking.heroNpcName,
            ...persistedRankingData,
          },
        });
      }

      for (const existingRanking of existingRankings) {
        const rankingKey = createRankingKey({
          memberId: existingRanking.memberId,
          heroNpcName: existingRanking.heroNpcName,
        });

        if (processedRankingKeys.has(rankingKey)) {
          continue;
        }

        const manualAdjustmentPoints = resolveManualAdjustmentPoints(
          rankingAdjustments,
          existingRanking,
        );

        if (manualAdjustmentPoints !== 0) {
          rankingUpdates.push({
            kind: "update",
            id: existingRanking.id,
            data: {
              totalPoints: manualAdjustmentPoints,
              manualAdjustmentPoints,
              totalKills: 0,
              totalTimeSeconds: 0,
              avgAfkPercentage: 0,
              pointsModified: true,
            },
          });
          continue;
        }

        rankingUpdates.push({ kind: "delete", id: existingRanking.id });
      }

      yield* repository.applyRecalculation(killPointUpdates, rankingUpdates);

      yield* emitRankingUpdateByEventId(eventId);
    }).pipe(Effect.withSpan("events.points.recalculate"));
  }

  return recalculateEventPointsWithCurrentRules;
};
