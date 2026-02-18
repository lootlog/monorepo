import { Injectable, NotFoundException } from '@nestjs/common';
import type { Event, EventKillPoint } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { EventEmitterService } from './event-emitter.service';
import type {
  TimeOfDayMultiplier,
  TrackersMultipliers,
  MapsCountMultipliers,
  TrackingDurationMultipliers,
} from '../interfaces/time-multiplier.interface';

const DEFAULT_MULTIPLIER = 1.0;

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
      throw new NotFoundException('Event not found');
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
        totalPoints: 'desc',
      },
    });
  }

  calculateMemberPoints(
    event: Event,
    killTime: Date,
    heroMapCount: number,
    assignedMembersCount: number,
    trackingDurationPercentage?: number,
  ): {
    points: number;
    appliedMultiplier: number;
    timeMultiplier: number;
    trackersMultiplier: number;
    mapsMultiplier: number;
    trackingDurationMultiplier: number;
  } {
    const basePoints = event.basePointsPerKill;

    const timeMultiplier = this.getTimeOfDayMultiplier(
      event.timeOfDayMultipliers as unknown as TimeOfDayMultiplier[] | null,
      killTime,
    );

    const trackersMultiplier = this.getTrackersMultiplier(
      event.trackersMultipliers as unknown as TrackersMultipliers | null,
      assignedMembersCount,
    );

    const mapsMultiplier = this.getMapsCountMultiplier(
      event.mapsCountMultipliers as unknown as MapsCountMultipliers | null,
      heroMapCount,
    );

    const trackingDurationMultiplier = this.getTrackingDurationMultiplier(
      event.trackingDurationMultipliers as unknown as TrackingDurationMultipliers | null,
      trackingDurationPercentage,
    );

    const appliedMultiplier =
      timeMultiplier *
      trackersMultiplier *
      mapsMultiplier *
      trackingDurationMultiplier;
    const points = Math.round(basePoints * appliedMultiplier * 100) / 100;

    return {
      points,
      appliedMultiplier,
      timeMultiplier,
      trackersMultiplier,
      mapsMultiplier,
      trackingDurationMultiplier,
    };
  }

  private getTimeOfDayMultiplier(
    multipliers: TimeOfDayMultiplier[] | null,
    killTime: Date,
  ): number {
    if (!multipliers || multipliers.length === 0) {
      return DEFAULT_MULTIPLIER;
    }

    const hours = killTime.getHours();
    const minutes = killTime.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    for (const range of multipliers) {
      if (this.isTimeInRange(timeStr, range.from, range.to)) {
        return range.multiplier;
      }
    }

    return DEFAULT_MULTIPLIER;
  }

  private isTimeInRange(time: string, from: string, to: string): boolean {
    if (from <= to) {
      return time >= from && time < to;
    } else {
      return time >= from || time < to;
    }
  }

  private getTrackersMultiplier(
    multipliers: TrackersMultipliers | null,
    assignedCount: number,
  ): number {
    if (!multipliers || assignedCount === 0) {
      return DEFAULT_MULTIPLIER;
    }

    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a);

    for (const key of sortedKeys) {
      if (assignedCount >= key) {
        return multipliers[key.toString()] ?? DEFAULT_MULTIPLIER;
      }
    }

    if (sortedKeys.length > 0) {
      const minKey = sortedKeys[sortedKeys.length - 1];
      return multipliers[minKey.toString()] ?? DEFAULT_MULTIPLIER;
    }

    return DEFAULT_MULTIPLIER;
  }

  private getMapsCountMultiplier(
    multipliers: MapsCountMultipliers | null,
    mapCount: number,
  ): number {
    if (!multipliers || mapCount === 0) {
      return DEFAULT_MULTIPLIER;
    }

    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a);

    for (const key of sortedKeys) {
      if (mapCount >= key) {
        return multipliers[key.toString()] ?? DEFAULT_MULTIPLIER;
      }
    }

    return DEFAULT_MULTIPLIER;
  }

  private getTrackingDurationMultiplier(
    multipliers: TrackingDurationMultipliers | null,
    trackingPercentage?: number,
  ): number {
    if (!multipliers || trackingPercentage === undefined) {
      return DEFAULT_MULTIPLIER;
    }

    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k) && k >= 0 && k <= 100)
      .sort((a, b) => b - a);

    for (const key of sortedKeys) {
      if (trackingPercentage >= key) {
        return multipliers[key.toString()] ?? DEFAULT_MULTIPLIER;
      }
    }

    if (sortedKeys.length > 0) {
      const lowestKey = sortedKeys[sortedKeys.length - 1];
      return multipliers[lowestKey.toString()] ?? DEFAULT_MULTIPLIER;
    }

    return DEFAULT_MULTIPLIER;
  }

  async recalculateEventPoints(
    eventId: string,
    newBasePoints: number,
  ): Promise<void> {
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
            heroNpc: true,
          },
        },
      },
    });

    if (killPoints.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const killPoint of killPoints) {
        const newPoints =
          Math.round(newBasePoints * killPoint.appliedMultiplier * 100) / 100;
        await tx.eventKillPoint.update({
          where: { id: killPoint.id },
          data: {
            basePoints: newBasePoints,
            points: newPoints,
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
        const key = `${kp.memberId}-${kp.kill.heroNpc.npcName}`;
        const existing = rankingMap.get(key);

        if (existing) {
          existing.totalPoints += kp.points;
          existing.totalKills += 1;
          existing.totalTimeSeconds += kp.timeOnMapSeconds;
          existing.afkSum += kp.afkPercentage;
        } else {
          rankingMap.set(key, {
            memberId: kp.memberId,
            heroNpcName: kp.kill.heroNpc.npcName,
            totalPoints: kp.points,
            totalKills: 1,
            totalTimeSeconds: kp.timeOnMapSeconds,
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

  async recalculateEventPointsWithMultipliers(
    eventId: string,
    eventConfig: Pick<
      Event,
      | 'basePointsPerKill'
      | 'timeOfDayMultipliers'
      | 'trackersMultipliers'
      | 'mapsCountMultipliers'
      | 'trackingDurationMultipliers'
    >,
  ): Promise<void> {
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
                maps: true,
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

    const assignedMembersCountByKillId = new Map<string, number>();
    for (const [killId, points] of killPointsByKillId) {
      const uniqueMembers = new Set(points.map((p) => p.memberId));
      assignedMembersCountByKillId.set(killId, uniqueMembers.size);
    }

    const heroMapCountByKillAndMember = new Map<string, number>();
    for (const [killId, points] of killPointsByKillId) {
      for (const memberId of new Set(points.map((p) => p.memberId))) {
        const memberPoints = points.filter((p) => p.memberId === memberId);
        const key = `${killId}-${memberId}`;
        heroMapCountByKillAndMember.set(key, memberPoints.length);
      }
    }

    const mockEvent = {
      basePointsPerKill: eventConfig.basePointsPerKill,
      timeOfDayMultipliers: eventConfig.timeOfDayMultipliers,
      trackersMultipliers: eventConfig.trackersMultipliers,
      mapsCountMultipliers: eventConfig.mapsCountMultipliers,
      trackingDurationMultipliers: eventConfig.trackingDurationMultipliers,
    } as Event;

    await this.prisma.$transaction(async (tx) => {
      for (const killPoint of killPoints) {
        const assignedMembersCount =
          assignedMembersCountByKillId.get(killPoint.killId) ?? 1;
        const heroMapCount =
          heroMapCountByKillAndMember.get(
            `${killPoint.killId}-${killPoint.memberId}`,
          ) ?? 1;

        const {
          points,
          appliedMultiplier,
          timeMultiplier,
          trackersMultiplier,
          mapsMultiplier,
          trackingDurationMultiplier,
        } = this.calculateMemberPoints(
          mockEvent,
          killPoint.kill.killedAt,
          heroMapCount,
          assignedMembersCount,
          killPoint.trackingDurationPercentage ?? undefined,
        );

        await tx.eventKillPoint.update({
          where: { id: killPoint.id },
          data: {
            basePoints: eventConfig.basePointsPerKill,
            points,
            appliedMultiplier,
            timeMultiplier,
            trackersMultiplier,
            mapsMultiplier,
            trackingDurationMultiplier,
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
        const key = `${kp.memberId}-${kp.kill.heroNpc.npcName}`;
        const existing = rankingMap.get(key);

        if (existing) {
          existing.totalPoints += kp.points;
          existing.totalKills += 1;
          existing.totalTimeSeconds += kp.timeOnMapSeconds;
          existing.afkSum += kp.afkPercentage;
        } else {
          rankingMap.set(key, {
            memberId: kp.memberId,
            heroNpcName: kp.kill.heroNpc.npcName,
            totalPoints: kp.points,
            totalKills: 1,
            totalTimeSeconds: kp.timeOnMapSeconds,
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

  async getMemberPresenceStats(
    heroNpcId: string,
    memberId: number,
    since?: Date,
  ): Promise<{
    timeOnMapSeconds: number;
    afkPercentage: number;
    wasPresent: boolean;
    mapName: string;
  }> {
    const maps = await this.prisma.eventMap.findMany({
      where: { heroNpcId },
      select: { id: true, mapName: true },
    });

    if (maps.length === 0) {
      return {
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: '',
      };
    }

    const mapIds = maps.map((m) => m.id);

    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId,
        ...(since && {
          OR: [
            { startedAt: { gte: since } },
            { endedAt: { gte: since } },
            { endedAt: null, startedAt: { lte: since } },
          ],
        }),
      },
      orderBy: { startedAt: 'asc' },
    });

    if (logs.length === 0) {
      return {
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: maps[0]?.mapName || '',
      };
    }

    const now = new Date();
    let totalTimeMs = 0;
    let afkTimeMs = 0;
    let lastMapName = '';

    for (const log of logs) {
      const effectiveStart =
        since && log.startedAt < since ? since : log.startedAt;
      const endTime = log.endedAt || now;
      const duration = endTime.getTime() - effectiveStart.getTime();

      if (duration > 0) {
        totalTimeMs += duration;

        if (log.isAfk) {
          afkTimeMs += duration;
        }

        const mapEntry = maps.find((m) => m.id === log.mapId);
        if (mapEntry) {
          lastMapName = mapEntry.mapName;
        }
      }
    }

    const timeOnMapSeconds = Math.round(totalTimeMs / 1000);
    const afkPercentage = totalTimeMs > 0 ? (afkTimeMs / totalTimeMs) * 100 : 0;

    return {
      timeOnMapSeconds,
      afkPercentage: Math.round(afkPercentage * 100) / 100,
      wasPresent: totalTimeMs > 0,
      mapName: lastMapName,
    };
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
        ...(since && {
          OR: [
            { startedAt: { gte: since } },
            { endedAt: { gte: since } },
            { endedAt: null, startedAt: { lte: since } },
          ],
        }),
      },
      orderBy: { startedAt: 'asc' },
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
        ...(since && {
          OR: [
            { startedAt: { gte: since } },
            { endedAt: { gte: since } },
            { endedAt: null, startedAt: { lte: since } },
          ],
        }),
      },
      orderBy: { startedAt: 'asc' },
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
    for (const killPoint of killPoints) {
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
            totalTimeSeconds: { increment: killPoint.timeOnMapSeconds },
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
            totalTimeSeconds: killPoint.timeOnMapSeconds,
            avgAfkPercentage: killPoint.afkPercentage,
          },
        });
      }
    }

    await this.emitRankingUpdateByEventId(eventId);
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
      throw new NotFoundException('Kill point not found');
    }

    const oldPoints = killPoint.points;
    const delta = newPoints - oldPoints;

    const updated = await this.prisma.eventKillPoint.update({
      where: { id: killPointId },
      data: {
        points: newPoints,
        basePoints:
          killPoint.appliedMultiplier > 0
            ? Math.round((newPoints / killPoint.appliedMultiplier) * 100) / 100
            : newPoints,
      },
    });

    if (delta !== 0) {
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
            editType: 'KILL_POINT',
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
      throw new NotFoundException('Ranking not found');
    }

    const previousPoints = ranking.totalPoints;

    await this.prisma.eventPointsEditHistory.create({
      data: {
        rankingId,
        previousPoints,
        newPoints: newTotalPoints,
        editType: 'RANKING',
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
      throw new NotFoundException('Ranking not found');
    }

    return this.prisma.eventPointsEditHistory.findMany({
      where: { rankingId },
      orderBy: { editedAt: 'desc' },
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
