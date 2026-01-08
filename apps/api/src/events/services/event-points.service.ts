import { Injectable, NotFoundException } from '@nestjs/common';
import type { Event, EventKillPoint } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import type {
  TimeOfDayMultiplier,
  TrackersMultipliers,
  MapsCountMultipliers,
} from '../interfaces/time-multiplier.interface';

/** Default multiplier value when no multiplier config is found or applicable */
const DEFAULT_MULTIPLIER = 1.0;

/**
 * Service responsible for points calculation, rankings, and presence statistics.
 * Handles all point-related business logic including multipliers and manual edits.
 */
@Injectable()
export class EventPointsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get event rankings.
   */
  async getRanking(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.eventRanking.findMany({
      where: { eventId },
      include: {
        member: true,
      },
      orderBy: {
        totalPoints: 'desc',
      },
    });
  }

  /**
   * Calculate points with all multipliers applied.
   */
  calculateMemberPoints(
    event: Event,
    killTime: Date,
    heroMapCount: number,
    assignedMembersCount: number,
  ): {
    points: number;
    appliedMultiplier: number;
    timeMultiplier: number;
    trackersMultiplier: number;
    mapsMultiplier: number;
  } {
    const basePoints = event.basePointsPerKill;

    // Get multipliers
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

    const appliedMultiplier =
      timeMultiplier * trackersMultiplier * mapsMultiplier;
    const points = Math.round(basePoints * appliedMultiplier);

    return {
      points,
      appliedMultiplier,
      timeMultiplier,
      trackersMultiplier,
      mapsMultiplier,
    };
  }

  /**
   * Get time-of-day multiplier based on kill time.
   */
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

  /**
   * Check if time is within a range (handles overnight ranges).
   */
  private isTimeInRange(time: string, from: string, to: string): boolean {
    if (from <= to) {
      // Normal range (e.g., 06:00 to 18:00)
      return time >= from && time < to;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      return time >= from || time < to;
    }
  }

  /**
   * Get trackers multiplier based on number of assigned members.
   */
  private getTrackersMultiplier(
    multipliers: TrackersMultipliers | null,
    assignedCount: number,
  ): number {
    if (!multipliers || assignedCount === 0) {
      return DEFAULT_MULTIPLIER;
    }

    // Find the highest key <= assignedCount
    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a); // Descending

    for (const key of sortedKeys) {
      if (assignedCount >= key) {
        return multipliers[key.toString()] ?? DEFAULT_MULTIPLIER;
      }
    }

    // If assignedCount is less than all keys, return highest multiplier
    if (sortedKeys.length > 0) {
      const minKey = sortedKeys[sortedKeys.length - 1];
      return multipliers[minKey.toString()] ?? DEFAULT_MULTIPLIER;
    }

    return DEFAULT_MULTIPLIER;
  }

  /**
   * Get maps count multiplier.
   */
  private getMapsCountMultiplier(
    multipliers: MapsCountMultipliers | null,
    mapCount: number,
  ): number {
    if (!multipliers || mapCount === 0) {
      return DEFAULT_MULTIPLIER;
    }

    // Find the highest key <= mapCount
    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a); // Descending

    for (const key of sortedKeys) {
      if (mapCount >= key) {
        return multipliers[key.toString()] ?? DEFAULT_MULTIPLIER;
      }
    }

    return DEFAULT_MULTIPLIER;
  }

  /**
   * Recalculate all points for an event when basePointsPerKill changes.
   * Updates all EventKillPoint records and rebuilds EventRanking aggregations.
   */
  async recalculateEventPoints(
    eventId: string,
    newBasePoints: number,
  ): Promise<void> {
    // Get all EventKillPoint records for this event
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

    // Update all kill points with new base and recalculated final points
    await this.prisma.$transaction(async (tx) => {
      for (const killPoint of killPoints) {
        const newPoints = Math.round(
          newBasePoints * killPoint.appliedMultiplier,
        );
        await tx.eventKillPoint.update({
          where: { id: killPoint.id },
          data: {
            basePoints: newBasePoints,
            points: newPoints,
          },
        });
      }

      // Delete all rankings for this event to rebuild
      await tx.eventRanking.deleteMany({
        where: { eventId },
      });

      // Re-aggregate rankings from updated kill points
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

      // Group by member and heroNpcName
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

      // Create new ranking records
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
  }

  /**
   * Get presence statistics for a member on hero maps.
   */
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

    // Get presence logs that overlap with the time window
    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId,
        ...(since && {
          OR: [
            { startedAt: { gte: since } }, // Started after since
            { endedAt: { gte: since } }, // Ended after since (overlap)
            { endedAt: null, startedAt: { lte: since } }, // Still ongoing, started before
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
      // Only count time after 'since' if it's specified
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

  /**
   * Get presence stats per individual map for a member.
   * Returns an array with stats for each map the member was present on.
   */
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

    // Get presence logs for this member on these maps
    // Include logs that overlap with the time window (not just those that started after)
    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId,
        ...(since && {
          OR: [
            { startedAt: { gte: since } }, // Started after since
            { endedAt: { gte: since } }, // Ended after since (overlap)
            { endedAt: null, startedAt: { lte: since } }, // Still ongoing, started before
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

    // Initialize all maps with zero values
    for (const mapId of mapIds) {
      mapStats.set(mapId, { presenceTimeMs: 0, afkTimeMs: 0 });
    }

    // Aggregate stats per map
    for (const log of logs) {
      const stats = mapStats.get(log.mapId);
      if (!stats) continue;

      // Only count time after 'since' if it's specified
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

  /**
   * Update event rankings after a kill.
   */
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
        // Calculate new average AFK
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
  }

  // ========== MANUAL POINTS EDITING ==========

  /**
   * Update a kill point's points value and recalculate the ranking.
   */
  async updateKillPoint(
    guildId: string,
    eventId: string,
    killId: string,
    killPointId: string,
    newPoints: number,
    editedByUserId: string,
  ) {
    // Verify the kill point exists and belongs to the correct event/guild
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

    // Update the kill point
    const updated = await this.prisma.eventKillPoint.update({
      where: { id: killPointId },
      data: {
        points: newPoints,
        // Update basePoints proportionally if multiplier is non-zero
        basePoints:
          killPoint.appliedMultiplier > 0
            ? Math.round(newPoints / killPoint.appliedMultiplier)
            : newPoints,
      },
    });

    // Update the ranking and create edit history if points changed
    if (delta !== 0) {
      // Find the ranking to get its ID and old total points
      const ranking = await this.prisma.eventRanking.findFirst({
        where: {
          eventId,
          memberId: killPoint.memberId,
          heroNpcName: killPoint.kill.heroNpc.npcName,
        },
      });

      if (ranking) {
        // Update ranking
        await this.prisma.eventRanking.update({
          where: { id: ranking.id },
          data: {
            totalPoints: { increment: delta },
            pointsModified: true,
          },
        });

        // Create edit history
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
    }

    return updated;
  }

  /**
   * Update a ranking's total points directly.
   */
  async updateRankingPoints(
    guildId: string,
    eventId: string,
    rankingId: string,
    newTotalPoints: number,
    editedByUserId: string,
  ) {
    // Verify the ranking exists and belongs to the correct event/guild
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

    // Create edit history
    await this.prisma.eventPointsEditHistory.create({
      data: {
        rankingId,
        previousPoints,
        newPoints: newTotalPoints,
        editType: 'RANKING',
        editedByUserId,
      },
    });

    return this.prisma.eventRanking.update({
      where: { id: rankingId },
      data: { totalPoints: newTotalPoints, pointsModified: true },
    });
  }

  /**
   * Get edit history for a ranking.
   */
  async getRankingEditHistory(
    guildId: string,
    eventId: string,
    rankingId: string,
  ) {
    // Verify the ranking exists and belongs to the correct event/guild
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
}
