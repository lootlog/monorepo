import { Logger } from "#src/shared/logging/application-logger";
import { Effect } from "effect";
import type { eventMapCoverageGapTable } from "#src/database/drizzle/schema";
import { clipToWindow } from "../utils/tracking-window.util.js";
import type { EventSummaryStore } from "./event-summary.repository.js";

type CoverageGapType = typeof eventMapCoverageGapTable.$inferSelect.gapType;

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

export const makeEventSummary = (repository: EventSummaryStore) => {
  const logger = new Logger("EventSummary");
  return {
    createWindowSummary(
      heroNpcId: string,
      killId: string | null,
      windowOpenedAt: Date,
      windowClosedAt: Date,
      minSpawnTime: Date,
      maxSpawnTime: Date,
      wasManualClose: boolean,
    ) {
      return Effect.gen(function* () {
        const maps = yield* repository.findMaps(heroNpcId);

        if (maps.length === 0) {
          logger.debug({
            message: "No maps for hero, skipping summary creation",
            heroNpcId,
          });
          return;
        }

        const mapIds = maps.map((m) => m.id);
        const mapNameById = new Map(maps.map((m) => [m.id, m.mapName]));

        const [presenceLogs, gaps] = yield* Effect.all(
          [
            repository.findPresenceLogs(mapIds, windowOpenedAt, windowClosedAt),
            repository.findGaps(heroNpcId, windowOpenedAt, windowClosedAt),
          ],
          { concurrency: "unbounded" },
        );

        const totalWindowSeconds = Math.max(
          0,
          Math.round(
            (windowClosedAt.getTime() - windowOpenedAt.getTime()) / 1000,
          ),
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

        const memberStats: MemberStat[] = Array.from(
          memberStatsMap.values(),
        ).sort((a, b) => b.timeSeconds - a.timeSeconds);

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

          if (gap.gapType === "UNCOVERED") {
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
          memberStats.reduce(
            (sum, m) => sum + (m.timeSeconds - m.afkSeconds),
            0,
          ),
          totalWindowSeconds * maps.length,
        );

        const coveragePercentage =
          totalWindowSeconds > 0
            ? Math.round((totalCoverageSeconds / totalWindowSeconds) * 10000) /
              100
            : 0;

        const deleted = yield* repository
          .saveSummary({
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
              memberStats,
              mapStats,
              gapsTimeline,
            },
            mapIds,
            heroNpcId,
            windowOpenedAt,
            windowClosedAt,
          })
          .pipe(
            Effect.withSpan("events.summary.save", {
              attributes: { adapter: "events.summary.drizzle", retryCount: 0 },
            }),
          );
        logger.log({
          message: "Created respawn window summary",
          heroNpcId,
          killId,
          totalWindowSeconds,
          coveragePercentage,
          memberCount: memberStats.length,
          deletedLogs: deleted.deletedLogs,
          deletedGaps: deleted.deletedGaps,
        });
      }).pipe(Effect.withSpan("events.summary.createWindow"));
    },

    getHeroWindowSummaries(
      guildId: string,
      eventId: string,
      heroNpcId: string,
      limit = 20,
      cursor?: string,
    ) {
      return Effect.gen(function* () {
        if (!(yield* repository.heroExists(guildId, eventId, heroNpcId))) {
          return { data: [], nextCursor: null };
        }

        const summaries = yield* repository.findSummaries(
          heroNpcId,
          limit,
          cursor,
        );

        const hasMore = summaries.length > limit;
        const data = hasMore ? summaries.slice(0, limit) : summaries;
        const nextCursor = hasMore ? data[data.length - 1]?.id : null;

        return { data, nextCursor };
      }).pipe(Effect.withSpan("events.summary.getHeroWindows"));
    },
  };
};

export type EventSummary = ReturnType<typeof makeEventSummary>;
