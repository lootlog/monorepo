import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventKillPointTable,
  eventRankingTable,
  eventTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { RedisService } from "#src/redis/redis.service";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { AcknowledgeExpiredParticipationConfirmationsDto } from "#src/http-api/contracts/events/schemas";
import type { EventRankingPublisher } from "./event-point-edits.js";

export class EventParticipationError extends TaggedErrorClass<EventParticipationError>()(
  "EventParticipationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventParticipation = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  publisher: EventRankingPublisher,
  logger: Logger,
) => {
  type ParticipationRow = {
    point: typeof eventKillPointTable.$inferSelect;
    kill: typeof eventHeroKillTable.$inferSelect;
    hero: typeof eventHeroNpcTable.$inferSelect;
  };
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventParticipationError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.participation.drizzle", retryCount: 0 },
      }),
    );
  const participationPoints = (
    eventId: string,
    memberId: number,
    now: Date,
    expired: boolean,
  ) =>
    query(
      expired ? "events.participation.expired" : "events.participation.pending",
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
        .where(
          and(
            eq(eventKillPointTable.memberId, memberId),
            isNull(eventKillPointTable.confirmedAt),
            expired
              ? isNull(eventKillPointTable.confirmationExpiredAcknowledgedAt)
              : undefined,
            expired
              ? lt(eventKillPointTable.confirmationDeadlineAt, now)
              : gte(eventKillPointTable.confirmationDeadlineAt, now),
            eq(eventHeroNpcTable.eventId, eventId),
          ),
        )
        .orderBy(
          expired
            ? desc(eventKillPointTable.confirmationDeadlineAt)
            : asc(eventKillPointTable.confirmationDeadlineAt),
        ),
    );
  const dedupe = (rows: ParticipationRow[]) => {
    const items = new Map<
      string,
      {
        killId: string;
        killedAt: Date;
        confirmationDeadlineAt: Date;
        heroNpc: typeof eventHeroNpcTable.$inferSelect;
      }
    >();
    for (const { point, kill, hero } of rows) {
      if (point.confirmationDeadlineAt && !items.has(point.killId)) {
        items.set(point.killId, {
          killId: point.killId,
          killedAt: kill.killedAt,
          confirmationDeadlineAt: point.confirmationDeadlineAt,
          heroNpc: hero,
        });
      }
    }
    return [...items.values()];
  };
  const afterConfirmation = (guildId: string, eventId: string) =>
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
                  logger.warn("Failed to invalidate participation cache", {
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
                logger.warn("Failed to publish participation ranking update", {
                  error,
                }),
              ),
            ),
          ),
      ],
      { concurrency: "unbounded", discard: true },
    );

  return {
    getPending: (
      guild: { id: string },
      eventId: string,
      member: { id: number },
    ) =>
      Effect.gen(function* () {
        const eventRows = yield* query(
          "events.participation.event",
          database
            .select({ id: eventTable.id })
            .from(eventTable)
            .where(
              and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
            )
            .limit(1),
        );
        if (!eventRows[0])
          return yield* Effect.fail(
            new ResourceNotFoundError("Event not found"),
          );
        const now = new Date(yield* Clock.currentTimeMillis);
        const [pending, expired] = yield* Effect.all(
          [
            participationPoints(eventId, member.id, now, false),
            participationPoints(eventId, member.id, now, true),
          ],
          { concurrency: "unbounded" },
        );
        return { items: dedupe(pending), expiredItems: dedupe(expired) };
      }).pipe(
        Effect.withSpan(
          "EventsRankingController_getPendingParticipationConfirmations",
        ),
      ),

    acknowledgeExpired: (
      guild: { id: string },
      eventId: string,
      member: { id: number },
      data: AcknowledgeExpiredParticipationConfirmationsDto,
    ) =>
      query(
        "events.participation.acknowledgeExpired",
        database
          .update(eventKillPointTable)
          .set({ confirmationExpiredAcknowledgedAt: new Date() })
          .from(eventHeroKillTable)
          .innerJoin(
            eventHeroNpcTable,
            eq(eventHeroNpcTable.id, eventHeroKillTable.heroNpcId),
          )
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              inArray(eventKillPointTable.killId, data.killIds),
              eq(eventKillPointTable.memberId, member.id),
              isNull(eventKillPointTable.confirmedAt),
              lt(eventKillPointTable.confirmationDeadlineAt, new Date()),
              isNull(eventKillPointTable.confirmationExpiredAcknowledgedAt),
              eq(eventTable.id, eventId),
              eq(eventTable.guildId, guild.id),
            ),
          )
          .returning({ id: eventKillPointTable.id }),
      ).pipe(
        Effect.map((rows) => ({ acknowledgedCount: rows.length })),
        Effect.withSpan(
          "EventsRankingController_acknowledgeExpiredParticipationConfirmations",
        ),
      ),

    confirm: (
      guild: { id: string },
      eventId: string,
      killId: string,
      member: { id: number },
    ) =>
      Effect.gen(function* () {
        const rows = yield* query(
          "events.participation.confirm.find",
          database
            .select({
              point: eventKillPointTable,
              heroName: eventHeroNpcTable.npcName,
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
                eq(eventKillPointTable.killId, killId),
                eq(eventKillPointTable.memberId, member.id),
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
              ),
            ),
        );
        if (rows.length === 0) {
          return yield* Effect.fail(
            new ResourceNotFoundError("Kill point not found"),
          );
        }
        const unconfirmed = rows.filter(
          ({ point }) => point.confirmedAt === null,
        );
        if (unconfirmed.length === 0) {
          return { success: true as const, confirmedNow: false };
        }
        const now = new Date(yield* Clock.currentTimeMillis);
        if (
          unconfirmed.some(
            ({ point }) =>
              point.confirmationDeadlineAt !== null &&
              point.confirmationDeadlineAt < now,
          )
        ) {
          return yield* Effect.fail(
            new InvalidRequestError("Confirmation window has expired"),
          );
        }
        const confirmable = unconfirmed.filter(
          ({ point }) => point.confirmationDeadlineAt !== null,
        );
        if (confirmable.length === 0) {
          return { success: true as const, confirmedNow: false };
        }
        yield* query(
          "events.participation.confirm.transaction",
          database.transaction((transaction) =>
            Effect.forEach(
              confirmable,
              ({ point, heroName }) =>
                Effect.gen(function* () {
                  const confirmed = yield* transaction
                    .update(eventKillPointTable)
                    .set({ confirmedAt: now })
                    .where(
                      and(
                        eq(eventKillPointTable.id, point.id),
                        isNull(eventKillPointTable.confirmedAt),
                      ),
                    )
                    .returning({ id: eventKillPointTable.id });
                  if (!confirmed[0]) return;
                  const rankingRows = yield* transaction
                    .select()
                    .from(eventRankingTable)
                    .where(
                      and(
                        eq(eventRankingTable.eventId, eventId),
                        eq(eventRankingTable.memberId, point.memberId),
                        eq(eventRankingTable.heroNpcName, heroName),
                      ),
                    )
                    .limit(1);
                  const ranking = rankingRows[0];
                  const trackingSeconds = Number.isFinite(
                    point.trackingDurationSeconds,
                  )
                    ? Math.max(
                        0,
                        Math.round(point.trackingDurationSeconds ?? 0),
                      )
                    : 0;
                  if (ranking) {
                    const totalKills = ranking.totalKills + 1;
                    const averageAfk =
                      Math.round(
                        ((ranking.avgAfkPercentage * ranking.totalKills +
                          point.afkPercentage) /
                          totalKills) *
                          100,
                      ) / 100;
                    yield* transaction
                      .update(eventRankingTable)
                      .set({
                        totalPoints: sql`${eventRankingTable.totalPoints} + ${point.points}`,
                        totalKills: sql`${eventRankingTable.totalKills} + 1`,
                        totalTimeSeconds: sql`${eventRankingTable.totalTimeSeconds} + ${trackingSeconds}`,
                        avgAfkPercentage: averageAfk,
                        pointsModified:
                          ranking.pointsModified ||
                          point.manualAdjustmentPoints !== 0,
                        updatedAt: now,
                      })
                      .where(eq(eventRankingTable.id, ranking.id));
                    return;
                  }
                  yield* transaction.insert(eventRankingTable).values({
                    id: randomUUID(),
                    eventId,
                    memberId: point.memberId,
                    heroNpcName: heroName,
                    totalPoints: point.points,
                    totalKills: 1,
                    totalTimeSeconds: trackingSeconds,
                    avgAfkPercentage: point.afkPercentage,
                    pointsModified: point.manualAdjustmentPoints !== 0,
                    updatedAt: now,
                  });
                }),
              { concurrency: 1, discard: true },
            ),
          ),
        );
        yield* afterConfirmation(guild.id, eventId);
        return { success: true as const, confirmedNow: true };
      }).pipe(
        Effect.withSpan("EventsRankingController_confirmParticipationForKill"),
      ),
  };
};

export type EventParticipation = ReturnType<typeof makeEventParticipation>;
