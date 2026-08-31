import type { FieldOutputTypes } from "../../prisma/contract.js";
import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { attachRolesToMembers } from "#src/members/member-roles.repository";
import { EventEmitterService } from "./event-emitter.service.js";
import { EventReadCacheService } from "./event-read-cache.service.js";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  evaluateEventScoring,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringAppliedBonus,
  type EventScoringMode,
  type EventScoringRules,
} from "@lootlog/scoring";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util.js";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
} from "../utils/tracking-window.util.js";

type EventKillPoint = FieldOutputTypes["public"]["EventKillPoint"];
type InputJsonValue = DatabaseJsonValue;

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

@Injectable()
export class EventPointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
    private readonly eventReadCache: EventReadCacheService,
  ) {}

  getRanking(guildId: string, eventId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "ranking"),
      async () => {
        const event = await this.prisma.db.orm.public.Event.where((row) =>
          and(row.id.eq(eventId), row.guildId.eq(guildId)),
        ).first();

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        const rankings = await this.prisma.db.orm.public.EventRanking.where(
          (row) => row.eventId.eq(eventId),
        )
          .select(
            "id",
            "eventId",
            "memberId",
            "heroNpcName",
            "totalPoints",
            "totalKills",
            "totalTimeSeconds",
            "avgAfkPercentage",
            "pointsModified",
            "updatedAt",
          )
          .include("member", (row) => row.select("id", "name"))
          .orderBy((row) => row.totalPoints.desc())
          .all();
        const members = await attachRolesToMembers(
          this.prisma.db,
          rankings.map((ranking) => ranking.member),
        );
        const membersById = new Map(
          members.map((member) => [member.id, member]),
        );
        return rankings.map((ranking) => ({
          ...ranking,
          member: membersById.get(ranking.member.id) ?? ranking.member,
        }));
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
    const matchingKillPoints =
      await this.prisma.db.orm.public.EventKillPoint.where((row) =>
        and(
          row.memberId.eq(params.memberId),
          row.manualAdjustmentPoints.neq(0),
          row.kill.some((related) =>
            related.heroNpc.some((related) =>
              and(
                related.eventId.eq(params.eventId),
                related.npcName.eq(params.heroNpcName),
              ),
            ),
          ),
        ),
      )
        .select("confirmationDeadlineAt", "confirmedAt")
        .all();

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

  private applyPresenceLogSinceFilter(collection: any, since?: Date) {
    if (!since) {
      return collection;
    }

    return collection.where((row) =>
      or(
        row.startedAt.gte(since),
        row.endedAt.gte(since),
        and(row.endedAt.isNull(), row.startedAt.lte(since)),
      ),
    );
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
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      row.id.eq(eventId),
    )
      .select("scoringMode", "scoringRules")
      .first();

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
    const existingRankings =
      (await this.prisma.db.orm.public.EventRanking.where((row) =>
        row.eventId.eq(eventId),
      )
        .select(
          "id",
          "memberId",
          "heroNpcName",
          "totalPoints",
          "manualAdjustmentPoints",
          "pointsModified",
        )
        .all()) as ExistingRankingSnapshot[];
    const existingRankingsByKey = new Map(
      existingRankings.map((ranking) => [
        this.createRankingKey({
          memberId: ranking.memberId,
          heroNpcName: ranking.heroNpcName,
        }),
        ranking,
      ]),
    );

    const killPoints = (await this.prisma.db.orm.public.EventKillPoint.where(
      (row) =>
        row.kill.some((kill) =>
          kill.heroNpc.some((heroNpc) => heroNpc.eventId.eq(eventId)),
        ),
    )
      .include("kill", (relation) =>
        relation.include("heroNpc", (relationChild) =>
          relationChild.include("maps", (relationChildChild) =>
            relationChildChild.select("id"),
          ),
        ),
      )
      .all()) as any[];

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
    const windowSummaries =
      (await this.prisma.db.orm.public.EventRespawnWindowSummary.where((row) =>
        row.killId.in(
          Array.from(new Set(killPoints.map((point) => point.kill.id))),
        ),
      )
        .select("killId", "windowOpenedAt")
        .all()) as Array<{ killId: string | null; windowOpenedAt: Date }>;
    const windowOpenedAtByKillId = new Map<string, Date>(
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

    const assignmentHistory: Array<{
      mapId: string;
      memberId: number;
      assignedAt: Date;
      unassignedAt: Date | null;
    }> =
      allMapIds.length > 0 && allMemberIds.length > 0
        ? await this.prisma.db.orm.public.EventMapAssignmentHistory.where(
            (row) =>
              and(
                row.mapId.in(allMapIds),
                row.memberId.in(allMemberIds),
                row.assignedAt.lte(latestKillTime),
                or(
                  row.unassignedAt.isNull(),
                  row.unassignedAt.gte(earliestOverlapWindowStart),
                ),
              ),
          )
            .select("mapId", "memberId", "assignedAt", "unassignedAt")
            .orderBy((row) => row.assignedAt.asc())
            .all()
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
          bonusBreakdown: appliedBonuses as InputJsonValue,
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

    const transactionOperations: Array<
      (transaction: Pick<PrismaService["db"], "orm">) => Promise<unknown>
    > = recalculatedKillPoints.map(
      (recalculatedKillPoint) => (transaction) =>
        transaction.orm.public.EventKillPoint.where((row) =>
          row.id.eq(recalculatedKillPoint.killPointId),
        ).update(recalculatedKillPoint.updateData),
    );

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
        updatedAt: new Date(),
      };

      processedRankingKeys.add(rankingKey);

      if (existingRanking) {
        transactionOperations.push((transaction) =>
          transaction.orm.public.EventRanking.where((row) =>
            row.id.eq(existingRanking.id),
          ).update(persistedRankingData),
        );
        continue;
      }

      transactionOperations.push((transaction) =>
        transaction.orm.public.EventRanking.create({
          id: createId(),
          eventId,
          memberId: ranking.memberId,
          heroNpcName: ranking.heroNpcName,
          ...persistedRankingData,
        }),
      );
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
        transactionOperations.push((transaction) =>
          transaction.orm.public.EventRanking.where((row) =>
            row.id.eq(existingRanking.id),
          ).update({
            totalPoints: manualAdjustmentPoints,
            manualAdjustmentPoints,
            totalKills: 0,
            totalTimeSeconds: 0,
            avgAfkPercentage: 0,
            pointsModified: true,
            updatedAt: new Date(),
          }),
        );
        continue;
      }

      transactionOperations.push((transaction) =>
        transaction.orm.public.EventRanking.where((row) =>
          row.id.eq(existingRanking.id),
        ).delete(),
      );
    }

    await this.prisma.db.transaction(async (transaction) => {
      for (const operation of transactionOperations) {
        await operation(transaction);
      }
    });

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

    const maps = (await this.prisma.db.orm.public.EventMap.where((row) =>
      row.heroNpcId.eq(heroNpcId),
    )
      .select("id", "mapName")
      .all()) as Array<{ id: string; mapName: string }>;

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

    let logsQuery = this.prisma.db.orm.public.EventPresenceLog.where((row) =>
      and(row.mapId.in(mapIds), row.memberId.in(memberIds)),
    );
    if (since) {
      logsQuery = logsQuery.where((row) =>
        or(
          row.startedAt.gte(since),
          row.endedAt.gte(since),
          and(row.endedAt.isNull(), row.startedAt.lte(since)),
        ),
      );
    }
    const logs = (await logsQuery
      .orderBy([(row) => row.memberId.asc(), (row) => row.startedAt.asc()])
      .all()) as any[];

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

    const logs = await this.applyPresenceLogSinceFilter(
      this.prisma.db.orm.public.EventPresenceLog.where((row) =>
        and(row.mapId.in(mapIds), row.memberId.eq(memberId)),
      ),
      since,
    )
      .orderBy((row) => row.startedAt.asc())
      .all();

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

    const logs = await this.applyPresenceLogSinceFilter(
      this.prisma.db.orm.public.EventPresenceLog.where((row) =>
        and(row.mapId.in(mapIds), row.memberId.in(memberIds)),
      ),
      since,
    )
      .orderBy((row) => row.startedAt.asc())
      .all();

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
        const existing = await this.prisma.db.orm.public.EventRanking.where(
          (row) =>
            and(
              row.eventId.eq(eventId),
              row.memberId.eq(killPoint.memberId),
              row.heroNpcName.eq(heroNpcName),
            ),
        ).first();

        if (existing) {
          const newTotalKills = existing.totalKills + 1;
          const newAvgAfk =
            (existing.avgAfkPercentage * existing.totalKills +
              killPoint.afkPercentage) /
            newTotalKills;

          await this.prisma.db.orm.public.EventRanking.where((row) =>
            and(
              row.eventId.eq(eventId),
              row.memberId.eq(killPoint.memberId),
              row.heroNpcName.eq(heroNpcName),
            ),
          ).update({
            totalPoints: existing.totalPoints + killPoint.points,
            totalKills: newTotalKills,
            totalTimeSeconds:
              existing.totalTimeSeconds + trackingDurationSeconds,
            avgAfkPercentage: Math.round(newAvgAfk * 100) / 100,
            pointsModified:
              existing.pointsModified || killPoint.manualAdjustmentPoints !== 0,
            updatedAt: new Date(),
          });
          return;
        }

        await this.prisma.db.orm.public.EventRanking.create({
          id: createId(),
          eventId,
          memberId: killPoint.memberId,
          heroNpcName,
          totalPoints: killPoint.points,
          totalKills: 1,
          totalTimeSeconds: trackingDurationSeconds,
          avgAfkPercentage: killPoint.afkPercentage,
          pointsModified: killPoint.manualAdjustmentPoints !== 0,
          updatedAt: new Date(),
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
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    )
      .select("id")
      .first();

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const now = new Date();
    const [pendingKillPoints, expiredKillPoints] = await Promise.all([
      this.prisma.db.orm.public.EventKillPoint.where((row) =>
        and(
          row.memberId.eq(memberId),
          row.confirmedAt.isNull(),
          and(
            row.confirmationDeadlineAt.isNotNull(),
            row.confirmationDeadlineAt.gte(now),
          ),
          row.kill.some((related) =>
            related.heroNpc.some((related) => related.eventId.eq(eventId)),
          ),
        ),
      )
        .select("killId", "confirmationDeadlineAt")
        .include("kill", (row) =>
          row
            .select("killedAt")
            .include("heroNpc", (rowRow) =>
              rowRow.select("id", "npcId", "npcName", "npcIcon", "npcLvl"),
            ),
        )
        .orderBy((row) => row.confirmationDeadlineAt.asc())
        .all(),
      this.prisma.db.orm.public.EventKillPoint.where((row) =>
        and(
          row.memberId.eq(memberId),
          row.confirmedAt.isNull(),
          row.confirmationExpiredAcknowledgedAt.isNull(),
          and(
            row.confirmationDeadlineAt.isNotNull(),
            row.confirmationDeadlineAt.lt(now),
          ),
          row.kill.some((related) =>
            related.heroNpc.some((related) => related.eventId.eq(eventId)),
          ),
        ),
      )
        .select("killId", "confirmationDeadlineAt")
        .include("kill", (row) =>
          row
            .select("killedAt")
            .include("heroNpc", (rowRow) =>
              rowRow.select("id", "npcId", "npcName", "npcIcon", "npcLvl"),
            ),
        )
        .orderBy((row) => row.confirmationDeadlineAt.desc())
        .all(),
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
    const result = await this.prisma.db.orm.public.EventKillPoint.where((row) =>
      and(
        row.killId.in(killIds),
        row.memberId.eq(memberId),
        row.confirmedAt.isNull(),
        row.confirmationDeadlineAt.lt(acknowledgedAt),
        row.confirmationExpiredAcknowledgedAt.isNull(),
        row.kill.some((related) =>
          related.heroNpc.some((related) =>
            and(
              related.eventId.eq(eventId),
              related.event.some((related) => related.guildId.eq(guildId)),
            ),
          ),
        ),
      ),
    ).updateAndCount({
      confirmationExpiredAcknowledgedAt: acknowledgedAt,
    });

    return {
      acknowledgedCount: result,
    };
  }

  async confirmParticipationForKill(
    guildId: string,
    eventId: string,
    killId: string,
    memberId: number,
  ): Promise<{ success: true; confirmedNow: boolean }> {
    const memberKillPoints =
      await this.prisma.db.orm.public.EventKillPoint.where((row) =>
        and(
          row.killId.eq(killId),
          row.memberId.eq(memberId),
          row.kill.some((related) =>
            related.heroNpc.some((related) =>
              and(
                related.eventId.eq(eventId),
                related.event.some((related) => related.guildId.eq(guildId)),
              ),
            ),
          ),
        ),
      )
        .include("kill", (relation) =>
          relation.include("heroNpc", (relationChild) =>
            relationChild.select("npcName"),
          ),
        )
        .all();

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

    const confirmedPoints = await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.EventKillPoint.where((row) =>
        and(row.id.in(pointsToConfirmIds), row.confirmedAt.isNull()),
      ).updateAndCount({
        confirmedAt: now,
      });

      return tx.orm.public.EventKillPoint.where((row) =>
        row.id.in(pointsToConfirmIds),
      ).all();
    });

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
    const killPoint = await this.prisma.db.orm.public.EventKillPoint.where(
      (row) =>
        and(
          row.id.eq(killPointId),
          row.killId.eq(killId),
          row.kill.some((related) =>
            related.heroNpc.some((related) =>
              and(
                related.eventId.eq(eventId),
                related.event.some((related) => related.guildId.eq(guildId)),
              ),
            ),
          ),
        ),
    )
      .include("kill", (relation) => relation.include("heroNpc"))
      .first();

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

    const updated = await this.prisma.db.orm.public.EventKillPoint.where(
      (row) => row.id.eq(killPointId),
    ).update({
      points: updatedKillPoints,
      manualAdjustmentPoints: updatedKillAdjustment,
    });

    const isCountedInRanking = this.isKillPointCountedInRanking({
      confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
      confirmedAt: killPoint.confirmedAt,
    });

    if (isCountedInRanking) {
      const ranking = await this.prisma.db.orm.public.EventRanking.where(
        (row) =>
          and(
            row.eventId.eq(eventId),
            row.memberId.eq(killPoint.memberId),
            row.heroNpcName.eq(killPoint.kill.heroNpc.npcName),
          ),
      ).first();

      if (ranking) {
        const updatedRankingTotalPoints = this.roundPointsValue(
          ranking.totalPoints + normalizedPointsDelta,
        );

        await this.prisma.db.orm.public.EventRanking.where((row) =>
          row.id.eq(ranking.id),
        ).update({
          totalPoints: updatedRankingTotalPoints,
          pointsModified: true,
          updatedAt: new Date(),
        });

        await this.prisma.db.orm.public.EventPointsEditHistory.create({
          id: createId(),
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
        this.eventEmitter.emitRankingUpdate(guildId, eventId),
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
    const ranking = await this.prisma.db.orm.public.EventRanking.where((row) =>
      and(
        row.id.eq(rankingId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

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

    await this.prisma.db.orm.public.EventPointsEditHistory.create({
      id: createId(),
      rankingId,
      previousPoints,
      newPoints: normalizedNewTotalPoints,
      editType: "RANKING",
      editedByUserId,
      comment: normalizedComment,
    });

    const updated = await this.prisma.db.orm.public.EventRanking.where((row) =>
      row.id.eq(rankingId),
    ).update({
      totalPoints: normalizedNewTotalPoints,
      manualAdjustmentPoints,
      pointsModified: hasManualKillAdjustment || manualAdjustmentPoints !== 0,
      updatedAt: new Date(),
    });

    await Promise.all([
      this.eventReadCache.invalidateEvent(guildId, eventId),
      this.eventEmitter.emitRankingUpdate(guildId, eventId),
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

    const historyEntries =
      await this.prisma.db.orm.public.EventPointsEditHistory.where((row) =>
        and(
          row.rankingId.in(rankingIds),
          row.ranking.some((related) =>
            and(
              related.eventId.eq(eventId),
              related.event.some((related) => related.guildId.eq(guildId)),
            ),
          ),
        ),
      )
        .orderBy((row) => row.editedAt.desc())
        .all();

    const editedByUserIds = Array.from(
      new Set(historyEntries.map((entry) => entry.editedByUserId)),
    );
    const editors =
      editedByUserIds.length === 0
        ? []
        : await this.prisma.db.orm.public.Member.where((row) =>
            and(row.guildId.eq(guildId), row.globalUserId.in(editedByUserIds)),
          )
            .select("globalUserId", "name")
            .all();
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
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      row.id.eq(eventId),
    )
      .select("guildId", "id")
      .first();

    if (!event) {
      return;
    }

    await Promise.all([
      this.eventReadCache.invalidateEvent(event.guildId, event.id),
      this.eventEmitter.emitRankingUpdate(event.guildId, event.id),
    ]);
  }
}
