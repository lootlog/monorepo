import type { eventKillPointTable } from "#src/database/drizzle/schema";
import { Clock, Effect } from "effect";
import type { EventEmitter } from "./event-emitter.service.js";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { EventReadCache } from "./event-read-cache.service.js";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  evaluateEventScoring,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringAppliedBonus,
  type EventScoringMode,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util.js";
import type { EventPointsStore } from "./event-points.repository.js";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
} from "../utils/tracking-window.util.js";

type CalculateMemberPointsParams = {
  scoringMode?: EventScoringMode;
  scoringRules?: EventScoringRules | null;
  eligible: boolean;
  trackingDurationPercentage?: number;
  trackingDurationSeconds?: number;
  assignedMembersCount: number;
  killTime: Date;
  respawnStartTime: Date;
  maxRespawnTime?: Date | null;
  memberLeaveTime?: Date | null;
  memberPresentAtKill: boolean;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
};

type CalculatedMemberPoints = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedBonuses: EventScoringAppliedBonus[];
};

type MemberPresenceStats = {
  memberId: number;
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
  mapName: string;
};

type PresenceLogAggregation = {
  totalTimeMs: number;
  afkTimeMs: number;
  mapName: string;
};

type ExistingRankingSnapshot = {
  id: string;
  memberId: number;
  heroNpcName: string;
  totalPoints: number;
  manualAdjustmentPoints: number;
  pointsModified: boolean;
};
type EventKillPoint = typeof eventKillPointTable.$inferSelect;

export const makeEventPoints = (
  repository: EventPointsStore,
  eventEmitter: EventEmitter,
  eventReadCache: EventReadCache,
) => {
  function calculateMemberPoints(
    params: CalculateMemberPointsParams,
  ): CalculatedMemberPoints {
    const scoringMode = normalizeEventScoringMode(params.scoringMode);
    const scoringRules =
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(
            params.scoringRules ?? DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          )
        : DEFAULT_ADVANCED_EVENT_SCORING_RULES;
    const normalizedRespawnStartTime =
      params.respawnStartTime > params.killTime
        ? params.killTime
        : params.respawnStartTime;
    const respawnProgressPercentage = calculateRespawnProgressPercentage({
      killTime: params.killTime,
      respawnStartTime: normalizedRespawnStartTime,
      maxRespawnTime: params.maxRespawnTime,
    });

    return evaluateEventScoring({
      mode: scoringMode,
      rules: scoringRules,
      context: {
        eligible: params.eligible,
        trackingDurationPercentage: params.trackingDurationPercentage,
        trackingDurationSeconds: params.trackingDurationSeconds,
        respawnProgressPercentage,
        assignedMembersCount: params.assignedMembersCount,
        killTime: params.killTime,
        respawnStartTime: normalizedRespawnStartTime,
        memberLeaveTime: params.memberLeaveTime,
        memberPresentAtKill: params.memberPresentAtKill,
        timeOnMapSeconds: params.timeOnMapSeconds,
        afkPercentage: params.afkPercentage,
        wasPresent: params.wasPresent,
      },
    });
  }

  function getTrackingDurationSecondsForRanking(params: {
    trackingDurationSeconds: number | null | undefined;
  }): number {
    if (!Number.isFinite(params.trackingDurationSeconds)) {
      return 0;
    }

    return Math.max(0, Math.round(params.trackingDurationSeconds));
  }

  function isKillPointCountedInRanking(params: {
    confirmationDeadlineAt: Date | null;
    confirmedAt: Date | null;
  }): boolean {
    if (!params.confirmationDeadlineAt) {
      return true;
    }

    if (!params.confirmedAt) {
      return false;
    }

    return (
      params.confirmedAt.getTime() <= params.confirmationDeadlineAt.getTime()
    );
  }

  function createRankingKey(params: {
    memberId: number;
    heroNpcName: string;
  }): string {
    return `${params.memberId}:${params.heroNpcName}`;
  }

  function roundPointsValue(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  function resolveManualAdjustmentPoints(params: {
    existingRanking?: ExistingRankingSnapshot;
    computedTotalPoints: number;
  }): number {
    const { existingRanking, computedTotalPoints } = params;
    if (!existingRanking) {
      return 0;
    }

    if (existingRanking.manualAdjustmentPoints !== 0) {
      return roundPointsValue(existingRanking.manualAdjustmentPoints);
    }

    if (!existingRanking.pointsModified) {
      return 0;
    }

    return roundPointsValue(existingRanking.totalPoints - computedTotalPoints);
  }

  function calculateTrackingDurationPercentage(params: {
    trackingDurationSeconds: number | null | undefined;
    killedAt: Date;
    minSpawnTimeAtKill: Date;
  }): number | undefined {
    if (!Number.isFinite(params.trackingDurationSeconds)) {
      return undefined;
    }

    const trackingWindowStartTime =
      params.minSpawnTimeAtKill > params.killedAt
        ? params.killedAt
        : params.minSpawnTimeAtKill;
    const trackingWindowDurationSeconds = Math.max(
      0,
      Math.floor(
        (params.killedAt.getTime() - trackingWindowStartTime.getTime()) / 1000,
      ),
    );

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

  function calculateRespawnProgressPercentage(params: {
    killTime: Date;
    respawnStartTime: Date;
    maxRespawnTime: Date | null | undefined;
  }): number | undefined {
    if (!params.maxRespawnTime) {
      return undefined;
    }

    const maxRespawnTime = params.maxRespawnTime;
    const fullWindowMs =
      maxRespawnTime.getTime() - params.respawnStartTime.getTime();

    if (fullWindowMs <= 0) {
      return undefined;
    }

    const elapsedWindowMs = Math.min(
      fullWindowMs,
      Math.max(
        0,
        params.killTime.getTime() - params.respawnStartTime.getTime(),
      ),
    );

    return Math.round((elapsedWindowMs / fullWindowMs) * 100);
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
  }): {
    trackingDurationSeconds: number;
    trackingDurationPercentage: number | undefined;
  } {
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

  function recalculateEventPoints(eventId: string, _newBasePoints: number) {
    return recalculateEventPointsWithCurrentRules(eventId);
  }

  function recalculateEventPointsWithCurrentRules(eventId: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(eventId);

      if (!event) {
        return;
      }

      const scoringMode = normalizeEventScoringMode(
        (event as { scoringMode?: unknown }).scoringMode,
      );
      const scoringRules =
        scoringMode === "ADVANCED"
          ? normalizeEventScoringRules(event.scoringRules)
          : null;
      const existingRankings = yield* repository.findRankings(eventId);
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

      const killPointsByKillId = groupBy(
        killPoints,
        (killPoint) => killPoint.killId,
      );

      const heroMapIdsByKillId = new Map<string, Set<string>>();
      for (const [killId, points] of killPointsByKillId) {
        const first = points[0];
        heroMapIdsByKillId.set(
          killId,
          new Set(first?.kill.heroNpc.maps.map((map) => map.id) ?? []),
        );
      }

      const assignedMembersCountByKillId = new Map<string, number>();
      for (const [killId, points] of killPointsByKillId) {
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
            resolveEventWindowStart({
              killedAt: point.kill.killedAt,
              minSpawnTimeAtKill: point.kill.minSpawnTimeAtKill,
              windowOpenedAt: windowOpenedAtByKillId.get(point.kill.id),
            }).getTime(),
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

      const assignmentsByMember = groupBy(
        assignmentHistory,
        (assignment) => assignment.memberId,
      );

      const recalculatedKillPoints = killPoints.map((killPoint) => {
        const assignedMembersCount =
          assignedMembersCountByKillId.get(killPoint.killId) ?? 1;
        const trackingWindowStartTime = resolveEventWindowStart({
          killedAt: killPoint.kill.killedAt,
          minSpawnTimeAtKill: killPoint.kill.minSpawnTimeAtKill,
        });
        const trackingMetrics = calculateTrackingMetricsForKill({
          assignments: assignmentsByMember.get(killPoint.memberId) ?? [],
          heroMapIds: heroMapIdsByKillId.get(killPoint.killId) ?? new Set(),
          killTime: killPoint.kill.killedAt,
          respawnStartTime: trackingWindowStartTime,
        });
        const trackingDurationSeconds = trackingMetrics.trackingDurationSeconds;
        const trackingDurationPercentage =
          trackingMetrics.trackingDurationPercentage;
        const memberState = getMemberKillState({
          assignments: assignmentsByMember.get(killPoint.memberId) ?? [],
          heroMapIds: heroMapIdsByKillId.get(killPoint.killId) ?? new Set(),
          killTime: killPoint.kill.killedAt,
          respawnStartTime: trackingWindowStartTime,
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
          });
        const effectivePoints = roundPointsValue(
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
          existing.totalPoints = roundPointsValue(
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
        const manualAdjustmentPoints = resolveManualAdjustmentPoints({
          existingRanking,
          computedTotalPoints: ranking.totalPoints,
        });
        const persistedRankingData = {
          totalPoints: roundPointsValue(
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

        const manualAdjustmentPoints = resolveManualAdjustmentPoints({
          existingRanking,
          computedTotalPoints: 0,
        });

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

  function groupBy<Key, Value>(
    values: Value[],
    getKey: (value: Value) => Key,
  ): Map<Key, Value[]> {
    const grouped = new Map<Key, Value[]>();
    for (const value of values) {
      const key = getKey(value);
      const group = grouped.get(key);
      if (group) {
        group.push(value);
      } else {
        grouped.set(key, [value]);
      }
    }
    return grouped;
  }

  function getMemberKillState(params: {
    assignments: Array<{
      mapId: string;
      memberId: number;
      assignedAt: Date;
      unassignedAt: Date | null;
    }>;
    heroMapIds: Set<string>;
    killTime: Date;
    respawnStartTime: Date;
  }): { memberLeaveTime: Date | null; memberPresentAtKill: boolean } {
    let memberLeaveTime: Date | null = null;
    let memberPresentAtKill = false;

    for (const assignment of params.assignments) {
      if (!params.heroMapIds.has(assignment.mapId)) {
        continue;
      }

      if (assignment.assignedAt > params.killTime) {
        continue;
      }

      const assignmentEnd = assignment.unassignedAt ?? params.killTime;
      if (assignmentEnd < params.respawnStartTime) {
        continue;
      }

      if (
        !assignment.unassignedAt ||
        assignment.unassignedAt >= params.killTime
      ) {
        memberPresentAtKill = true;
        continue;
      }

      if (
        assignment.unassignedAt >= params.respawnStartTime &&
        assignment.unassignedAt < params.killTime &&
        (!memberLeaveTime || assignment.unassignedAt > memberLeaveTime)
      ) {
        memberLeaveTime = assignment.unassignedAt;
      }
    }

    return {
      memberLeaveTime,
      memberPresentAtKill,
    };
  }

  function getMemberPresenceStats(
    heroNpcId: string,
    memberId: number,
    since?: Date,
    until?: Date,
  ) {
    return Effect.map(
      getMembersPresenceStats(heroNpcId, [memberId], since, until),
      ([stats]): Omit<MemberPresenceStats, "memberId"> =>
        stats ?? {
          timeOnMapSeconds: 0,
          afkPercentage: 0,
          wasPresent: false,
          mapName: "",
        },
    );
  }

  function getMembersPresenceStats(
    heroNpcId: string,
    memberIds: number[],
    since?: Date,
    until?: Date,
  ) {
    if (memberIds.length === 0) {
      return Effect.succeed([] as MemberPresenceStats[]);
    }

    return Effect.gen(function* () {
      const maps = yield* repository.findMaps(heroNpcId);

      if (maps.length === 0) {
        return memberIds.map((memberId) => ({
          memberId,
          timeOnMapSeconds: 0,
          afkPercentage: 0,
          wasPresent: false,
          mapName: "",
        }));
      }

      const mapIds = maps.map((m) => m.id);
      const mapNamesById = new Map(maps.map((map) => [map.id, map.mapName]));

      const logs = yield* repository.findPresenceLogs(mapIds, memberIds, since);

      const windowEnd = until ?? new Date(yield* Clock.currentTimeMillis);
      const aggregatedStatsByMemberId = new Map<number, PresenceLogAggregation>(
        memberIds.map((memberId) => [
          memberId,
          {
            totalTimeMs: 0,
            afkTimeMs: 0,
            mapName: "",
          },
        ]),
      );

      for (const log of logs) {
        const currentStats = aggregatedStatsByMemberId.get(log.memberId);
        if (!currentStats) {
          continue;
        }

        const effectiveStart =
          since && log.startedAt < since ? since : log.startedAt;
        const endTime = log.endedAt
          ? new Date(Math.min(log.endedAt.getTime(), windowEnd.getTime()))
          : windowEnd;
        const duration = endTime.getTime() - effectiveStart.getTime();

        if (duration > 0) {
          currentStats.totalTimeMs += duration;

          if (log.isAfk) {
            currentStats.afkTimeMs += duration;
          }

          const mapName = mapNamesById.get(log.mapId);
          if (mapName) {
            currentStats.mapName = mapName;
          }
        }
      }

      return memberIds.map((memberId) => {
        const aggregatedStats = aggregatedStatsByMemberId.get(memberId);
        const totalTimeMs = aggregatedStats?.totalTimeMs ?? 0;
        const afkTimeMs = aggregatedStats?.afkTimeMs ?? 0;
        const afkPercentage =
          totalTimeMs > 0 ? (afkTimeMs / totalTimeMs) * 100 : 0;

        return {
          memberId,
          timeOnMapSeconds: Math.round(totalTimeMs / 1000),
          afkPercentage: Math.round(afkPercentage * 100) / 100,
          wasPresent: totalTimeMs > 0,
          mapName: aggregatedStats?.mapName || maps[0]?.mapName || "",
        };
      });
    }).pipe(Effect.withSpan("events.points.memberPresence"));
  }

  function getMemberPresenceStatsPerMap(
    mapIds: string[],
    memberId: number,
    since?: Date,
    until?: Date,
  ) {
    if (mapIds.length === 0) {
      return Effect.succeed(
        [] as Array<{
          mapId: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        }>,
      );
    }

    return Effect.map(
      repository.findPresenceLogs(mapIds, [memberId], since),
      (logs) => {
        const windowEnd = until ?? new Date();
        const mapStats = new Map<
          string,
          { presenceTimeMs: number; afkTimeMs: number }
        >();

        for (const mapId of mapIds) {
          mapStats.set(mapId, { presenceTimeMs: 0, afkTimeMs: 0 });
        }

        for (const log of logs) {
          const stats = mapStats.get(log.mapId);
          if (!stats) continue;

          const effectiveStart =
            since && log.startedAt < since ? since : log.startedAt;
          const endTime = log.endedAt
            ? new Date(Math.min(log.endedAt.getTime(), windowEnd.getTime()))
            : windowEnd;
          const duration = endTime.getTime() - effectiveStart.getTime();

          if (duration > 0) {
            stats.presenceTimeMs += duration;

            if (log.isAfk) {
              stats.afkTimeMs += duration;
            }
          }
        }

        return Array.from(mapStats.entries()).map(([mapId, stats]) => ({
          mapId,
          presenceTimeSeconds: Math.round(stats.presenceTimeMs / 1000),
          afkTimeSeconds: Math.round(stats.afkTimeMs / 1000),
        }));
      },
    );
  }

  function getMembersPresenceStatsPerMap(
    mapIds: string[],
    memberIds: number[],
    since?: Date,
    until?: Date,
  ) {
    if (mapIds.length === 0 || memberIds.length === 0) {
      return Effect.succeed(
        [] as Array<{
          memberId: number;
          mapId: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        }>,
      );
    }

    return Effect.map(
      repository.findPresenceLogs(mapIds, memberIds, since),
      (logs) => {
        const windowEnd = until ?? new Date();
        const memberMapStats = new Map<
          string,
          {
            memberId: number;
            mapId: string;
            presenceTimeMs: number;
            afkTimeMs: number;
          }
        >();

        for (const log of logs) {
          const key = `${log.memberId}:${log.mapId}`;
          if (!memberMapStats.has(key)) {
            memberMapStats.set(key, {
              memberId: log.memberId,
              mapId: log.mapId,
              presenceTimeMs: 0,
              afkTimeMs: 0,
            });
          }

          const stats = memberMapStats.get(key);
          if (!stats) continue;

          const effectiveStart =
            since && log.startedAt < since ? since : log.startedAt;
          const endTime = log.endedAt
            ? new Date(Math.min(log.endedAt.getTime(), windowEnd.getTime()))
            : windowEnd;
          const duration = endTime.getTime() - effectiveStart.getTime();

          if (duration > 0) {
            stats.presenceTimeMs += duration;
            if (log.isAfk) {
              stats.afkTimeMs += duration;
            }
          }
        }

        return Array.from(memberMapStats.values()).map((stats) => ({
          memberId: stats.memberId,
          mapId: stats.mapId,
          presenceTimeSeconds: Math.round(stats.presenceTimeMs / 1000),
          afkTimeSeconds: Math.round(stats.afkTimeMs / 1000),
        }));
      },
    );
  }

  function updateRankingAfterKill(
    eventId: string,
    heroNpcName: string,
    killPoints: EventKillPoint[],
  ) {
    const rankableKillPoints = killPoints.filter((killPoint) =>
      isKillPointCountedInRanking({
        confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
        confirmedAt: killPoint.confirmedAt,
      }),
    );

    if (rankableKillPoints.length === 0) {
      return Effect.void;
    }

    return Effect.gen(function* () {
      yield* Effect.forEach(
        rankableKillPoints,
        (killPoint) =>
          Effect.gen(function* () {
            const trackingDurationSeconds =
              getTrackingDurationSecondsForRanking({
                trackingDurationSeconds: killPoint.trackingDurationSeconds,
              });
            const existing = yield* repository.findRankingByKey(
              eventId,
              killPoint.memberId,
              heroNpcName,
            );

            if (existing) {
              const newTotalKills = existing.totalKills + 1;
              const newAvgAfk =
                (existing.avgAfkPercentage * existing.totalKills +
                  killPoint.afkPercentage) /
                newTotalKills;

              yield* repository.incrementRanking(
                existing.id,
                killPoint.points,
                trackingDurationSeconds,
                Math.round(newAvgAfk * 100) / 100,
                existing.pointsModified ||
                  killPoint.manualAdjustmentPoints !== 0,
              );
              return;
            }

            yield* repository.createRanking({
              eventId,
              memberId: killPoint.memberId,
              heroNpcName,
              totalPoints: killPoint.points,
              totalKills: 1,
              totalTimeSeconds: trackingDurationSeconds,
              avgAfkPercentage: killPoint.afkPercentage,
              pointsModified: killPoint.manualAdjustmentPoints !== 0,
            });
          }),
        { concurrency: "unbounded", discard: true },
      );

      yield* emitRankingUpdateByEventId(eventId);
    }).pipe(Effect.withSpan("events.points.updateRankingAfterKill"));
  }

  function emitRankingUpdateByEventId(eventId: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(eventId);

      if (!event) {
        return;
      }

      yield* Effect.all(
        [
          Effect.tryPromise({
            try: () => eventReadCache.invalidateEvent(event.guildId, event.id),
            catch: (cause) => cause,
          }),
          eventEmitter.emit(RoutingKey.EVENT_RANKING_UPDATE, {
            guildId: event.guildId,
            eventId: event.id,
          }),
        ],
        { concurrency: "unbounded", discard: true },
      );
    }).pipe(Effect.withSpan("events.points.publishRanking"));
  }

  return {
    calculateMemberPoints,
    getMemberPresenceStats,
    getMembersPresenceStats,
    getMemberPresenceStatsPerMap,
    getMembersPresenceStatsPerMap,
    recalculateEventPoints,
    updateRankingAfterKill,
  };
};

export type EventPoints = ReturnType<typeof makeEventPoints>;
