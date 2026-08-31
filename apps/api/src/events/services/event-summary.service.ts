import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { clipToWindow } from "../utils/tracking-window.util.js";

const CoverageGapType = prismaDb.nativeEnums.public.CoverageGapType.members;
type CoverageGapType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["CoverageGapType"]["values"][number];
type InputJsonValue = DatabaseJsonValue;

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
    const maps = (await this.prisma.db.orm.public.EventMap.where((row) =>
      row.heroNpcId.eq(heroNpcId),
    )
      .select("id", "mapName", "mapId")
      .all()) as Array<{ id: string; mapName: string; mapId: number }>;

    if (maps.length === 0) {
      this.logger.debug({
        message: "No maps for hero, skipping summary creation",
        heroNpcId,
      });
      return;
    }

    const mapIds = maps.map((m) => m.id);
    const mapNameById = new Map(maps.map((m) => [m.id, m.mapName]));

    const presenceLogs =
      (await this.prisma.db.orm.public.EventPresenceLog.where((row) =>
        and(
          row.mapId.in(mapIds),
          or(
            and(
              row.startedAt.gte(windowOpenedAt),
              row.startedAt.lte(windowClosedAt),
            ),
            and(
              row.startedAt.lt(windowOpenedAt),
              or(row.endedAt.isNull(), row.endedAt.gt(windowOpenedAt)),
            ),
          ),
        ),
      )
        .include("member", (relation) =>
          relation.select("id", "name", "avatar"),
        )
        .all()) as any[];

    const gaps = (await this.prisma.db.orm.public.EventMapCoverageGap.where(
      (row) =>
        and(
          row.heroNpcId.eq(heroNpcId),
          or(
            and(
              row.startedAt.gte(windowOpenedAt),
              row.startedAt.lte(windowClosedAt),
            ),
            and(
              row.startedAt.lt(windowOpenedAt),
              or(row.endedAt.isNull(), row.endedAt.gt(windowOpenedAt)),
            ),
          ),
        ),
    ).all()) as any[];

    const totalWindowSeconds = Math.max(
      0,
      Math.round((windowClosedAt.getTime() - windowOpenedAt.getTime()) / 1000),
    );

    const memberStatsMap = new Map<number, MemberStat>();

    for (const log of presenceLogs) {
      const { start: clippedStart, end: clippedEnd } = clipToWindow({
        start: log.startedAt,
        end: log.endedAt,
        windowStart: windowOpenedAt,
        windowEnd: windowClosedAt,
      });

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

      const { start: clippedStart, end: clippedEnd } = clipToWindow({
        start: log.startedAt,
        end: log.endedAt,
        windowStart: windowOpenedAt,
        windowEnd: windowClosedAt,
      });

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
      const { start: clippedStart, end: clippedEnd } = clipToWindow({
        start: gap.startedAt,
        end: gap.endedAt,
        windowStart: windowOpenedAt,
        windowEnd: windowClosedAt,
      });

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

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.EventRespawnWindowSummary.create({
        id: createId(),
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
        memberStats: memberStats as unknown as InputJsonValue,
        mapStats: mapStats as unknown as InputJsonValue,
        gapsTimeline: gapsTimeline as unknown as InputJsonValue,
      });

      const deletedLogs = await tx.orm.public.EventPresenceLog.where((row) =>
        and(
          row.mapId.in(mapIds),
          or(
            and(
              row.startedAt.gte(windowOpenedAt),
              row.startedAt.lte(windowClosedAt),
            ),
            and(
              row.startedAt.lt(windowOpenedAt),
              row.endedAt.lte(windowClosedAt),
            ),
          ),
        ),
      ).deleteAndCount();

      const deletedGaps = await tx.orm.public.EventMapCoverageGap.where((row) =>
        and(
          row.heroNpcId.eq(heroNpcId),
          and(row.endedAt.isNotNull(), row.endedAt.lte(windowClosedAt)),
        ),
      ).deleteAndCount();

      this.logger.log({
        message: "Created respawn window summary",
        heroNpcId,
        killId,
        totalWindowSeconds,
        coveragePercentage,
        memberCount: memberStats.length,
        deletedLogs,
        deletedGaps,
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
    const hero = await this.prisma.db.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroNpcId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      return { data: [], nextCursor: null };
    }

    let summariesQuery =
      this.prisma.db.orm.public.EventRespawnWindowSummary.where((row) =>
        row.heroNpcId.eq(heroNpcId),
      );
    if (cursor) {
      summariesQuery = summariesQuery.where((row) => row.id.lt(cursor));
    }
    const summaries = await summariesQuery
      .orderBy((row) => row.windowClosedAt.desc())
      .limit(limit + 1)
      .all();

    const hasMore = summaries.length > limit;
    const data = hasMore ? summaries.slice(0, limit) : summaries;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return { data, nextCursor };
  }
}
