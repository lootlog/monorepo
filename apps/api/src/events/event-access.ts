import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { filterHeroesByLevel } from "#src/events/event-hero-visibility";

type Role = typeof roleTable.$inferSelect;

export class EventAccessError extends TaggedErrorClass<EventAccessError>()(
  "EventAccessError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventAccess = (database: typeof ApiDatabase.Service) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new EventAccessError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.access.drizzle", retryCount: 0 },
      }),
    );

  const visible = (
    hero: { npcLvl: number | null },
    roles: Role[],
    accessPolicy: AccessPolicy,
  ) =>
    filterHeroesByLevel([hero], roles, getEffectiveCapabilities(accessPolicy))
      .length > 0;

  return {
    isHeroVisible: visible,
    filterEventHeroes: <
      T extends { heroNpcs: Array<{ npcLvl: number | null }> },
    >(
      event: T,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ): T => ({
      ...event,
      heroNpcs: filterHeroesByLevel(
        event.heroNpcs,
        roles,
        getEffectiveCapabilities(accessPolicy),
      ),
    }),

    getHero: (
      guildId: string,
      eventId: string,
      heroId: string,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ) =>
      query(
        "events.access.hero",
        database
          .select({ hero: eventHeroNpcTable })
          .from(eventHeroNpcTable)
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventHeroNpcTable.id, heroId),
              eq(eventHeroNpcTable.eventId, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ).pipe(
        Effect.flatMap((rows) => {
          const hero = rows[0]?.hero;
          return hero && visible(hero, roles, accessPolicy)
            ? Effect.succeed(hero)
            : Effect.fail(new ResourceNotFoundError("Hero not found"));
        }),
      ),

    getMap: (
      guildId: string,
      eventId: string,
      mapId: string,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ) =>
      query(
        "events.access.map",
        database
          .select({ map: eventMapTable, heroNpc: eventHeroNpcTable })
          .from(eventMapTable)
          .innerJoin(
            eventHeroNpcTable,
            eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
          )
          .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
          .where(
            and(
              eq(eventMapTable.id, mapId),
              eq(eventHeroNpcTable.eventId, eventId),
              eq(eventTable.guildId, guildId),
            ),
          )
          .limit(1),
      ).pipe(
        Effect.flatMap((rows) => {
          const row = rows[0];
          return row && visible(row.heroNpc, roles, accessPolicy)
            ? Effect.succeed({ ...row.map, heroNpc: row.heroNpc })
            : Effect.fail(new ResourceNotFoundError("Map not found"));
        }),
      ),
  };
};

export type EventAccess = ReturnType<typeof makeEventAccess>;
