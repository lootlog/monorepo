import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
  gt,
} from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapLocationTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
} from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import type {
  AssignMapLocationDto,
  CreateHeroDto,
  CreateLocationDto,
  CreateMapDto,
  ReorderLocationsDto,
  UpdateHeroDto,
  UpdateLocationDto,
} from "#src/http-api/contracts/events/schemas";

export class EventCatalogMutationError extends TaggedErrorClass<EventCatalogMutationError>()(
  "EventCatalogMutationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventCatalogMutations = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventCatalogMutationError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.catalog.drizzle", retryCount: 0 },
      }),
    );

  const invalidate = (guildId: string, eventId: string) =>
    Effect.forEach(
      [
        `event-read:v2:${guildId}:guild:*`,
        `event-read:v2:${guildId}:${eventId}:*`,
      ],
      (pattern) =>
        Effect.tryPromise({
          try: () => redis.deleteByPattern(pattern),
          catch: (cause) => cause,
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              logger.warn("Failed to invalidate event read cache", {
                error,
                pattern,
              }),
            ),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );

  const findHero = (guildId: string, eventId: string, heroId: string) =>
    query(
      "events.catalog.findHero",
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
    ).pipe(Effect.map((rows) => rows[0]?.hero ?? null));

  const findMap = (
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
  ) =>
    query(
      "events.catalog.findMap",
      database
        .select({ map: eventMapTable })
        .from(eventMapTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventMapTable.id, mapId),
            eq(eventHeroNpcTable.id, heroId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0]?.map ?? null));

  const findLocation = (
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) =>
    query(
      "events.catalog.findLocation",
      database
        .select({ location: eventMapLocationTable })
        .from(eventMapLocationTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapLocationTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventMapLocationTable.id, locationId),
            eq(eventHeroNpcTable.id, heroId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0]?.location ?? null));

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

  const mapsForHero = (heroId: string, locationId?: string) =>
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

  return {
    addHero: (guild: { id: string }, eventId: string, data: CreateHeroDto) =>
      Effect.gen(function* () {
        const now = new Date(yield* Clock.currentTimeMillis);
        const eventRows = yield* query(
          "events.catalog.addHero.event",
          database
            .select()
            .from(eventTable)
            .where(
              and(
                eq(eventTable.id, eventId),
                eq(eventTable.guildId, guild.id),
                or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
                or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
              ),
            )
            .limit(1),
        );
        const event = eventRows[0];
        if (!event)
          return yield* Effect.fail(
            new ResourceNotFoundError("Event not found"),
          );
        let npcId = data.npcId;
        let npcIcon: string | undefined;
        if (!npcId) {
          const timerRows = yield* query(
            "events.catalog.addHero.timerNpc",
            database
              .select({ npc: timerTable.npc })
              .from(timerTable)
              .where(
                and(
                  eq(timerTable.guildId, guild.id),
                  eq(timerTable.world, event.world),
                  sql`${timerTable.npc}->>'name' ILIKE ${data.npcName}`,
                  sql`coalesce(${timerTable.npc}->>'margonemType', '0') != ${String(TIMER_TYPES.CUSTOM_MANUAL)}`,
                ),
              )
              .orderBy(desc(timerTable.updatedAt))
              .limit(1),
          );
          const npc = timerRows[0]?.npc as
            | { id: number; icon: string }
            | undefined;
          npcId = npc?.id;
          npcIcon = npc?.icon;
        }
        const heroId = randomUUID();
        yield* query(
          "events.catalog.addHero.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.insert(eventHeroNpcTable).values({
                id: heroId,
                eventId,
                npcId: npcId ?? null,
                npcName: data.npcName,
                npcIcon: npcIcon ?? null,
              });
              if (data.maps && data.maps.length > 0) {
                yield* transaction.insert(eventMapTable).values(
                  data.maps.map((map) => ({
                    id: randomUUID(),
                    heroNpcId: heroId,
                    mapId: map.mapId,
                    mapName: map.mapName,
                    updatedAt: now,
                  })),
                );
              }
            }),
          ),
        );
        const heroes = yield* query(
          "events.catalog.addHero.result",
          database
            .select()
            .from(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.id, heroId))
            .limit(1),
        );
        const hero = heroes[0];
        yield* invalidate(guild.id, eventId);
        return hero ? { ...hero, maps: yield* mapsForHero(heroId) } : null;
      }).pipe(Effect.withSpan("EventsAssignmentController_addHero")),

    updateHero: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: UpdateHeroDto,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId))) {
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        }
        const rows = yield* query(
          "events.catalog.updateHero",
          database
            .update(eventHeroNpcTable)
            .set({
              npcName: data.npcName,
              ...(data.npcId !== undefined && { npcId: data.npcId }),
            })
            .where(eq(eventHeroNpcTable.id, heroId))
            .returning(),
        );
        yield* invalidate(guild.id, eventId);
        return rows[0] ?? null;
      }).pipe(Effect.withSpan("EventsAssignmentController_updateHero")),

    deleteHero: (guild: { id: string }, eventId: string, heroId: string) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        yield* query(
          "events.catalog.deleteHero",
          database
            .delete(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.id, heroId)),
        );
        yield* invalidate(guild.id, eventId);
        return { success: true };
      }).pipe(Effect.withSpan("EventsAssignmentController_deleteHero")),

    addMap: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: CreateMapDto,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        const duplicate = yield* query(
          "events.catalog.addMap.duplicate",
          database
            .select({ id: eventMapTable.id })
            .from(eventMapTable)
            .where(
              and(
                eq(eventMapTable.heroNpcId, heroId),
                eq(eventMapTable.mapId, data.mapId),
              ),
            )
            .limit(1),
        );
        if (duplicate[0])
          return yield* Effect.fail(
            new InvalidRequestError("Map already exists for this hero"),
          );
        const id = randomUUID();
        const rows = yield* query(
          "events.catalog.addMap.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              const inserted = yield* transaction
                .insert(eventMapTable)
                .values({
                  id,
                  heroNpcId: heroId,
                  mapId: data.mapId,
                  mapName: data.mapName,
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .returning();
              yield* transaction.insert(eventMapCoverageGapTable).values({
                id: randomUUID(),
                mapId: id,
                heroNpcId: heroId,
                gapType: "UNASSIGNED",
                startedAt: new Date(yield* Clock.currentTimeMillis),
              });
              return inserted;
            }),
          ),
        );
        yield* invalidate(guild.id, eventId);
        return rows[0] ? { ...rows[0], assignedMembers: [] } : null;
      }).pipe(Effect.withSpan("EventsAssignmentController_addMap")),

    deleteMap: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      mapId: string,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findMap(guild.id, eventId, heroId, mapId)))
          return yield* Effect.fail(new ResourceNotFoundError("Map not found"));
        yield* query(
          "events.catalog.deleteMap",
          database.delete(eventMapTable).where(eq(eventMapTable.id, mapId)),
        );
        yield* invalidate(guild.id, eventId);
        return { success: true };
      }).pipe(Effect.withSpan("EventsAssignmentController_deleteMap")),

    getLocations: (guild: { id: string }, eventId: string, heroId: string) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        const locations = yield* query(
          "events.catalog.locations",
          database
            .select()
            .from(eventMapLocationTable)
            .where(eq(eventMapLocationTable.heroNpcId, heroId))
            .orderBy(asc(eventMapLocationTable.order)),
        );
        return yield* Effect.forEach(locations, (location) =>
          mapsForHero(heroId, location.id).pipe(
            Effect.map((maps) => ({ ...location, maps })),
          ),
        );
      }).pipe(Effect.withSpan("EventsAssignmentController_getLocations")),

    createLocation: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: CreateLocationDto,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        const duplicate = yield* query(
          "events.catalog.createLocation.duplicate",
          database
            .select({ id: eventMapLocationTable.id })
            .from(eventMapLocationTable)
            .where(
              and(
                eq(eventMapLocationTable.heroNpcId, heroId),
                eq(eventMapLocationTable.name, data.name),
              ),
            )
            .limit(1),
        );
        if (duplicate[0])
          return yield* Effect.fail(
            new InvalidRequestError("Location with this name already exists"),
          );
        const maxRows = yield* query(
          "events.catalog.createLocation.order",
          database
            .select({
              order: sql<number>`coalesce(max(${eventMapLocationTable.order}), -1)`,
            })
            .from(eventMapLocationTable)
            .where(eq(eventMapLocationTable.heroNpcId, heroId)),
        );
        const rows = yield* query(
          "events.catalog.createLocation",
          database
            .insert(eventMapLocationTable)
            .values({
              id: randomUUID(),
              heroNpcId: heroId,
              name: data.name,
              order: (maxRows[0]?.order ?? -1) + 1,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .returning(),
        );
        yield* invalidate(guild.id, eventId);
        return rows[0] ? { ...rows[0], maps: [] } : null;
      }).pipe(Effect.withSpan("EventsAssignmentController_createLocation")),

    updateLocation: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      locationId: string,
      data: UpdateLocationDto,
    ) =>
      Effect.gen(function* () {
        const location = yield* findLocation(
          guild.id,
          eventId,
          heroId,
          locationId,
        );
        if (!location)
          return yield* Effect.fail(
            new ResourceNotFoundError("Location not found"),
          );
        if (data.name && data.name !== location.name) {
          const duplicate = yield* query(
            "events.catalog.updateLocation.duplicate",
            database
              .select({ id: eventMapLocationTable.id })
              .from(eventMapLocationTable)
              .where(
                and(
                  eq(eventMapLocationTable.heroNpcId, heroId),
                  eq(eventMapLocationTable.name, data.name),
                  ne(eventMapLocationTable.id, locationId),
                ),
              )
              .limit(1),
          );
          if (duplicate[0])
            return yield* Effect.fail(
              new InvalidRequestError("Location with this name already exists"),
            );
        }
        const rows = yield* query(
          "events.catalog.updateLocation",
          database
            .update(eventMapLocationTable)
            .set({
              name: data.name ?? location.name,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(eventMapLocationTable.id, locationId))
            .returning(),
        );
        yield* invalidate(guild.id, eventId);
        return rows[0]
          ? { ...rows[0], maps: yield* mapsForHero(heroId, locationId) }
          : null;
      }).pipe(Effect.withSpan("EventsAssignmentController_updateLocation")),

    deleteLocation: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      locationId: string,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findLocation(guild.id, eventId, heroId, locationId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Location not found"),
          );
        yield* query(
          "events.catalog.deleteLocation",
          database
            .delete(eventMapLocationTable)
            .where(eq(eventMapLocationTable.id, locationId)),
        );
        yield* invalidate(guild.id, eventId);
        return { success: true };
      }).pipe(Effect.withSpan("EventsAssignmentController_deleteLocation")),

    reorderLocations: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      data: ReorderLocationsDto,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findHero(guild.id, eventId, heroId)))
          return yield* Effect.fail(
            new ResourceNotFoundError("Hero not found"),
          );
        const locations =
          data.locationIds.length === 0
            ? []
            : yield* query(
                "events.catalog.reorderLocations.find",
                database
                  .select({ id: eventMapLocationTable.id })
                  .from(eventMapLocationTable)
                  .where(
                    and(
                      eq(eventMapLocationTable.heroNpcId, heroId),
                      inArray(eventMapLocationTable.id, data.locationIds),
                    ),
                  ),
              );
        if (locations.length !== data.locationIds.length)
          return yield* Effect.fail(
            new InvalidRequestError(
              "Some locations not found or do not belong to this hero",
            ),
          );
        yield* query(
          "events.catalog.reorderLocations",
          database.transaction((transaction) =>
            Effect.forEach(
              data.locationIds,
              (id, order) =>
                transaction
                  .update(eventMapLocationTable)
                  .set({ order, updatedAt: new Date() })
                  .where(eq(eventMapLocationTable.id, id)),
              { discard: true },
            ),
          ),
        );
        yield* invalidate(guild.id, eventId);
        return { success: true };
      }).pipe(Effect.withSpan("EventsAssignmentController_reorderLocations")),

    assignMapToLocation: (
      guild: { id: string },
      eventId: string,
      heroId: string,
      mapId: string,
      data: AssignMapLocationDto,
    ) =>
      Effect.gen(function* () {
        if (!(yield* findMap(guild.id, eventId, heroId, mapId)))
          return yield* Effect.fail(new ResourceNotFoundError("Map not found"));
        const locationId = data.locationId ?? null;
        const location = locationId
          ? yield* findLocation(guild.id, eventId, heroId, locationId)
          : null;
        if (locationId && !location)
          return yield* Effect.fail(
            new ResourceNotFoundError("Location not found"),
          );
        const rows = yield* query(
          "events.catalog.assignMapToLocation",
          database
            .update(eventMapTable)
            .set({
              locationId,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(eventMapTable.id, mapId))
            .returning(),
        );
        const hydrated = yield* hydrateMaps(rows);
        yield* invalidate(guild.id, eventId);
        return hydrated[0] ? { ...hydrated[0], location } : null;
      }).pipe(
        Effect.withSpan("EventsAssignmentController_assignMapToLocation"),
      ),
  };
};

export type EventCatalogMutations = ReturnType<
  typeof makeEventCatalogMutations
>;
