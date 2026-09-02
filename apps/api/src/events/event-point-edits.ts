import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventPointsEditHistoryTable,
  eventRankingTable,
  eventTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { RedisService } from "#src/redis/redis.service";
import { NotFoundException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "./dto/update-points.dto.js";

export class EventPointEditError extends TaggedErrorClass<EventPointEditError>()(
  "EventPointEditError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface EventRankingPublisher {
  readonly publish: (
    routingKey: RoutingKey,
    payload: unknown,
  ) => Effect.Effect<void, unknown>;
}

const roundPoints = (value: number) => Math.round(value * 10_000) / 10_000;
const normalizeComment = (comment?: string | null) => {
  const trimmed = comment?.trim();
  return trimmed ? trimmed : null;
};
const countedInRanking = (point: {
  confirmationDeadlineAt: Date | null;
  confirmedAt: Date | null;
}) =>
  point.confirmationDeadlineAt === null ||
  (point.confirmedAt !== null &&
    point.confirmedAt.getTime() <= point.confirmationDeadlineAt.getTime());

export const makeEventPointEdits = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  publisher: EventRankingPublisher,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new EventPointEditError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.points.drizzle", retryCount: 0 },
      }),
    );
  const afterEdit = (guildId: string, eventId: string) =>
    Effect.all(
      [
        Effect.forEach(
          [
            `event-read:v2:${guildId}:guild:*`,
            `event-read:v2:${guildId}:${eventId}:*`,
          ],
          (pattern) =>
            Effect.tryPromise({
              try: () => redis.deleteByPattern(pattern),
              catch: (error) => error,
            }).pipe(
              Effect.catch((error) =>
                Effect.sync(() =>
                  logger.warn("Failed to invalidate event ranking cache", {
                    error,
                    pattern,
                  }),
                ),
              ),
            ),
          { concurrency: "unbounded", discard: true },
        ),
        publisher
          .publish(RoutingKey.EVENT_RANKING_UPDATE, { guildId, eventId })
          .pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                logger.warn("Failed to publish event ranking update", {
                  error,
                }),
              ),
            ),
            Effect.withSpan("events.points.publish", {
              attributes: { adapter: "events.rabbitmq", retryCount: 0 },
            }),
          ),
      ],
      { concurrency: "unbounded", discard: true },
    );

  return {
    updateRanking: (
      guild: { id: string },
      eventId: string,
      rankingId: string,
      data: UpdateRankingPointsDto,
      userId: string,
    ) =>
      Effect.gen(function* () {
        const scoped = yield* query(
          "events.points.updateRanking.find",
          database
            .select({ ranking: eventRankingTable })
            .from(eventRankingTable)
            .innerJoin(eventTable, eq(eventTable.id, eventRankingTable.eventId))
            .where(
              and(
                eq(eventRankingTable.id, rankingId),
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
              ),
            )
            .limit(1),
        );
        const ranking = scoped[0]?.ranking;
        if (!ranking)
          return yield* Effect.fail(new NotFoundException("Ranking not found"));
        const delta = roundPoints(data.pointsDelta);
        if (delta === 0) return ranking;
        const totalPoints = roundPoints(ranking.totalPoints + delta);
        const manualAdjustmentPoints = roundPoints(
          ranking.manualAdjustmentPoints + delta,
        );
        const manualPoints = yield* query(
          "events.points.updateRanking.manualKillPoints",
          database
            .select({
              confirmationDeadlineAt:
                eventKillPointTable.confirmationDeadlineAt,
              confirmedAt: eventKillPointTable.confirmedAt,
            })
            .from(eventKillPointTable)
            .innerJoin(
              eventHeroKillTable,
              eq(eventHeroKillTable.id, eventKillPointTable.killId),
            )
            .innerJoin(
              eventHeroNpcTable,
              eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
            )
            .where(
              and(
                eq(eventKillPointTable.memberId, ranking.memberId),
                ne(eventKillPointTable.manualAdjustmentPoints, 0),
                eq(eventHeroNpcTable.eventId, eventId),
                eq(eventHeroNpcTable.npcName, ranking.heroNpcName),
              ),
            ),
        );
        const updated = yield* query(
          "events.points.updateRanking.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.insert(eventPointsEditHistoryTable).values({
                id: randomUUID(),
                rankingId,
                previousPoints: ranking.totalPoints,
                newPoints: totalPoints,
                editType: "RANKING",
                editedByUserId: userId,
                comment: normalizeComment(data.comment),
              });
              const rows = yield* transaction
                .update(eventRankingTable)
                .set({
                  totalPoints,
                  manualAdjustmentPoints,
                  pointsModified:
                    manualAdjustmentPoints !== 0 ||
                    manualPoints.some(countedInRanking),
                  updatedAt: new Date(),
                })
                .where(eq(eventRankingTable.id, rankingId))
                .returning();
              return rows[0];
            }),
          ),
        );
        yield* afterEdit(guild.id, eventId);
        return updated;
      }).pipe(Effect.withSpan("EventsRankingController_updateRankingPoints")),

    updateKillPoint: (
      guild: { id: string },
      eventId: string,
      killId: string,
      killPointId: string,
      data: UpdateKillPointDto,
      userId: string,
    ) =>
      Effect.gen(function* () {
        const scoped = yield* query(
          "events.points.updateKillPoint.find",
          database
            .select({
              point: eventKillPointTable,
              kill: eventHeroKillTable,
              hero: eventHeroNpcTable,
            })
            .from(eventKillPointTable)
            .innerJoin(
              eventHeroKillTable,
              eq(eventHeroKillTable.id, eventKillPointTable.killId),
            )
            .innerJoin(
              eventHeroNpcTable,
              eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
            )
            .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
            .where(
              and(
                eq(eventKillPointTable.id, killPointId),
                eq(eventHeroKillTable.id, killId),
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
              ),
            )
            .limit(1),
        );
        const row = scoped[0];
        if (!row)
          return yield* Effect.fail(
            new NotFoundException("Kill point not found"),
          );
        const delta = roundPoints(data.pointsDelta);
        if (delta === 0)
          return { ...row.point, kill: { ...row.kill, heroNpc: row.hero } };
        const points = roundPoints(row.point.points + delta);
        const manualAdjustmentPoints = roundPoints(
          row.point.manualAdjustmentPoints + delta,
        );
        const rankingRows = countedInRanking(row.point)
          ? yield* query(
              "events.points.updateKillPoint.ranking",
              database
                .select()
                .from(eventRankingTable)
                .where(
                  and(
                    eq(eventRankingTable.eventId, eventId),
                    eq(eventRankingTable.memberId, row.point.memberId),
                    eq(eventRankingTable.heroNpcName, row.hero.npcName),
                  ),
                )
                .limit(1),
            )
          : [];
        const updated = yield* query(
          "events.points.updateKillPoint.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              const pointsRows = yield* transaction
                .update(eventKillPointTable)
                .set({ points, manualAdjustmentPoints })
                .where(eq(eventKillPointTable.id, killPointId))
                .returning();
              const ranking = rankingRows[0];
              if (ranking) {
                const rankingPoints = roundPoints(ranking.totalPoints + delta);
                yield* transaction
                  .update(eventRankingTable)
                  .set({
                    totalPoints: rankingPoints,
                    pointsModified: true,
                    updatedAt: new Date(),
                  })
                  .where(eq(eventRankingTable.id, ranking.id));
                yield* transaction.insert(eventPointsEditHistoryTable).values({
                  id: randomUUID(),
                  rankingId: ranking.id,
                  previousPoints: ranking.totalPoints,
                  newPoints: rankingPoints,
                  editType: "KILL_POINT",
                  editedByUserId: userId,
                  comment: normalizeComment(data.comment),
                });
              }
              return pointsRows[0];
            }),
          ),
        );
        if (countedInRanking(row.point)) yield* afterEdit(guild.id, eventId);
        return updated;
      }).pipe(Effect.withSpan("EventsRankingController_updateKillPoint")),
  };
};

export type EventPointEdits = ReturnType<typeof makeEventPointEdits>;
