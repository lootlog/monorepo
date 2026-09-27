import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { groupBy } from "es-toolkit";
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
import {
  EventKillHistoryResponse,
  EventMemberKillHistoryResponse,
} from "#src/events/kills/event-kill-response.schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import {
  decodeHistoryCursor,
  decodeLegacyHistoryCursor,
  encodeHistoryCursor,
  parseHistoryLimit,
  parseHistoryMemberId,
  type HistoryBoundary,
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

          const hasMore = result.rows.length > limit;

          const last =
            result.rows[Math.min(result.rows.length, limit) - 1]?.kill;

          const nextCursor =
            hasMore && last
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
              data: result.rows.slice(0, limit).map((row) => ({
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
            data: result.rows.slice(0, limit).map(toHistorySummary),
            nextCursor,
          };
        }),
    );
  });

  // TODO(kill-history-legacy): Remove legacyPage, prepareLegacy, legacyEvent and legacyMember
  // after client retirement; see README.md. Keep list, detail, timeline and their shared authorization.
  const legacyPage = Effect.fnUntraced(function* (
    authorized: Effect.Success<ReturnType<typeof authorize>>,
    limit: number,
    boundary?: HistoryBoundary,
  ) {
    const { kills, hasMore } = yield* authorized.store.findPage({
      limit,
      boundary,
      memberId: authorized.memberId,
    });

    const [heroes, pointRows] = yield* Effect.all([
      authorized.store.findHeroes(),
      authorized.store.findPoints(
        kills.map((kill) => kill.id),
        authorized.memberId,
      ),
    ]);

    const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
    const pointsByKill = groupBy(pointRows, (point) => point.killId);

    const entries = kills.flatMap((kill) => {
      const heroNpc = heroById.get(kill.heroNpcId);

      return heroNpc
        ? [{ ...kill, heroNpc, points: pointsByKill[kill.id] ?? [] }]
        : [];
    });

    const windows =
      yield* authorized.projection.getEffectiveWindowStartByKillId(entries);

    const mapData =
      yield* authorized.projection.buildKillPointMapDataByKillMember(
        entries,
        windows,
      );

    return {
      data: entries.map((kill) => ({
        ...kill,
        points: kill.points.map((point) => ({
          ...point,
          mapData: mapData.get(`${kill.id}:${point.memberId}`) ?? [],
        })),
      })),
      nextCursor: hasMore ? (kills.at(-1)?.id ?? null) : null,
    };
  });

  const prepareLegacy = Effect.fnUntraced(function* (
    context: HistoryContext,
    query: HistoryQuery,
  ) {
    const limit = yield* parseHistoryLimit(query.limit);
    const authorized = yield* authorize(context, query);

    const cursor =
      query.cursor === undefined
        ? undefined
        : yield* decodeLegacyHistoryCursor(query.cursor);

    const boundary =
      cursor === undefined
        ? undefined
        : yield* authorized.store.findAnchor(cursor, authorized.memberId);

    if (query.cursor !== undefined && !boundary)
      return yield* Effect.fail(new InvalidRequestError("Invalid cursor"));

    return { authorized, limit, boundary };
  });

  const legacyEvent = Effect.fn("events.history.legacyEvent")(function* (
    context: HistoryContext,
    query: Omit<HistoryQuery, "memberId">,
  ) {
    const { authorized, limit, boundary } = yield* prepareLegacy(
      context,
      query,
    );

    return yield* readCache.getOrSet(
      readCache.getEventEntry(
        context.guildId,
        context.eventId,
        "legacy-kill-history:v3",
        {
          ...authorized.scope,
          visibleHeroIds: authorized.heroIds,
          limit,
          cursor: query.cursor,
        },
      ),
      EventKillHistoryResponse,
      () => legacyPage(authorized, limit, boundary),
    );
  });

  const legacyMember = Effect.fn("events.history.legacyMember")(function* (
    context: HistoryContext,
    query: HistoryQuery & { memberId: string },
  ) {
    const { authorized, limit, boundary } = yield* prepareLegacy(
      context,
      query,
    );

    const member = authorized.member;

    if (!member)
      return yield* Effect.fail(new ResourceNotFoundError("Member not found"));

    return yield* readCache.getOrSet(
      readCache.getEventEntry(
        context.guildId,
        context.eventId,
        "legacy-member-kill-history:v3",
        {
          ...authorized.scope,
          visibleHeroIds: authorized.heroIds,
          limit,
          cursor: query.cursor,
        },
      ),
      EventMemberKillHistoryResponse,
      () =>
        legacyPage(authorized, limit, boundary).pipe(
          Effect.map(({ data, nextCursor }) => ({
            member,
            data: data.map(({ points: killPoints, ...kill }) => ({
              ...kill,
              memberPoint: killPoints[0]
                ? normalizeKillPointTracking(
                    killPoints[0],
                    kill.killedAt,
                    kill.minSpawnTimeAtKill,
                  )
                : null,
            })),
            nextCursor,
          })),
        ),
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

  return { list, legacyEvent, legacyMember, detail, timeline };
};

export type EventKillHistory = ReturnType<typeof makeEventKillHistory>;
