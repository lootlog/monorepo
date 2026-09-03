import { and, asc, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventMapToMemberTable,
  eventPresenceLogTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { HeroPresenceStatsResponse } from "#src/events/monitoring/event-monitoring-response.schema";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";

export const makeEventPresenceStats = (
  database: typeof ApiDatabase.Service,
  cache: EventReadCache,
) => {
  const load = (guildId: string, eventId: string, heroNpcId: string) =>
    Effect.gen(function* () {
      const heroRows = yield* database
        .select({ hero: eventHeroNpcTable, event: eventTable })
        .from(eventHeroNpcTable)
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventHeroNpcTable.id, heroNpcId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1);
      const hero = heroRows[0];
      if (!hero) {
        return yield* Effect.fail(new ResourceNotFoundError("Hero not found"));
      }

      const maps = yield* database
        .select({ id: eventMapTable.id })
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId));
      const mapIds = maps.map(({ id }) => id);
      const [assignments, presenceRows] = yield* Effect.all(
        mapIds.length === 0
          ? [Effect.succeed([]), Effect.succeed([])]
          : [
              database
                .select({ member: memberTable })
                .from(eventMapToMemberTable)
                .innerJoin(
                  memberTable,
                  eq(memberTable.id, eventMapToMemberTable.B),
                )
                .where(inArray(eventMapToMemberTable.A, mapIds)),
              database
                .select({ log: eventPresenceLogTable, member: memberTable })
                .from(eventPresenceLogTable)
                .innerJoin(
                  memberTable,
                  eq(memberTable.id, eventPresenceLogTable.memberId),
                )
                .where(inArray(eventPresenceLogTable.mapId, mapIds))
                .orderBy(asc(eventPresenceLogTable.startedAt)),
            ],
        { concurrency: "unbounded" },
      );

      const eventStart = hero.event.startsAt ?? hero.event.createdAt;
      const eventEnd =
        hero.event.endsAt ?? new Date(yield* Clock.currentTimeMillis);
      const totalEventSeconds = Math.max(
        0,
        Math.round((eventEnd.getTime() - eventStart.getTime()) / 1000),
      );
      const memberStats = new Map<
        number,
        {
          memberId: number;
          memberName: string;
          memberAvatar: string | null;
          totalTimeMs: number;
          afkTimeMs: number;
        }
      >();
      for (const { member } of assignments) {
        memberStats.set(member.id, {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        });
      }

      const now = new Date(yield* Clock.currentTimeMillis);
      let totalCoverageMs = 0;
      for (const { log, member } of presenceRows) {
        const duration = Math.max(
          0,
          (log.endedAt ?? now).getTime() - log.startedAt.getTime(),
        );
        if (!log.isAfk) totalCoverageMs += duration;
        const stats = memberStats.get(log.memberId) ?? {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        };
        stats.totalTimeMs += duration;
        if (log.isAfk) stats.afkTimeMs += duration;
        memberStats.set(log.memberId, stats);
      }

      const totalCoverageSeconds = Math.round(totalCoverageMs / 1000);
      return {
        totalCoverageSeconds,
        totalEventSeconds,
        presencePercentage:
          totalEventSeconds > 0
            ? Math.round((totalCoverageSeconds / totalEventSeconds) * 10_000) /
              100
            : 0,
        memberStats: [...memberStats.values()]
          .map((stats) => ({
            memberId: stats.memberId,
            memberName: stats.memberName,
            memberAvatar: stats.memberAvatar,
            totalTimeSeconds: Math.round(stats.totalTimeMs / 1000),
            afkTimeSeconds: Math.round(stats.afkTimeMs / 1000),
            afkPercentage:
              stats.totalTimeMs > 0
                ? Math.round((stats.afkTimeMs / stats.totalTimeMs) * 10_000) /
                  100
                : 0,
          }))
          .sort(
            (left, right) => right.totalTimeSeconds - left.totalTimeSeconds,
          ),
      };
    }).pipe(
      Effect.withSpan("events.presence.heroStats.load", {
        attributes: { adapter: "events.presence.drizzle", retryCount: 0 },
      }),
    );

  return {
    get(guildId: string, eventId: string, heroNpcId: string) {
      const key = cache.getEventKey(guildId, eventId, "hero-presence", {
        heroNpcId,
      });
      return cache
        .getOrSet(key, HeroPresenceStatsResponse, () =>
          load(guildId, eventId, heroNpcId),
        )
        .pipe(Effect.withSpan("events.presence.heroStats"));
    },
  };
};

export type EventPresenceStats = ReturnType<typeof makeEventPresenceStats>;
