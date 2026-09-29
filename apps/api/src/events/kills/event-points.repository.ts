import { selectEventKillPoints } from "#src/events/kills/event-point-query";
import { randomUUID } from "node:crypto";

import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { Clock, Effect } from "effect";
import { chunk, sortBy } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
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

/** Keeps each ranking upsert well below PostgreSQL's bind-parameter limit. */
const RANKING_UPSERT_BATCH_SIZE = 500;

const excluded = (column: PgColumn) =>
  sql`excluded.${sql.identifier(column.name)}`;

const increment = (column: PgColumn) => sql`${column} + ${excluded(column)}`;

/**
 * Adds a proposed ranking row to the current one inside the upsert, so
 * concurrent kills for the same member accumulate instead of overwriting each
 * other. The AFK average stays a running average rounded to two decimals, as
 * `Math.round(value * 100) / 100` would.
 */
const addKillToCurrentRanking = {
  totalPoints: increment(eventRankingTable.totalPoints),
  totalKills: increment(eventRankingTable.totalKills),
  totalTimeSeconds: increment(eventRankingTable.totalTimeSeconds),
  avgAfkPercentage: sql`floor(((${eventRankingTable.avgAfkPercentage} * ${eventRankingTable.totalKills} + ${excluded(eventRankingTable.avgAfkPercentage)} * ${excluded(eventRankingTable.totalKills)}) / (${eventRankingTable.totalKills} + ${excluded(eventRankingTable.totalKills)})) * 100 + 0.5) / 100`,
  pointsModified: sql`${eventRankingTable.pointsModified} or ${excluded(eventRankingTable.pointsModified)}`,
  updatedAt: excluded(eventRankingTable.updatedAt),
};

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

  /**
   * Adds one kill's points to the name-keyed rankings. The kill row is locked
   * for the transaction, so a concurrent hero deletion either waits for these
   * writes and then removes them, or has already removed the kill and no
   * ranking is written.
   */
  function addKillToRankings(
    eventId: string,
    heroNpcName: string,
    killId: string,
    entries: ReadonlyArray<{
      memberId: number;
      points: number;
      trackingSeconds: number;
      afkPercentage: number;
      pointsModified: boolean;
    }>,
  ) {
    return run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const kills = yield* transaction
            .select({ id: eventHeroKillTable.id })
            .from(eventHeroKillTable)
            .where(eq(eventHeroKillTable.id, killId))
            .for("share");

          if (kills.length === 0) return false;

          const now = new Date(yield* Clock.currentTimeMillis);

          // Rows are locked in conflict-key order so concurrent kills sharing
          // members cannot deadlock.
          const rows = sortBy(entries, ["memberId"]).map((entry) => ({
            id: randomUUID(),
            eventId,
            memberId: entry.memberId,
            heroNpcName,
            totalPoints: entry.points,
            totalKills: 1,
            totalTimeSeconds: entry.trackingSeconds,
            avgAfkPercentage: entry.afkPercentage,
            pointsModified: entry.pointsModified,
            updatedAt: now,
          }));

          for (const batch of chunk(rows, RANKING_UPSERT_BATCH_SIZE))
            yield* transaction
              .insert(eventRankingTable)
              .values(batch)
              .onConflictDoUpdate({
                target: [
                  eventRankingTable.eventId,
                  eventRankingTable.memberId,
                  eventRankingTable.heroNpcName,
                ],
                set: addKillToCurrentRanking,
              });

          return true;
        }),
      ),
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
    addKillToRankings,
    applyRecalculation,
    findAssignments,
    findEvent,
    findKillPointsForEvent,
    findMaps,
    findPresenceLogs,
    findRankings,
    findWindowSummaries,
  };
};

export type EventPointsStore = ReturnType<typeof makeEventPointsStore>;
