import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  userPinnedEventTable,
} from "#src/database/drizzle/schema";

const activeEventCondition = (referenceTime: Date) =>
  and(
    or(isNull(eventTable.startsAt), lte(eventTable.startsAt, referenceTime)),
    or(isNull(eventTable.endsAt), gt(eventTable.endsAt, referenceTime)),
  );

export class PinnedEventsPersistenceError extends TaggedErrorClass<PinnedEventsPersistenceError>()(
  "PinnedEventsPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makePinnedEventsPersistence = (
  database: typeof ApiDatabase.Service,
) => {
  const run = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new PinnedEventsPersistenceError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.pins.drizzle", retryCount: 0 },
      }),
    );

  const findHeroes = (eventIds: string[]) => {
    if (eventIds.length === 0) {
      return Effect.succeed(
        new Map<
          string,
          Array<{
            id: string;
            npcId: number | null;
            npcName: string;
            npcIcon: string | null;
            npcLvl: number | null;
          }>
        >(),
      );
    }
    return run(
      "events.pins.findHeroes",
      database
        .select({
          eventId: eventHeroNpcTable.eventId,
          id: eventHeroNpcTable.id,
          npcId: eventHeroNpcTable.npcId,
          npcName: eventHeroNpcTable.npcName,
          npcIcon: eventHeroNpcTable.npcIcon,
          npcLvl: eventHeroNpcTable.npcLvl,
        })
        .from(eventHeroNpcTable)
        .where(inArray(eventHeroNpcTable.eventId, eventIds)),
    ).pipe(
      Effect.map((rows) => {
        const byEventId = new Map<
          string,
          Array<Omit<(typeof rows)[number], "eventId">>
        >();
        for (const { eventId, ...hero } of rows) {
          const heroes = byEventId.get(eventId) ?? [];
          heroes.push(hero);
          byEventId.set(eventId, heroes);
        }
        return byEventId;
      }),
    );
  };

  return {
    removeInactive: (userId: string, guildId: string, referenceTime: Date) =>
      run(
        "events.pins.removeInactive",
        database.delete(userPinnedEventTable).where(
          and(
            eq(userPinnedEventTable.userId, userId),
            inArray(
              userPinnedEventTable.eventId,
              database
                .select({ id: eventTable.id })
                .from(eventTable)
                .where(
                  and(
                    eq(eventTable.guildId, guildId),
                    or(
                      gt(eventTable.startsAt, referenceTime),
                      lte(eventTable.endsAt, referenceTime),
                    ),
                  ),
                ),
            ),
          ),
        ),
      ).pipe(Effect.asVoid),

    findActive: (userId: string, guildId: string, referenceTime: Date) =>
      Effect.gen(function* () {
        const rows = yield* run(
          "events.pins.findActive",
          database
            .select({
              pinnedAt: userPinnedEventTable.pinnedAt,
              event: eventTable,
            })
            .from(userPinnedEventTable)
            .innerJoin(
              eventTable,
              eq(eventTable.id, userPinnedEventTable.eventId),
            )
            .where(
              and(
                eq(userPinnedEventTable.userId, userId),
                eq(eventTable.guildId, guildId),
                activeEventCondition(referenceTime),
              ),
            )
            .orderBy(desc(userPinnedEventTable.pinnedAt)),
        );
        const heroNpcs = yield* findHeroes(rows.map(({ event }) => event.id));
        return rows.map(({ event, pinnedAt }) => ({
          pinnedAt,
          event: { ...event, heroNpcs: heroNpcs.get(event.id) ?? [] },
        }));
      }),

    findEvent: (eventId: string, guildId: string) =>
      Effect.gen(function* () {
        const rows = yield* run(
          "events.pins.findEvent",
          database
            .select()
            .from(eventTable)
            .where(
              and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)),
            )
            .limit(1),
        );
        const event = rows[0];
        if (!event) return null;
        const heroNpcs = yield* findHeroes([event.id]);
        return { ...event, heroNpcs: heroNpcs.get(event.id) ?? [] };
      }),

    remove: (userId: string, eventId: string) =>
      run(
        "events.pins.remove",
        database
          .delete(userPinnedEventTable)
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(userPinnedEventTable.eventId, eventId),
            ),
          ),
      ).pipe(Effect.asVoid),

    pin: (userId: string, eventId: string) =>
      run(
        "events.pins.pin",
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .insert(userPinnedEventTable)
              .values({ userId, eventId })
              .onConflictDoNothing({
                target: [
                  userPinnedEventTable.userId,
                  userPinnedEventTable.eventId,
                ],
              });
            const rows = yield* transaction
              .select({ pinnedAt: userPinnedEventTable.pinnedAt })
              .from(userPinnedEventTable)
              .where(
                and(
                  eq(userPinnedEventTable.userId, userId),
                  eq(userPinnedEventTable.eventId, eventId),
                ),
              )
              .limit(1);
            return rows[0] ?? null;
          }),
        ),
      ),

    removeFromGuild: (userId: string, guildId: string, eventId: string) =>
      run(
        "events.pins.removeFromGuild",
        database
          .delete(userPinnedEventTable)
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(userPinnedEventTable.eventId, eventId),
              inArray(
                userPinnedEventTable.eventId,
                database
                  .select({ id: eventTable.id })
                  .from(eventTable)
                  .where(eq(eventTable.guildId, guildId)),
              ),
            ),
          ),
      ).pipe(Effect.asVoid),
  };
};

export type PinnedEventsPersistence = ReturnType<
  typeof makePinnedEventsPersistence
>;
