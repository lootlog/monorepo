import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect, Schema } from "effect";
import superjson from "superjson";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapLocationTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { NotFoundException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { filterHeroesByLevel } from "#src/shared/utils/can-view-event-hero";
import {
  attachComputedEventActive,
  compareEventsByActivityAndStart,
} from "./utils/event-activity.util.js";

const CACHE_PREFIX = "event-read:v2";
const CACHE_TTL_SECONDS = 10;

type Role = typeof roleTable.$inferSelect;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export class EventCatalogReadError extends TaggedErrorClass<EventCatalogReadError>()(
  "EventCatalogReadError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const cacheKey = (
  guildId: string,
  eventSegment: string,
  scope: string,
  params: Record<string, unknown> = {},
) =>
  [
    CACHE_PREFIX,
    guildId,
    eventSegment,
    scope,
    Buffer.from(stableSerialize(params)).toString("base64url"),
  ].join(":");

export const makeEventsCatalogRead = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventCatalogReadError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.catalog.drizzle", retryCount: 0 },
      }),
    );

  const cached = <A>(key: string, load: Effect.Effect<A, unknown>) =>
    Effect.gen(function* () {
      const hit = yield* Effect.tryPromise({
        try: () =>
          redis.getJson<A>(key, {
            stringify: (value) => superjson.stringify(value),
            parse: <T>(text: string) => superjson.parse<T>(text),
          }),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.warn("Event read cache unavailable", error);
            return null;
          }),
        ),
      );
      if (hit !== null) return hit;
      const value = yield* load;
      yield* Effect.tryPromise({
        try: () =>
          redis.setJson(key, value, CACHE_TTL_SECONDS, {
            stringify: (entry) => superjson.stringify(entry),
            parse: <T>(text: string) => superjson.parse<T>(text),
          }),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => logger.warn("Event read cache unavailable", error)),
        ),
      );
      return value;
    });

  const findHeroes = (eventIds: string[]) =>
    eventIds.length === 0
      ? Effect.succeed([])
      : query(
          "events.catalog.findHeroes",
          database
            .select()
            .from(eventHeroNpcTable)
            .where(inArray(eventHeroNpcTable.eventId, eventIds)),
        );

  const hydrateMaps = (maps: Array<typeof eventMapTable.$inferSelect>) =>
    Effect.gen(function* () {
      if (maps.length === 0) return [];
      const assignments = yield* query(
        "events.catalog.mapAssignments",
        database
          .select({ mapId: eventMapToMemberTable.A, member: memberTable })
          .from(eventMapToMemberTable)
          .innerJoin(memberTable, eq(memberTable.id, eventMapToMemberTable.B))
          .where(
            inArray(
              eventMapToMemberTable.A,
              maps.map(({ id }) => id),
            ),
          ),
      );
      const memberIds = [
        ...new Set(assignments.map(({ member }) => member.id)),
      ];
      const roles =
        memberIds.length === 0
          ? []
          : yield* query(
              "events.catalog.memberRoles",
              database
                .select({
                  memberId: memberToRoleTable.A,
                  position: roleTable.position,
                  color: roleTable.color,
                })
                .from(memberToRoleTable)
                .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
                .where(inArray(memberToRoleTable.A, memberIds))
                .orderBy(desc(roleTable.position)),
            );
      return maps.map((map) => ({
        ...map,
        assignedMembers: assignments
          .filter(({ mapId }) => mapId === map.id)
          .map(({ member }) => ({
            id: member.id,
            name: member.name,
            avatar: member.avatar,
            userId: member.userId,
            roles: roles
              .filter(({ memberId }) => memberId === member.id)
              .slice(0, 1)
              .map(({ position, color }) => ({ position, color })),
          })),
      }));
    });

  const mapsWithMembers = (heroId: string, locationId?: string) =>
    query(
      "events.catalog.maps",
      database
        .select()
        .from(eventMapTable)
        .where(
          and(
            eq(eventMapTable.heroNpcId, heroId),
            locationId ? eq(eventMapTable.locationId, locationId) : undefined,
          ),
        )
        .orderBy(asc(eventMapTable.mapId)),
    ).pipe(Effect.flatMap(hydrateMaps));

  const locationsWithMaps = (heroId: string) =>
    query(
      "events.catalog.locations",
      database
        .select()
        .from(eventMapLocationTable)
        .where(eq(eventMapLocationTable.heroNpcId, heroId))
        .orderBy(asc(eventMapLocationTable.order)),
    ).pipe(
      Effect.flatMap((locations) =>
        Effect.forEach(
          locations,
          (location) =>
            mapsWithMembers(heroId, location.id).pipe(
              Effect.map((maps) => ({ ...location, maps })),
            ),
          { concurrency: "unbounded" },
        ),
      ),
    );

  const scopedEvent = (guildId: string, eventId: string) =>
    query(
      "events.catalog.scopedEvent",
      database
        .select()
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1),
    ).pipe(
      Effect.map((rows) => {
        const event = rows[0];
        return event
          ? { ...event, scoringRules: event.scoringRules as JsonValue | null }
          : null;
      }),
    );

  const filterEvent = <
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
  });

  const getOverview = (guildId: string, eventId: string) =>
    cached(
      cacheKey(guildId, eventId, "overview"),
      Effect.gen(function* () {
        const event = yield* scopedEvent(guildId, eventId);
        if (!event) {
          return yield* Effect.fail(new NotFoundException("Event not found"));
        }
        const heroNpcs = yield* findHeroes([eventId]);
        return attachComputedEventActive({ ...event, heroNpcs }, new Date());
      }),
    );

  const hydrateMutation = (eventId: string) =>
    Effect.gen(function* () {
      const rows = yield* query(
        "events.catalog.mutationEvent",
        database
          .select()
          .from(eventTable)
          .where(eq(eventTable.id, eventId))
          .limit(1),
      );
      const event = rows[0];
      if (!event) {
        return yield* Effect.fail(new NotFoundException("Event not found"));
      }
      const heroes = yield* findHeroes([eventId]);
      const heroNpcs = yield* Effect.forEach(
        heroes,
        (hero) =>
          mapsWithMembers(hero.id).pipe(
            Effect.map((maps) => ({ ...hero, maps })),
          ),
        { concurrency: "unbounded" },
      );
      return {
        ...event,
        scoringRules: event.scoringRules as JsonValue | null,
        heroNpcs,
      };
    });

  return {
    hydrateMutation,
    getEvents: (
      guild: { id: string },
      accessPolicy: AccessPolicy,
      world?: string,
      activeOnly?: string,
      roles: Role[] = [],
    ) => {
      const normalizedWorld = world?.trim().toLowerCase();
      const onlyActive = activeOnly !== "false";
      return cached(
        cacheKey(guild.id, "guild", "list", {
          activeOnly: onlyActive,
          world: normalizedWorld,
        }),
        Effect.gen(function* () {
          const referenceTime = new Date();
          const events = yield* query(
            "events.catalog.list",
            database
              .select()
              .from(eventTable)
              .where(
                and(
                  eq(eventTable.guildId, guild.id),
                  normalizedWorld
                    ? eq(eventTable.world, normalizedWorld)
                    : undefined,
                  onlyActive
                    ? and(
                        or(
                          isNull(eventTable.startsAt),
                          lte(eventTable.startsAt, referenceTime),
                        ),
                        or(
                          isNull(eventTable.endsAt),
                          gt(eventTable.endsAt, referenceTime),
                        ),
                      )
                    : undefined,
                ),
              )
              .orderBy(desc(eventTable.createdAt)),
          );
          const heroes = yield* findHeroes(events.map(({ id }) => id));
          return events
            .map((event) =>
              attachComputedEventActive(
                {
                  ...event,
                  scoringRules: event.scoringRules as JsonValue | null,
                  heroNpcs: heroes.filter(
                    ({ eventId }) => eventId === event.id,
                  ),
                },
                referenceTime,
              ),
            )
            .sort(compareEventsByActivityAndStart);
        }),
      ).pipe(
        Effect.map((events) =>
          events.map((event) => filterEvent(event, roles, accessPolicy)),
        ),
      );
    },

    getEvent: (
      guild: { id: string },
      eventId: string,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ) =>
      getOverview(guild.id, eventId).pipe(
        Effect.map((event) => filterEvent(event, roles, accessPolicy)),
      ),

    getEventOverview: (
      guild: { id: string },
      eventId: string,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ) =>
      getOverview(guild.id, eventId).pipe(
        Effect.map((event) => filterEvent(event, roles, accessPolicy)),
      ),

    getEventMaps: (
      guild: { id: string },
      eventId: string,
      roles: Role[],
      accessPolicy: AccessPolicy,
    ) =>
      cached(
        cacheKey(guild.id, eventId, "maps"),
        Effect.gen(function* () {
          const event = yield* scopedEvent(guild.id, eventId);
          if (!event) {
            return yield* Effect.fail(new NotFoundException("Event not found"));
          }
          const heroes = yield* findHeroes([eventId]);
          const heroNpcs = yield* Effect.forEach(
            heroes,
            (hero) =>
              Effect.all({
                locations: locationsWithMaps(hero.id),
                maps: mapsWithMembers(hero.id),
              }).pipe(
                Effect.map(({ locations, maps }) => ({
                  ...hero,
                  locations,
                  maps: maps.filter(({ locationId }) => locationId === null),
                })),
              ),
            { concurrency: "unbounded" },
          );
          return { id: event.id, heroNpcs };
        }),
      ).pipe(Effect.map((event) => filterEvent(event, roles, accessPolicy))),
  };
};

export type EventsCatalogRead = ReturnType<typeof makeEventsCatalogRead>;
