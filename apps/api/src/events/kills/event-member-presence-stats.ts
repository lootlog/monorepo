import { Clock, Effect } from "effect";
import type { EventPointsStore } from "#src/events/kills/event-points.repository";
import { clipToWindow } from "#src/events/monitoring/tracking-window";

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

export const makeEventMemberPresenceStats = (
  repository: Pick<EventPointsStore, "findMaps" | "findPresenceLogs">,
) => {
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
      return Effect.succeed([]);
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

        const { start, end } = clipToWindow({
          start: log.startedAt,
          end: log.endedAt,
          windowStart: since ?? log.startedAt,
          windowEnd,
        });

        const duration = end.getTime() - start.getTime();

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

  function getMembersPresenceStatsPerMap(
    mapIds: string[],
    memberIds: number[],
    since?: Date,
    until?: Date,
  ) {
    if (mapIds.length === 0 || memberIds.length === 0) {
      return Effect.succeed([]);
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

          const { start, end } = clipToWindow({
            start: log.startedAt,
            end: log.endedAt,
            windowStart: since ?? log.startedAt,
            windowEnd,
          });

          const duration = end.getTime() - start.getTime();

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

  return {
    getMemberPresenceStats,
    getMembersPresenceStats,
    getMembersPresenceStatsPerMap,
  };
};
