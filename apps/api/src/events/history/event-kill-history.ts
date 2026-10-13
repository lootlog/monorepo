import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  memberTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import type { EventAccess } from "#src/events/event-access";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";
import type { EventPoints } from "#src/events/kills/event-points.service";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import {
  decodeHistoryCursor,
  encodeHistoryCursor,
  parseHistoryLimit,
  parseHistoryMemberId,
  type HistoryCursorScope,
} from "#src/events/history/event-kill-history.cursor";
import {
  makeEventKillHistoryProjection,
  normalizeKillPointTracking,
} from "#src/events/history/event-kill-history.projection";
import { KillHistoryResponse } from "#src/events/history/event-kill-history.schema";
import {
  makeEventKillHistoryStore,
  type LeanHistoryRow,
} from "#src/events/history/event-kill-history.store";

export type HistoryContext = {
  guildId: string;
  eventId: string;
  roles: Array<typeof roleTable.$inferSelect>;
  accessPolicy: AccessPolicy;
};

export type HistoryQuery = {
  limit?: string;
  cursor?: string;
  heroId?: string;
  memberId?: string;
};

type Dependencies = {
  database: ApiDatabaseValue;
  eventAccess: EventAccess;
  readCache: EventReadCache;
  points: Pick<EventPoints, "getMembersPresenceStatsPerMap">;
};

const toHistorySummary = ({
  kill,
  heroNpc,
  participantCount,
}: LeanHistoryRow) => ({
  id: kill.id,
  heroNpcId: kill.heroNpcId,
  killedAt: kill.killedAt,
  minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
  maxSpawnTimeAtKill: kill.maxSpawnTimeAtKill,
  isManualClose: kill.isManualClose,
  heroNpc,
  participantCount,
});

export const makeEventKillHistory = ({
  database,
  eventAccess,
  readCache,
  points,
}: Dependencies) => {
  const authorize = Effect.fnUntraced(function* (
    context: HistoryContext,
    query: Pick<HistoryQuery, "heroId" | "memberId">,
  ) {
    const memberId =
      query.memberId === undefined
        ? undefined
        : yield* parseHistoryMemberId(query.memberId);

    const rows = yield* database
      .select({ id: eventTable.id, hero: eventHeroNpcTable })
      .from(eventTable)
      .leftJoin(eventHeroNpcTable, eq(eventHeroNpcTable.eventId, eventTable.id))
      .where(
        and(
          eq(eventTable.guildId, context.guildId),
          eq(eventTable.id, context.eventId),
        ),
      );

    if (rows.length === 0)
      return yield* Effect.fail(new ResourceNotFoundError("Event not found"));

    const visibleHeroes = rows.flatMap(({ hero }) =>
      hero &&
      eventAccess.isHeroVisible(hero, context.roles, context.accessPolicy)
        ? [hero]
        : [],
    );

    if (
      query.heroId !== undefined &&
      !visibleHeroes.some((hero) => hero.id === query.heroId)
    )
      return yield* Effect.fail(new ResourceNotFoundError("Hero not found"));

    const heroIds = visibleHeroes
      .filter((hero) => query.heroId === undefined || hero.id === query.heroId)
      .map((hero) => hero.id)
      .sort();

    const members =
      memberId === undefined
        ? []
        : yield* database
            .select({
              id: memberTable.id,
              name: memberTable.name,
              avatar: memberTable.avatar,
              userId: memberTable.userId,
            })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.guildId, context.guildId),
                eq(memberTable.id, memberId),
              ),
            )
            .limit(1);

    const member = members[0];

    if (memberId !== undefined && !member)
      return yield* Effect.fail(new ResourceNotFoundError("Member not found"));

    const scope: HistoryCursorScope = {
      guildId: context.guildId,
      eventId: context.eventId,
      heroId: query.heroId ?? null,
      memberId: memberId ?? null,
    };

    const store = makeEventKillHistoryStore(database, {
      guildId: context.guildId,
      eventId: context.eventId,
      heroIds,
    });

    return {
      scope,
      heroIds,
      memberId,
      member,
      store,
      projection: makeEventKillHistoryProjection(store, points),
    };
  });

  const list = Effect.fn("events.history.list")(function* (
    context: HistoryContext,
    query: HistoryQuery,
  ) {
    const limit = yield* parseHistoryLimit(query.limit);
    const authorized = yield* authorize(context, query);

    const boundary =
      query.cursor === undefined
        ? undefined
        : yield* decodeHistoryCursor(query.cursor, authorized.scope);

    return yield* readCache.getOrSet(
      readCache.getEventEntry(
        context.guildId,
        context.eventId,
        "kill-history:v1",
        {
          ...authorized.scope,
          visibleHeroIds: authorized.heroIds,
          limit,
          cursor: query.cursor,
        },
      ),
      KillHistoryResponse,
      () =>
        Effect.gen(function* () {
          const result = yield* authorized.store.findLeanPage({
            limit,
            boundary,
            memberId: authorized.memberId,
          });

          const last = result.rows.at(-1)?.kill;

          const nextCursor =
            result.hasMore && last
              ? encodeHistoryCursor(last, authorized.scope)
              : null;

          if (result.kind === "member") {
            if (!authorized.member)
              return yield* Effect.die(
                new Error("Member history requires an authorized member"),
              );

            return {
              kind: "member" as const,
              member: authorized.member,
              data: result.rows.map((row) => ({
                ...toHistorySummary(row),
                memberPoint: normalizeKillPointTracking(
                  row.memberPoint,
                  row.kill.killedAt,
                  row.kill.minSpawnTimeAtKill,
                ),
              })),
              nextCursor,
            };
          }

          return {
            kind: "event" as const,
            data: result.rows.map(toHistorySummary),
            nextCursor,
          };
        }),
    );
  });

  const detail = Effect.fn("events.history.detail")(function* (
    context: HistoryContext,
    query: { heroId: string; killId: string },
  ) {
    const authorized = yield* authorize(context, { heroId: query.heroId });

    return yield* authorized.projection.detail(query.heroId, query.killId);
  });

  const timeline = Effect.fn("events.history.timeline")(function* (
    context: HistoryContext,
    query: { heroId: string; killId: string },
  ) {
    const authorized = yield* authorize(context, { heroId: query.heroId });

    return yield* authorized.projection.timeline(query.heroId, query.killId);
  });

  return { list, detail, timeline };
};

export type EventKillHistory = ReturnType<typeof makeEventKillHistory>;
