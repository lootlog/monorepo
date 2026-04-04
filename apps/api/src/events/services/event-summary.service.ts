import { Injectable, Logger } from "@nestjs/common";
import { CoverageGapType, type Prisma } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";

interface MemberStat {
  memberId: number;
  name: string;
  avatar: string | null;
  timeSeconds: number;
  afkSeconds: number;
  afkPercentage: number;
  maps: string[];
}

interface MapStat {
  mapId: string;
  mapName: string;
  coverageSeconds: number;
  gapSeconds: number;
}

interface GapTimelineEntry {
  mapId: string;
  mapName: string;
  gapType: CoverageGapType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

function clipToWindow(
  start: Date,
  end: Date | null,
  windowOpenedAt: Date,
  windowClosedAt: Date,
): { clippedStart: Date; clippedEnd: Date } {
  return {
    clippedStart: new Date(Math.max(start.getTime(), windowOpenedAt.getTime())),
    clippedEnd: new Date(
      Math.min((end || windowClosedAt).getTime(), windowClosedAt.getTime()),
    ),
  };
}

@Injectable()
export class EventSummaryService {
  private readonly logger = new Logger(EventSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createWindowSummary(
    heroNpcId: string,
    killId: string | null,
    windowOpenedAt: Date,
    windowClosedAt: Date,
    minSpawnTime: Date,
    maxSpawnTime: Date,
    wasManualClose: boolean,
  ): Promise<void> {
    const maps = await this.prisma.eventMap.findMany({
      where: { heroNpcId },
      select: { id: true, mapName: true, mapId: true },
    });

    if (maps.length === 0) {
      this.logger.debug({
        message: "No maps for hero, skipping summary creation",
        heroNpcId,
      });
      return;
    }

    const mapIds = maps.map((m) => m.id);
    const mapNameById = new Map(maps.map((m) => [m.id, m.mapName]));

    const presenceLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        OR: [
          {
            startedAt: { gte: windowOpenedAt, lte: windowClosedAt },
          },
          {
            startedAt: { lt: windowOpenedAt },
            OR: [{ endedAt: null }, { endedAt: { gt: windowOpenedAt } }],
          },
        ],
      },
      include: {
        member: { select: { id: true, name: true, avatar: true } },
      },
    });

    const gaps = await this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        OR: [
          {
            startedAt: { gte: windowOpenedAt, lte: windowClosedAt },
          },
          {
            startedAt: { lt: windowOpenedAt },
            OR: [{ endedAt: null }, { endedAt: { gt: windowOpenedAt } }],
          },
        ],
      },
    });

    const totalWindowSeconds = Math.max(
      0,
      Math.round((windowClosedAt.getTime() - windowOpenedAt.getTime()) / 1000),
    );

    const memberStatsMap = new Map<number, MemberStat>();

    for (const log of presenceLogs) {
      const { clippedStart, clippedEnd } = clipToWindow(
        log.startedAt,
        log.endedAt,
        windowOpenedAt,
        windowClosedAt,
      );

      const durationMs = Math.max(
        0,
        clippedEnd.getTime() - clippedStart.getTime(),
      );
      const durationSeconds = Math.round(durationMs / 1000);

      let stat = memberStatsMap.get(log.memberId);
      if (!stat) {
        stat = {
          memberId: log.member.id,
          name: log.member.name,
          avatar: log.member.avatar,
          timeSeconds: 0,
          afkSeconds: 0,
          afkPercentage: 0,
          maps: [],
        };
        memberStatsMap.set(log.memberId, stat);
      }

      stat.timeSeconds += durationSeconds;
      if (log.isAfk) {
        stat.afkSeconds += durationSeconds;
      }

      const mapName = mapNameById.get(log.mapId);
      if (mapName && !stat.maps.includes(mapName)) {
        stat.maps.push(mapName);
      }
    }

    for (const stat of memberStatsMap.values()) {
      stat.afkPercentage =
        stat.timeSeconds > 0
          ? Math.round((stat.afkSeconds / stat.timeSeconds) * 10000) / 100
          : 0;
    }

    const memberStats: MemberStat[] = Array.from(memberStatsMap.values()).sort(
      (a, b) => b.timeSeconds - a.timeSeconds,
    );

    const mapStatsMap = new Map<string, MapStat>();
    for (const map of maps) {
      mapStatsMap.set(map.id, {
        mapId: map.id,
        mapName: map.mapName,
        coverageSeconds: 0,
        gapSeconds: 0,
      });
    }

    for (const log of presenceLogs) {
      if (log.isAfk) continue;

      const { clippedStart, clippedEnd } = clipToWindow(
        log.startedAt,
        log.endedAt,
        windowOpenedAt,
        windowClosedAt,
      );

      const durationSeconds = Math.max(
        0,
        Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 1000),
      );

      const stat = mapStatsMap.get(log.mapId);
      if (stat) {
        stat.coverageSeconds += durationSeconds;
      }
    }

    let totalUncoveredSeconds = 0;
    let totalUnassignedSeconds = 0;
    const gapsTimeline: GapTimelineEntry[] = [];

    for (const gap of gaps) {
      const { clippedStart, clippedEnd } = clipToWindow(
        gap.startedAt,
        gap.endedAt,
        windowOpenedAt,
        windowClosedAt,
      );

      const durationSeconds = Math.max(
        0,
        Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 1000),
      );

      if (gap.gapType === CoverageGapType.UNCOVERED) {
        totalUncoveredSeconds += durationSeconds;
      } else {
        totalUnassignedSeconds += durationSeconds;
      }

      const mapStat = mapStatsMap.get(gap.mapId);
      if (mapStat) {
        mapStat.gapSeconds += durationSeconds;
      }

      gapsTimeline.push({
        mapId: gap.mapId,
        mapName: mapNameById.get(gap.mapId) || "Unknown",
        gapType: gap.gapType,
        startedAt: clippedStart,
        endedAt: clippedEnd,
        durationSeconds,
      });
    }

    const mapStats: MapStat[] = Array.from(mapStatsMap.values());

    const totalCoverageSeconds = Math.min(
      memberStats.reduce((sum, m) => sum + (m.timeSeconds - m.afkSeconds), 0),
      totalWindowSeconds * maps.length,
    );

    const coveragePercentage =
      totalWindowSeconds > 0
        ? Math.round((totalCoverageSeconds / totalWindowSeconds) * 10000) / 100
        : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.eventRespawnWindowSummary.create({
        data: {
          heroNpcId,
          killId,
          windowOpenedAt,
          windowClosedAt,
          minSpawnTime,
          maxSpawnTime,
          wasManualClose,
          totalWindowSeconds,
          totalCoverageSeconds,
          totalUncoveredSeconds,
          totalUnassignedSeconds,
          coveragePercentage,
          memberStats: memberStats as unknown as Prisma.InputJsonValue,
          mapStats: mapStats as unknown as Prisma.InputJsonValue,
          gapsTimeline: gapsTimeline as unknown as Prisma.InputJsonValue,
        },
      });

      const deletedLogs = await tx.eventPresenceLog.deleteMany({
        where: {
          mapId: { in: mapIds },
          OR: [
            {
              startedAt: { gte: windowOpenedAt, lte: windowClosedAt },
            },
            {
              startedAt: { lt: windowOpenedAt },
              endedAt: { lte: windowClosedAt },
            },
          ],
        },
      });

      const deletedGaps = await tx.eventMapCoverageGap.deleteMany({
        where: {
          heroNpcId,
          endedAt: { not: null, lte: windowClosedAt },
        },
      });

      this.logger.log({
        message: "Created respawn window summary",
        heroNpcId,
        killId,
        totalWindowSeconds,
        coveragePercentage,
        memberCount: memberStats.length,
        deletedLogs: deletedLogs.count,
        deletedGaps: deletedGaps.count,
      });
    });
  }

  async getHeroWindowSummaries(
    guildId: string,
    eventId: string,
    heroNpcId: string,
    limit = 20,
    cursor?: string,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      return { data: [], nextCursor: null };
    }

    const summaries = await this.prisma.eventRespawnWindowSummary.findMany({
      where: {
        heroNpcId,
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { windowClosedAt: "desc" },
      take: limit + 1,
    });

    const hasMore = summaries.length > limit;
    const data = hasMore ? summaries.slice(0, limit) : summaries;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor };
  }
}
