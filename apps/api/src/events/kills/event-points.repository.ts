import { selectEventKillPoints } from "#src/events/kills/event-point-query";
import { randomUUID } from "node:crypto";

import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventPresenceLogTable,
  eventRankingTable,
  eventRespawnWindowSummaryTable,
  eventTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;

type RankingInsert = typeof eventRankingTable.$inferInsert;

type KillPointUpdate = Partial<typeof eventKillPointTable.$inferInsert>;

type RankingUpdate = Partial<typeof eventRankingTable.$inferInsert>;

export const makeEventPointsStore = (database: ApiDatabaseValue) => {
  function run<A>(
    operation: (database: Database) => Effect.Effect<A, unknown>,
  ) {
    return operation(database);
  }

  function findEvent(eventId: string, guildId?: string) {
    return run((database) =>
      database
        .select()
        .from(eventTable)
        .where(
          and(
            eq(eventTable.id, eventId),
            guildId ? eq(eventTable.guildId, guildId) : undefined,
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0] ?? null));
  }

  function findRankings(eventId: string) {
    return run((database) =>
      database
        .select()
        .from(eventRankingTable)
        .where(eq(eventRankingTable.eventId, eventId)),
    );
  }

  function findRankingByKey(
    eventId: string,
    memberId: number,
    heroNpcName: string,
  ) {
    return run((database) =>
      database
        .select()
        .from(eventRankingTable)
        .where(
          and(
            eq(eventRankingTable.eventId, eventId),
            eq(eventRankingTable.memberId, memberId),
            eq(eventRankingTable.heroNpcName, heroNpcName),
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0] ?? null));
  }

  function createRanking(data: Omit<RankingInsert, "id" | "updatedAt">) {
    return run((database) =>
      database
        .insert(eventRankingTable)
        .values({ ...data, id: randomUUID(), updatedAt: new Date() })
        .returning(),
    ).pipe(Effect.map((rows) => rows[0]));
  }

  function incrementRanking(
    id: string,
    points: number,
    time: number,
    afk: number,
    pointsModified: boolean,
  ) {
    return run((database) =>
      database
        .update(eventRankingTable)
        .set({
          totalPoints: sql`${eventRankingTable.totalPoints} + ${points}`,
          totalKills: sql`${eventRankingTable.totalKills} + 1`,
          totalTimeSeconds: sql`${eventRankingTable.totalTimeSeconds} + ${time}`,
          avgAfkPercentage: afk,
          pointsModified,
          updatedAt: new Date(),
        })
        .where(eq(eventRankingTable.id, id)),
    );
  }

  function findKillPointsForEvent(eventId: string) {
    return Effect.gen(function* () {
      const rows = yield* run((database) =>
        selectEventKillPoints(database).where(
          eq(eventHeroNpcTable.eventId, eventId),
        ),
      );

      const heroIds = [...new Set(rows.map(({ hero }) => hero.id))];

      const maps =
        heroIds.length === 0
          ? []
          : yield* run((database) =>
              database
                .select()
                .from(eventMapTable)
                .where(inArray(eventMapTable.heroNpcId, heroIds)),
            );

      return rows.map(({ point, kill, hero }) => ({
        ...point,
        kill: {
          ...kill,
          heroNpc: {
            ...hero,
            maps: maps
              .filter(({ heroNpcId }) => heroNpcId === hero.id)
              .map(({ id }) => ({ id })),
          },
        },
      }));
    });
  }

  function findWindowSummaries(killIds: string[]) {
    if (killIds.length === 0) return Effect.succeed([]);

    return run((database) =>
      database
        .select({
          killId: eventRespawnWindowSummaryTable.killId,
          windowOpenedAt: eventRespawnWindowSummaryTable.windowOpenedAt,
        })
        .from(eventRespawnWindowSummaryTable)
        .where(inArray(eventRespawnWindowSummaryTable.killId, killIds)),
    );
  }

  function findAssignments(
    mapIds: string[],
    memberIds: number[],
    latest: Date,
    earliest: Date,
  ) {
    if (mapIds.length === 0 || memberIds.length === 0)
      return Effect.succeed([]);

    return run((database) =>
      database
        .select({
          mapId: eventMapAssignmentHistoryTable.mapId,
          memberId: eventMapAssignmentHistoryTable.memberId,
          assignedAt: eventMapAssignmentHistoryTable.assignedAt,
          unassignedAt: eventMapAssignmentHistoryTable.unassignedAt,
        })
        .from(eventMapAssignmentHistoryTable)
        .where(
          and(
            inArray(eventMapAssignmentHistoryTable.mapId, mapIds),
            inArray(eventMapAssignmentHistoryTable.memberId, memberIds),
            lte(eventMapAssignmentHistoryTable.assignedAt, latest),
            or(
              isNull(eventMapAssignmentHistoryTable.unassignedAt),
              gte(eventMapAssignmentHistoryTable.unassignedAt, earliest),
            ),
          ),
        )
        .orderBy(asc(eventMapAssignmentHistoryTable.assignedAt)),
    );
  }

  function applyRecalculation(
    killPointUpdates: Array<{ id: string; data: KillPointUpdate }>,
    rankingUpdates: Array<
      | { kind: "update"; id: string; data: RankingUpdate }
      | { kind: "create"; data: Omit<RankingInsert, "id" | "updatedAt"> }
      | { kind: "delete"; id: string }
    >,
  ) {
    return run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          for (const item of killPointUpdates)
            yield* transaction
              .update(eventKillPointTable)
              .set(item.data)
              .where(eq(eventKillPointTable.id, item.id));

          for (const item of rankingUpdates) {
            if (item.kind === "update")
              yield* transaction
                .update(eventRankingTable)
                .set({
                  ...item.data,
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .where(eq(eventRankingTable.id, item.id));
            else if (item.kind === "create")
              yield* transaction.insert(eventRankingTable).values({
                ...item.data,
                id: randomUUID(),
                updatedAt: new Date(yield* Clock.currentTimeMillis),
              });
            else
              yield* transaction
                .delete(eventRankingTable)
                .where(eq(eventRankingTable.id, item.id));
          }
        }),
      ),
    );
  }

  function findMaps(heroNpcId: string) {
    return run((database) =>
      database
        .select({ id: eventMapTable.id, mapName: eventMapTable.mapName })
        .from(eventMapTable)
        .where(eq(eventMapTable.heroNpcId, heroNpcId)),
    );
  }

  function findPresenceLogs(
    mapIds: string[],
    memberIds: number[] | undefined,
    since?: Date,
  ) {
    if (mapIds.length === 0) return Effect.succeed([]);

    return run((database) =>
      database
        .select()
        .from(eventPresenceLogTable)
        .where(
          and(
            inArray(eventPresenceLogTable.mapId, mapIds),
            memberIds
              ? inArray(eventPresenceLogTable.memberId, memberIds)
              : undefined,
            since
              ? or(
                  gte(eventPresenceLogTable.startedAt, since),
                  gte(eventPresenceLogTable.endedAt, since),
                  and(
                    isNull(eventPresenceLogTable.endedAt),
                    lte(eventPresenceLogTable.startedAt, since),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          asc(eventPresenceLogTable.memberId),
          asc(eventPresenceLogTable.startedAt),
        ),
    );
  }

  return {
    applyRecalculation,
    createRanking,
    findAssignments,
    findEvent,
    findKillPointsForEvent,
    findMaps,
    findPresenceLogs,
    findRankingByKey,
    findRankings,
    findWindowSummaries,
    incrementRanking,
  };
};

export type EventPointsStore = ReturnType<typeof makeEventPointsStore>;
