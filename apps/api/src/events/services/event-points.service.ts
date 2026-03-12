import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { EventKillPoint, Prisma } from "generated/client";
import { PrismaService } from "src/db/prisma.service";
import { EventEmitterService } from "./event-emitter.service";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
  type EventScoringRules,
} from "../constants/scoring-rules.constant";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "../utils/scoring-rules.util";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util";
import {
  evaluateEventScoring,
  type EventScoringAppliedBonus,
} from "../utils/scoring-engine.util";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
} from "../utils/tracking-window.util";

export type CalculateMemberPointsParams = {
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

export type CalculatedMemberPoints = {
  totalPoints: number;
  basePoints: number;
  bonusPoints: number;
  appliedBonuses: EventScoringAppliedBonus[];
};

export type MemberPresenceStats = {
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

@Injectable()
export class EventPointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
  ) {}

  async getRanking(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return this.prisma.eventRanking.findMany({
      where: { eventId },
      select: {
        id: true,
        eventId: true,
        memberId: true,
        heroNpcName: true,
        totalPoints: true,
        totalKills: true,
        totalTimeSeconds: true,
        avgAfkPercentage: true,
        pointsModified: true,
        updatedAt: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        totalPoints: "desc",
      },
    });
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
    if (
      params.trackingDurationSeconds === null ||
      params.trackingDurationSeconds === undefined ||
      !Number.isFinite(params.trackingDurationSeconds)
    ) {
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

  private calculateTrackingDurationPercentage(params: {
    trackingDurationSeconds: number | null | undefined;
    killedAt: Date;
    minSpawnTimeAtKill: Date;
  }): number | undefined {
    if (
      params.trackingDurationSeconds === null ||
      params.trackingDurationSeconds === undefined ||
      !Number.isFinite(params.trackingDurationSeconds)
    ) {
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

  async recalculateEventPoints(
    eventId: string,
    _newBasePoints: number,
  ): Promise<void> {
    return this.recalculateEventPointsWithCurrentRules(eventId);
  }

  private async recalculateEventPointsWithCurrentRules(
    eventId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        scoringMode: true,
        scoringRules: true,
      },
    });

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

    const killPoints = await this.prisma.eventKillPoint.findMany({
      where: {
        kill: {
          heroNpc: {
            eventId,
          },
        },
      },
      include: {
        kill: {
          include: {
            heroNpc: {
              include: {
                maps: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (killPoints.length === 0) {
      return;
    }

    const killPointsByKillId = new Map<string, typeof killPoints>();
    for (const kp of killPoints) {
      const existing = killPointsByKillId.get(kp.killId);
      if (existing) {
        existing.push(kp);
      } else {
        killPointsByKillId.set(kp.killId, [kp]);
      }
    }

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
      killPoints.length > 0
        ? await this.prisma.eventRespawnWindowSummary.findMany({
            where: {
              killId: {
                in: Array.from(
                  new Set(killPoints.map((point) => point.kill.id)),
                ),
              },
            },
            select: {
              killId: true,
              windowOpenedAt: true,
            },
          })
        : [];
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
        ? await this.prisma.eventMapAssignmentHistory.findMany({
            where: {
              mapId: { in: allMapIds },
              memberId: { in: allMemberIds },
              assignedAt: { lte: latestKillTime },
              OR: [
                { unassignedAt: null },
                { unassignedAt: { gte: earliestOverlapWindowStart } },
              ],
            },
            select: {
              mapId: true,
              memberId: true,
              assignedAt: true,
              unassignedAt: true,
            },
            orderBy: { assignedAt: "asc" },
          })
        : [];

    const assignmentsByMember = new Map<
      number,
      Array<{
        mapId: string;
        memberId: number;
        assignedAt: Date;
        unassignedAt: Date | null;
      }>
    >();
    for (const assignment of assignmentHistory) {
      if (!assignmentsByMember.has(assignment.memberId)) {
        assignmentsByMember.set(assignment.memberId, []);
      }
      assignmentsByMember.get(assignment.memberId)?.push(assignment);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const killPoint of killPoints) {
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

        await tx.eventKillPoint.update({
          where: { id: killPoint.id },
          data: {
            basePoints,
            points: totalPoints,
            trackingDurationSeconds,
            trackingDurationPercentage: trackingDurationPercentage ?? null,
            bonusBreakdown: appliedBonuses as Prisma.InputJsonValue,
          },
        });
      }

      await tx.eventRanking.deleteMany({
        where: { eventId },
      });

      const updatedKillPoints = await tx.eventKillPoint.findMany({
        where: {
          kill: {
            heroNpc: {
              eventId,
            },
          },
        },
        include: {
          kill: {
            include: {
              heroNpc: true,
            },
          },
        },
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

      for (const kp of updatedKillPoints) {
        if (
          !this.isKillPointCountedInRanking({
            confirmationDeadlineAt: kp.confirmationDeadlineAt,
            confirmedAt: kp.confirmedAt,
          })
        ) {
          continue;
        }

        const key = `${kp.memberId}-${kp.kill.heroNpc.npcName}`;
        const existing = rankingMap.get(key);
        const trackingDurationSeconds =
          this.getTrackingDurationSecondsForRanking({
            trackingDurationSeconds: kp.trackingDurationSeconds,
          });

        if (existing) {
          existing.totalPoints += kp.points;
          existing.totalKills += 1;
          existing.totalTimeSeconds += trackingDurationSeconds;
          existing.afkSum += kp.afkPercentage;
        } else {
          rankingMap.set(key, {
            memberId: kp.memberId,
            heroNpcName: kp.kill.heroNpc.npcName,
            totalPoints: kp.points,
            totalKills: 1,
            totalTimeSeconds: trackingDurationSeconds,
            afkSum: kp.afkPercentage,
          });
        }
      }

      for (const ranking of rankingMap.values()) {
        await tx.eventRanking.create({
          data: {
            eventId,
            memberId: ranking.memberId,
            heroNpcName: ranking.heroNpcName,
            totalPoints: ranking.totalPoints,
            totalKills: ranking.totalKills,
            totalTimeSeconds: ranking.totalTimeSeconds,
            avgAfkPercentage:
              Math.round((ranking.afkSum / ranking.totalKills) * 100) / 100,
          },
        });
      }
    });

    await this.emitRankingUpdateByEventId(eventId);
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
  ): Promise<Omit<MemberPresenceStats, "memberId">> {
    const [stats] = await this.getMembersPresenceStats(
      heroNpcId,
      [memberId],
      since,
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
  ): Promise<MemberPresenceStats[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const maps = await this.prisma.eventMap.findMany({
      where: { heroNpcId },
      select: { id: true, mapName: true },
    });

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

    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId: { in: memberIds },
        ...this.getPresenceLogSinceFilter(since),
      },
      orderBy: [{ memberId: "asc" }, { startedAt: "asc" }],
    });

    const now = new Date();
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
      const endTime = log.endedAt || now;
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

    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId,
        ...this.getPresenceLogSinceFilter(since),
      },
      orderBy: { startedAt: "asc" },
    });

    const now = new Date();
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
      const endTime = log.endedAt || now;
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

    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId: { in: memberIds },
        ...this.getPresenceLogSinceFilter(since),
      },
      orderBy: { startedAt: "asc" },
    });

    const now = new Date();
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
      const endTime = log.endedAt || now;
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

    for (const killPoint of rankableKillPoints) {
      const trackingDurationSeconds = this.getTrackingDurationSecondsForRanking(
        {
          trackingDurationSeconds: killPoint.trackingDurationSeconds,
        },
      );
      const existing = await this.prisma.eventRanking.findUnique({
        where: {
          eventId_memberId_heroNpcName: {
            eventId,
            memberId: killPoint.memberId,
            heroNpcName,
          },
        },
      });

      if (existing) {
        const newTotalKills = existing.totalKills + 1;
        const newAvgAfk =
          (existing.avgAfkPercentage * existing.totalKills +
            killPoint.afkPercentage) /
          newTotalKills;

        await this.prisma.eventRanking.update({
          where: {
            eventId_memberId_heroNpcName: {
              eventId,
              memberId: killPoint.memberId,
              heroNpcName,
            },
          },
          data: {
            totalPoints: { increment: killPoint.points },
            totalKills: { increment: 1 },
            totalTimeSeconds: { increment: trackingDurationSeconds },
            avgAfkPercentage: Math.round(newAvgAfk * 100) / 100,
          },
        });
      } else {
        await this.prisma.eventRanking.create({
          data: {
            eventId,
            memberId: killPoint.memberId,
            heroNpcName,
            totalPoints: killPoint.points,
            totalKills: 1,
            totalTimeSeconds: trackingDurationSeconds,
            avgAfkPercentage: killPoint.afkPercentage,
          },
        });
      }
    }

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
        npcName: string;
        npcIcon: string | null;
        npcLvl: number | null;
      };
    }>;
  }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const now = new Date();
    const [pendingKillPoints, expiredKillPoints] = await Promise.all([
      this.prisma.eventKillPoint.findMany({
        where: {
          memberId,
          confirmedAt: null,
          confirmationDeadlineAt: {
            not: null,
            gte: now,
          },
          kill: {
            heroNpc: {
              eventId,
            },
          },
        },
        select: {
          killId: true,
          confirmationDeadlineAt: true,
          kill: {
            select: {
              killedAt: true,
              heroNpc: {
                select: {
                  id: true,
                  npcName: true,
                  npcIcon: true,
                  npcLvl: true,
                },
              },
            },
          },
        },
        orderBy: {
          confirmationDeadlineAt: "asc",
        },
      }),
      this.prisma.eventKillPoint.findMany({
        where: {
          memberId,
          confirmedAt: null,
          confirmationDeadlineAt: {
            not: null,
            lt: now,
          },
          kill: {
            heroNpc: {
              eventId,
            },
          },
        },
        select: {
          killId: true,
          confirmationDeadlineAt: true,
          kill: {
            select: {
              killedAt: true,
              heroNpc: {
                select: {
                  id: true,
                  npcName: true,
                  npcIcon: true,
                  npcLvl: true,
                },
              },
            },
          },
        },
        orderBy: {
          confirmationDeadlineAt: "desc",
        },
      }),
    ]);

    const dedupeByKillId = (
      points: Array<{
        killId: string;
        confirmationDeadlineAt: Date | null;
        kill: {
          killedAt: Date;
          heroNpc: {
            id: string;
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

  async confirmParticipationForKill(
    guildId: string,
    eventId: string,
    killId: string,
    memberId: number,
  ): Promise<{ success: true; confirmedNow: boolean }> {
    const memberKillPoints = await this.prisma.eventKillPoint.findMany({
      where: {
        killId,
        memberId,
        kill: {
          heroNpc: {
            eventId,
            event: { guildId },
          },
        },
      },
      include: {
        kill: {
          include: {
            heroNpc: {
              select: {
                npcName: true,
              },
            },
          },
        },
      },
    });

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

    const confirmedPoints = await this.prisma.$transaction(async (tx) => {
      await tx.eventKillPoint.updateMany({
        where: {
          id: { in: pointsToConfirmIds },
          confirmedAt: null,
        },
        data: {
          confirmedAt: now,
        },
      });

      return tx.eventKillPoint.findMany({
        where: {
          id: { in: pointsToConfirmIds },
        },
      });
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
    newPoints: number,
    editedByUserId: string,
  ) {
    const killPoint = await this.prisma.eventKillPoint.findFirst({
      where: {
        id: killPointId,
        killId,
        kill: {
          heroNpc: {
            eventId,
            event: { guildId },
          },
        },
      },
      include: {
        kill: {
          include: {
            heroNpc: true,
          },
        },
      },
    });

    if (!killPoint) {
      throw new NotFoundException("Kill point not found");
    }

    const oldPoints = killPoint.points;
    const delta = newPoints - oldPoints;

    const updated = await this.prisma.eventKillPoint.update({
      where: { id: killPointId },
      data: {
        points: newPoints,
        basePoints: newPoints,
        bonusBreakdown: [] as Prisma.InputJsonValue,
      },
    });

    if (
      delta !== 0 &&
      this.isKillPointCountedInRanking({
        confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
        confirmedAt: killPoint.confirmedAt,
      })
    ) {
      const ranking = await this.prisma.eventRanking.findFirst({
        where: {
          eventId,
          memberId: killPoint.memberId,
          heroNpcName: killPoint.kill.heroNpc.npcName,
        },
      });

      if (ranking) {
        await this.prisma.eventRanking.update({
          where: { id: ranking.id },
          data: {
            totalPoints: { increment: delta },
            pointsModified: true,
          },
        });

        await this.prisma.eventPointsEditHistory.create({
          data: {
            rankingId: ranking.id,
            previousPoints: ranking.totalPoints,
            newPoints: ranking.totalPoints + delta,
            editType: "KILL_POINT",
            editedByUserId,
          },
        });
      }

      await this.eventEmitter.emitRankingUpdate(guildId, eventId);
    }

    return updated;
  }

  async updateRankingPoints(
    guildId: string,
    eventId: string,
    rankingId: string,
    newTotalPoints: number,
    editedByUserId: string,
  ) {
    const ranking = await this.prisma.eventRanking.findFirst({
      where: {
        id: rankingId,
        eventId,
        event: { guildId },
      },
    });

    if (!ranking) {
      throw new NotFoundException("Ranking not found");
    }

    const previousPoints = ranking.totalPoints;

    await this.prisma.eventPointsEditHistory.create({
      data: {
        rankingId,
        previousPoints,
        newPoints: newTotalPoints,
        editType: "RANKING",
        editedByUserId,
      },
    });

    const updated = await this.prisma.eventRanking.update({
      where: { id: rankingId },
      data: { totalPoints: newTotalPoints, pointsModified: true },
    });

    await this.eventEmitter.emitRankingUpdate(guildId, eventId);

    return updated;
  }

  async getRankingEditHistory(
    guildId: string,
    eventId: string,
    rankingId: string,
  ) {
    const ranking = await this.prisma.eventRanking.findFirst({
      where: {
        id: rankingId,
        eventId,
        event: { guildId },
      },
    });

    if (!ranking) {
      throw new NotFoundException("Ranking not found");
    }

    return this.prisma.eventPointsEditHistory.findMany({
      where: { rankingId },
      orderBy: { editedAt: "desc" },
    });
  }

  private async emitRankingUpdateByEventId(eventId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { guildId: true, id: true },
    });

    if (!event) {
      return;
    }

    await this.eventEmitter.emitRankingUpdate(event.guildId, event.id);
  }
}
