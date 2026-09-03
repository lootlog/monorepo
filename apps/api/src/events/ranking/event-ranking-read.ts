import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventPointsEditHistoryTable,
  eventRankingTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { isoDatetimeCodec } from "#src/shared/schema/response-codecs";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";

const roundPoints = (value: number) =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const CachedEventRankingResponse = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    eventId: Schema.String,
    memberId: Schema.Number,
    heroNpcName: Schema.String,
    totalPoints: Schema.Number,
    manualAdjustmentPoints: Schema.Number,
    totalKills: Schema.Number,
    totalTimeSeconds: Schema.Number,
    avgAfkPercentage: Schema.Number,
    pointsModified: Schema.Boolean,
    updatedAt: isoDatetimeCodec,
    member: Schema.Struct({
      id: Schema.Number,
      name: Schema.String,
      roles: Schema.Array(
        Schema.Struct({
          position: Schema.Number,
          color: Schema.NullOr(Schema.Number),
        }),
      ),
    }),
  }),
);

export const makeEventRankingRead = (
  database: typeof ApiDatabase.Service,
  cache: EventReadCache,
) => {
  const getRankingUncached = (guildId: string, eventId: string) =>
    Effect.gen(function* () {
      const eventRows = yield* database
        .select({ id: eventTable.id })
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1);
      if (!eventRows[0]) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }
      const rows = yield* database
        .select({ ranking: eventRankingTable, member: memberTable })
        .from(eventRankingTable)
        .innerJoin(memberTable, eq(memberTable.id, eventRankingTable.memberId))
        .where(eq(eventRankingTable.eventId, eventId))
        .orderBy(desc(eventRankingTable.totalPoints));
      const memberIds = rows.map(({ member }) => member.id);
      const roles =
        memberIds.length === 0
          ? []
          : yield* database
              .select({
                memberId: memberToRoleTable.A,
                position: roleTable.position,
                color: roleTable.color,
              })
              .from(memberToRoleTable)
              .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
              .where(inArray(memberToRoleTable.A, memberIds))
              .orderBy(desc(roleTable.position));
      return rows.map(({ ranking, member }) => ({
        ...ranking,
        member: {
          id: member.id,
          name: member.name,
          roles: roles
            .filter(({ memberId }) => memberId === member.id)
            .slice(0, 1)
            .map(({ position, color }) => ({ position, color })),
        },
      }));
    }).pipe(
      Effect.withSpan("events.ranking.read.load", {
        attributes: { adapter: "events.ranking.drizzle", retryCount: 0 },
      }),
    );

  return {
    getRanking(guildId: string, eventId: string) {
      const key = cache.getEventKey(guildId, eventId, "ranking");
      return cache
        .getOrSet(key, CachedEventRankingResponse, () =>
          getRankingUncached(guildId, eventId),
        )
        .pipe(Effect.withSpan("events.ranking.read"));
    },

    getEditHistories(guildId: string, eventId: string, rankingIds: string[]) {
      if (rankingIds.length === 0) return Effect.succeed(new Map());
      return Effect.gen(function* () {
        const histories = yield* database
          .select({ history: eventPointsEditHistoryTable })
          .from(eventPointsEditHistoryTable)
          .innerJoin(
            eventRankingTable,
            eq(eventRankingTable.id, eventPointsEditHistoryTable.rankingId),
          )
          .innerJoin(eventTable, eq(eventTable.id, eventRankingTable.eventId))
          .where(
            and(
              inArray(eventPointsEditHistoryTable.rankingId, rankingIds),
              eq(eventTable.id, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .orderBy(desc(eventPointsEditHistoryTable.editedAt))
          .pipe(Effect.map((rows) => rows.map(({ history }) => history)));
        const editorIds = [
          ...new Set(histories.map((row) => row.editedByUserId)),
        ];
        const editors =
          editorIds.length === 0
            ? []
            : yield* database
                .select({
                  globalUserId: memberTable.globalUserId,
                  name: memberTable.name,
                })
                .from(memberTable)
                .where(
                  and(
                    eq(memberTable.guildId, guildId),
                    inArray(memberTable.globalUserId, editorIds),
                  ),
                );
        const names = new Map(
          editors.flatMap((editor) =>
            editor.globalUserId
              ? [[editor.globalUserId, editor.name] as const]
              : [],
          ),
        );
        const grouped = new Map<
          string,
          Array<
            (typeof histories)[number] & {
              deltaPoints: number;
              editedByName: string | null;
            }
          >
        >();
        for (const history of histories) {
          const entry = {
            ...history,
            deltaPoints: roundPoints(
              history.newPoints - history.previousPoints,
            ),
            editedByName: names.get(history.editedByUserId) ?? null,
          };
          const entries = grouped.get(history.rankingId) ?? [];
          entries.push(entry);
          grouped.set(history.rankingId, entries);
        }
        return grouped;
      }).pipe(
        Effect.withSpan("events.ranking.editHistory", {
          attributes: { adapter: "events.ranking.drizzle", retryCount: 0 },
        }),
      );
    },
  };
};

export type EventRankingRead = ReturnType<typeof makeEventRankingRead>;
