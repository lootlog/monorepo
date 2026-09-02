import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { eventKillPointTable } from "#src/database/drizzle/schema";
import { EventEmitterService } from "./event-emitter.service.js";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { EventReadCacheService } from "./event-read-cache.service.js";
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
import { EventPointsRepository } from "./event-points.repository.js";
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

export class EventPointsService {
  constructor(
    private readonly repository: EventPointsRepository,
    private readonly eventEmitter: EventEmitterService,
    private readonly eventReadCache: EventReadCacheService,
  ) {}

  getRanking(guildId: string, eventId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "ranking"),
      async () => {
        const event = await this.repository.findEvent(eventId, guildId);

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        return this.repository.findRanking(eventId);
      },
    );
  }

  calculateMemberPoints(
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
    const respawnProgressPercentage = this.calculateRespawnProgressPercentage({
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

  private getTrackingDurationSecondsForRanking(params: {
    trackingDurationSeconds: number | null | undefined;
  }): number {
    if (!Number.isFinite(params.trackingDurationSeconds)) {
      return 0;
    }

    return Math.max(0, Math.round(params.trackingDurationSeconds));
  }

  private isKillPointCountedInRanking(params: {
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

  private createRankingKey(params: {
    memberId: number;
    heroNpcName: string;
  }): string {
    return `${params.memberId}:${params.heroNpcName}`;
  }

  private roundPointsValue(value: number): number {
    return Math.round(value * 10000) / 10000;
  }

  private normalizePointsEditComment(comment?: string | null): string | null {
    if (typeof comment !== "string") {
      return null;
    }

    const trimmedComment = comment.trim();
    return trimmedComment.length > 0 ? trimmedComment : null;
  }

  private resolveManualAdjustmentPoints(params: {
    existingRanking?: ExistingRankingSnapshot;
    computedTotalPoints: number;
  }): number {
    const { existingRanking, computedTotalPoints } = params;
    if (!existingRanking) {
      return 0;
    }

    if (existingRanking.manualAdjustmentPoints !== 0) {
      return this.roundPointsValue(existingRanking.manualAdjustmentPoints);
    }

    if (!existingRanking.pointsModified) {
      return 0;
    }

    return this.roundPointsValue(
      existingRanking.totalPoints - computedTotalPoints,
    );
  }

  private async hasManualKillAdjustmentForRanking(params: {
    eventId: string;
    memberId: number;
    heroNpcName: string;
  }): Promise<boolean> {
    const matchingKillPoints = await this.repository.findManualKillPoints(
      params.eventId,
      params.memberId,
      params.heroNpcName,
    );

    return matchingKillPoints.some((killPoint) =>
      this.isKillPointCountedInRanking({
        confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
        confirmedAt: killPoint.confirmedAt,
      }),
    );
  }

  private calculateTrackingDurationPercentage(params: {
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

  private calculateRespawnProgressPercentage(params: {
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

  private getPresenceLogSinceFilter(since?: Date) {
    if (!since) {
      return {};
    }

    return {
      OR: [
        { startedAt: { gte: since } },
        { endedAt: { gte: since } },
        { endedAt: null, startedAt: { lte: since } },
      ],
    };
  }

  private calculateTrackingMetricsForKill(params: {
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
    const trackingDurationPercentage = this.calculateTrackingDurationPercentage(
      {
        trackingDurationSeconds,
        killedAt: params.killTime,
        minSpawnTimeAtKill: params.respawnStartTime,
      },
    );

    return {
      trackingDurationSeconds,
      trackingDurationPercentage,
    };
  }

  recalculateEventPoints(
    eventId: string,
    _newBasePoints: number,
  ): Promise<void> {
    return this.recalculateEventPointsWithCurrentRules(eventId);
  }

  private async recalculateEventPointsWithCurrentRules(
    eventId: string,
  ): Promise<void> {
    const event = await this.repository.findEvent(eventId);

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
    const existingRankings = await this.repository.findRankings(eventId);
    const existingRankingsByKey = new Map(
      existingRankings.map((ranking) => [
        this.createRankingKey({
          memberId: ranking.memberId,
          heroNpcName: ranking.heroNpcName,
        }),
        ranking,
      ]),
    );

    const killPoints = await this.repository.findKillPointsForEvent(eventId);

    if (killPoints.length === 0) {
      return;
    }

    const killPointsByKillId = this.groupBy(
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
    const windowSummaries = await this.repository.findWindowSummaries(
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
        ? await this.repository.findAssignments(
            allMapIds,
            allMemberIds,
            latestKillTime,
            earliestOverlapWindowStart,
          )
        : [];

    const assignmentsByMember = this.groupBy(
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
      const trackingMetrics = this.calculateTrackingMetricsForKill({
        assignments: assignmentsByMember.get(killPoint.memberId) ?? [],
        heroMapIds: heroMapIdsByKillId.get(killPoint.killId) ?? new Set(),
        killTime: killPoint.kill.killedAt,
        respawnStartTime: trackingWindowStartTime,
      });
      const trackingDurationSeconds = trackingMetrics.trackingDurationSeconds;
      const trackingDurationPercentage =
        trackingMetrics.trackingDurationPercentage;
      const memberState = this.getMemberKillState({
        assignments: assignmentsByMember.get(killPoint.memberId) ?? [],
        heroMapIds: heroMapIdsByKillId.get(killPoint.killId) ?? new Set(),
        killTime: killPoint.kill.killedAt,
        respawnStartTime: trackingWindowStartTime,
      });

      const { totalPoints, basePoints, appliedBonuses } =
        this.calculateMemberPoints({
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
      const effectivePoints = this.roundPointsValue(
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
        !this.isKillPointCountedInRanking({
          confirmationDeadlineAt: recalculatedKillPoint.confirmationDeadlineAt,
          confirmedAt: recalculatedKillPoint.confirmedAt,
        })
      ) {
        continue;
      }

      const key = this.createRankingKey({
        memberId: recalculatedKillPoint.memberId,
        heroNpcName: recalculatedKillPoint.heroNpcName,
      });
      const existing = rankingMap.get(key);
      const rankingTrackingDurationSeconds =
        this.getTrackingDurationSecondsForRanking({
          trackingDurationSeconds:
            recalculatedKillPoint.trackingDurationSeconds,
        });

      if (recalculatedKillPoint.hasManualPointsAdjustment) {
        manualAdjustmentRankingKeys.add(key);
      }

      if (existing) {
        existing.totalPoints = this.roundPointsValue(
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
      EventPointsRepository["applyRecalculation"]
    >[1] = [];

    for (const ranking of rankingMap.values()) {
      const rankingKey = this.createRankingKey({
        memberId: ranking.memberId,
        heroNpcName: ranking.heroNpcName,
      });
      const existingRanking = existingRankingsByKey.get(rankingKey);
      const manualAdjustmentPoints = this.resolveManualAdjustmentPoints({
        existingRanking,
        computedTotalPoints: ranking.totalPoints,
      });
      const persistedRankingData = {
        totalPoints: this.roundPointsValue(
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
      const rankingKey = this.createRankingKey({
        memberId: existingRanking.memberId,
        heroNpcName: existingRanking.heroNpcName,
      });

      if (processedRankingKeys.has(rankingKey)) {
        continue;
      }

      const manualAdjustmentPoints = this.resolveManualAdjustmentPoints({
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

    await this.repository.applyRecalculation(killPointUpdates, rankingUpdates);

    await this.emitRankingUpdateByEventId(eventId);
  }

  private groupBy<Key, Value>(
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

  private getMemberKillState(params: {
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

  async getMemberPresenceStats(
    heroNpcId: string,
    memberId: number,
    since?: Date,
    until?: Date,
  ): Promise<Omit<MemberPresenceStats, "memberId">> {
    const [stats] = await this.getMembersPresenceStats(
      heroNpcId,
      [memberId],
      since,
      until,
    );

    return (
      stats ?? {
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: "",
      }
    );
  }

  async getMembersPresenceStats(
    heroNpcId: string,
    memberIds: number[],
    since?: Date,
    until?: Date,
  ): Promise<MemberPresenceStats[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const maps = await this.repository.findMaps(heroNpcId);

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

    const logs = await this.repository.findPresenceLogs(
      mapIds,
      memberIds,
      since,
    );

    const windowEnd = until ?? new Date();
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
  }

  async getMemberPresenceStatsPerMap(
    mapIds: string[],
    memberId: number,
    since?: Date,
    until?: Date,
  ): Promise<
    Array<{
      mapId: string;
      presenceTimeSeconds: number;
      afkTimeSeconds: number;
    }>
  > {
    if (mapIds.length === 0) {
      return [];
    }

    const logs = await this.repository.findPresenceLogs(
      mapIds,
      [memberId],
      since,
    );

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
  }

  async getMembersPresenceStatsPerMap(
    mapIds: string[],
    memberIds: number[],
    since?: Date,
    until?: Date,
  ): Promise<
    Array<{
      memberId: number;
      mapId: string;
      presenceTimeSeconds: number;
      afkTimeSeconds: number;
    }>
  > {
    if (mapIds.length === 0 || memberIds.length === 0) {
      return [];
    }

    const logs = await this.repository.findPresenceLogs(
      mapIds,
      memberIds,
      since,
    );

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
  }

  async updateRankingAfterKill(
    eventId: string,
    heroNpcName: string,
    killPoints: EventKillPoint[],
  ): Promise<void> {
    const rankableKillPoints = killPoints.filter((killPoint) =>
      this.isKillPointCountedInRanking({
        confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
        confirmedAt: killPoint.confirmedAt,
      }),
    );

    if (rankableKillPoints.length === 0) {
      return;
    }

    await Promise.all(
      rankableKillPoints.map(async (killPoint) => {
        const trackingDurationSeconds =
          this.getTrackingDurationSecondsForRanking({
            trackingDurationSeconds: killPoint.trackingDurationSeconds,
          });
        const existing = await this.repository.findRankingByKey(
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

          await this.repository.incrementRanking(
            existing.id,
            killPoint.points,
            trackingDurationSeconds,
            Math.round(newAvgAfk * 100) / 100,
            existing.pointsModified || killPoint.manualAdjustmentPoints !== 0,
          );
          return;
        }

        await this.repository.createRanking({
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
    );

    await this.emitRankingUpdateByEventId(eventId);
  }

  async getPendingParticipationConfirmations(
    guildId: string,
    eventId: string,
    memberId: number,
  ): Promise<{
    items: Array<{
      killId: string;
      killedAt: Date;
      confirmationDeadlineAt: Date;
      heroNpc: {
        id: string;
        npcId: number | null;
        npcName: string;
        npcIcon: string | null;
        npcLvl: number | null;
      };
    }>;
    expiredItems: Array<{
      killId: string;
      killedAt: Date;
      confirmationDeadlineAt: Date;
      heroNpc: {
        id: string;
        npcId: number | null;
        npcName: string;
        npcIcon: string | null;
        npcLvl: number | null;
      };
    }>;
  }> {
    const event = await this.repository.findEvent(eventId, guildId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const now = new Date();
    const [pendingKillPoints, expiredKillPoints] = await Promise.all([
      this.repository.findParticipationPoints(eventId, memberId, now, false),
      this.repository.findParticipationPoints(eventId, memberId, now, true),
    ]);

    const dedupeByKillId = (
      points: Array<{
        killId: string;
        confirmationDeadlineAt: Date | null;
        kill: {
          killedAt: Date;
          heroNpc: {
            id: string;
            npcId: number | null;
            npcName: string;
            npcIcon: string | null;
            npcLvl: number | null;
          };
        };
      }>,
    ) => {
      const dedupedByKillId = new Map<
        string,
        {
          killId: string;
          killedAt: Date;
          confirmationDeadlineAt: Date;
          heroNpc: {
            id: string;
            npcId: number | null;
            npcName: string;
            npcIcon: string | null;
            npcLvl: number | null;
          };
        }
      >();

      for (const point of points) {
        if (!point.confirmationDeadlineAt) {
          continue;
        }

        if (!dedupedByKillId.has(point.killId)) {
          dedupedByKillId.set(point.killId, {
            killId: point.killId,
            killedAt: point.kill.killedAt,
            confirmationDeadlineAt: point.confirmationDeadlineAt,
            heroNpc: point.kill.heroNpc,
          });
        }
      }

      return Array.from(dedupedByKillId.values());
    };

    return {
      items: dedupeByKillId(pendingKillPoints),
      expiredItems: dedupeByKillId(expiredKillPoints),
    };
  }

  async acknowledgeExpiredParticipationConfirmations(
    guildId: string,
    eventId: string,
    memberId: number,
    killIds: string[],
  ): Promise<{ acknowledgedCount: number }> {
    const acknowledgedAt = new Date();
    const acknowledgedCount = await this.repository.acknowledgeExpired(
      guildId,
      eventId,
      memberId,
      killIds,
      acknowledgedAt,
    );

    return {
      acknowledgedCount,
    };
  }

  async confirmParticipationForKill(
    guildId: string,
    eventId: string,
    killId: string,
    memberId: number,
  ): Promise<{ success: true; confirmedNow: boolean }> {
    const memberKillPoints = await this.repository.findMemberKillPoints(
      guildId,
      eventId,
      killId,
      memberId,
    );

    if (memberKillPoints.length === 0) {
      throw new NotFoundException("Kill point not found");
    }

    const now = new Date();
    const unconfirmedPoints = memberKillPoints.filter(
      (point) => point.confirmedAt === null,
    );

    if (unconfirmedPoints.length === 0) {
      return { success: true, confirmedNow: false };
    }

    const hasExpiredConfirmation = unconfirmedPoints.some((point) => {
      if (!point.confirmationDeadlineAt) {
        return false;
      }

      return point.confirmationDeadlineAt.getTime() < now.getTime();
    });

    if (hasExpiredConfirmation) {
      throw new BadRequestException("Confirmation window has expired");
    }

    const pointsToConfirmIds = unconfirmedPoints
      .filter((point) => point.confirmationDeadlineAt !== null)
      .map((point) => point.id);

    if (pointsToConfirmIds.length === 0) {
      return { success: true, confirmedNow: false };
    }

    const confirmedPoints = await this.repository.confirmPoints(
      pointsToConfirmIds,
      now,
    );

    if (confirmedPoints.length === 0) {
      return { success: true, confirmedNow: false };
    }

    await this.updateRankingAfterKill(
      eventId,
      memberKillPoints[0].kill.heroNpc.npcName,
      confirmedPoints,
    );

    return { success: true, confirmedNow: true };
  }

  async updateKillPoint(
    guildId: string,
    eventId: string,
    killId: string,
    killPointId: string,
    pointsDelta: number,
    comment: string | undefined,
    editedByUserId: string,
  ) {
    const killPoint = await this.repository.findScopedKillPoint(
      guildId,
      eventId,
      killId,
      killPointId,
    );

    if (!killPoint) {
      throw new NotFoundException("Kill point not found");
    }

    const normalizedPointsDelta = this.roundPointsValue(pointsDelta);
    const normalizedComment = this.normalizePointsEditComment(comment);
    if (normalizedPointsDelta === 0) {
      return killPoint;
    }

    const updatedKillPoints = this.roundPointsValue(
      killPoint.points + normalizedPointsDelta,
    );
    const updatedKillAdjustment = this.roundPointsValue(
      killPoint.manualAdjustmentPoints + normalizedPointsDelta,
    );

    const updated = await this.repository.updateKillPoint(killPointId, {
      points: updatedKillPoints,
      manualAdjustmentPoints: updatedKillAdjustment,
    });

    const isCountedInRanking = this.isKillPointCountedInRanking({
      confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
      confirmedAt: killPoint.confirmedAt,
    });

    if (isCountedInRanking) {
      const ranking = await this.repository.findRankingByKey(
        eventId,
        killPoint.memberId,
        killPoint.kill.heroNpc.npcName,
      );

      if (ranking) {
        const updatedRankingTotalPoints = this.roundPointsValue(
          ranking.totalPoints + normalizedPointsDelta,
        );

        await this.repository.updateRanking(ranking.id, {
          totalPoints: updatedRankingTotalPoints,
          pointsModified: true,
        });

        await this.repository.createHistory({
          rankingId: ranking.id,
          previousPoints: ranking.totalPoints,
          newPoints: updatedRankingTotalPoints,
          editType: "KILL_POINT",
          editedByUserId,
          comment: normalizedComment,
        });
      }

      await Promise.all([
        this.eventReadCache.invalidateEvent(guildId, eventId),
        this.eventEmitter.emit(RoutingKey.EVENT_RANKING_UPDATE, {
          guildId,
          eventId,
        }),
      ]);
    }

    return updated;
  }

  async updateRankingPoints(
    guildId: string,
    eventId: string,
    rankingId: string,
    pointsDelta: number,
    comment: string | undefined,
    editedByUserId: string,
  ) {
    const ranking = await this.repository.findScopedRanking(
      guildId,
      eventId,
      rankingId,
    );

    if (!ranking) {
      throw new NotFoundException("Ranking not found");
    }

    const normalizedPointsDelta = this.roundPointsValue(pointsDelta);
    const normalizedComment = this.normalizePointsEditComment(comment);
    if (normalizedPointsDelta === 0) {
      return ranking;
    }

    const previousPoints = ranking.totalPoints;
    const normalizedNewTotalPoints = this.roundPointsValue(
      ranking.totalPoints + normalizedPointsDelta,
    );
    const manualAdjustmentPoints = this.roundPointsValue(
      ranking.manualAdjustmentPoints + normalizedPointsDelta,
    );
    const hasManualKillAdjustment =
      await this.hasManualKillAdjustmentForRanking({
        eventId,
        memberId: ranking.memberId,
        heroNpcName: ranking.heroNpcName,
      });

    await this.repository.createHistory({
      rankingId,
      previousPoints,
      newPoints: normalizedNewTotalPoints,
      editType: "RANKING",
      editedByUserId,
      comment: normalizedComment,
    });

    const updated = await this.repository.updateRanking(rankingId, {
      totalPoints: normalizedNewTotalPoints,
      manualAdjustmentPoints,
      pointsModified: hasManualKillAdjustment || manualAdjustmentPoints !== 0,
    });

    await Promise.all([
      this.eventReadCache.invalidateEvent(guildId, eventId),
      this.eventEmitter.emit(RoutingKey.EVENT_RANKING_UPDATE, {
        guildId,
        eventId,
      }),
    ]);

    return updated;
  }

  async getRankingEditHistories(
    guildId: string,
    eventId: string,
    rankingIds: string[],
  ) {
    if (rankingIds.length === 0) {
      return new Map();
    }

    const historyEntries = await this.repository.findHistories(
      guildId,
      eventId,
      rankingIds,
    );

    const editedByUserIds = Array.from(
      new Set(historyEntries.map((entry) => entry.editedByUserId)),
    );
    const editors =
      editedByUserIds.length === 0
        ? []
        : await this.repository.findEditors(guildId, editedByUserIds);
    const editorNameByUserId = new Map(
      editors.flatMap((editor) =>
        editor.globalUserId
          ? [[editor.globalUserId, editor.name] as const]
          : [],
      ),
    );

    const enrichedHistoryEntries = historyEntries.map((entry) => ({
      ...entry,
      deltaPoints: this.roundPointsValue(
        entry.newPoints - entry.previousPoints,
      ),
      editedByName: editorNameByUserId.get(entry.editedByUserId) ?? null,
    }));
    const historiesByRankingId = new Map<
      string,
      typeof enrichedHistoryEntries
    >();

    for (const entry of enrichedHistoryEntries) {
      const rankingHistory = historiesByRankingId.get(entry.rankingId) ?? [];

      rankingHistory.push(entry);
      historiesByRankingId.set(entry.rankingId, rankingHistory);
    }

    return historiesByRankingId;
  }

  private async emitRankingUpdateByEventId(eventId: string): Promise<void> {
    const event = await this.repository.findEvent(eventId);

    if (!event) {
      return;
    }

    await Promise.all([
      this.eventReadCache.invalidateEvent(event.guildId, event.id),
      this.eventEmitter.emit(RoutingKey.EVENT_RANKING_UPDATE, {
        guildId: event.guildId,
        eventId: event.id,
      }),
    ]);
  }
}
