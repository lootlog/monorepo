import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventMapLocationTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  userPinnedEventTable,
} from "#src/database/drizzle/schema";

type Database = ApiDatabaseValue;
type EventInsert = typeof eventTable.$inferInsert;
type HeroInsert = typeof eventHeroNpcTable.$inferInsert;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
const normalizeEventJson = <T extends typeof eventTable.$inferSelect>(
  event: T,
) => ({ ...event, scoringRules: event.scoringRules as JsonValue | null });

export interface CatalogHeroInput {
  npcId?: number | null;
  npcName: string;
  npcIcon?: string | null;
  maps?: ReadonlyArray<{ mapId: number; mapName: string }>;
}

@Injectable()
export class EventCatalogRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  private run<A>(operation: (database: Database) => Effect.Effect<A, unknown>) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, operation),
    );
  }

  private insertHeroesEffect(
    database: Pick<Database, "insert">,
    eventId: string,
    heroes: ReadonlyArray<CatalogHeroInput>,
  ) {
    return Effect.gen(function* () {
      for (const hero of heroes) {
        const heroId = randomUUID();
        yield* database.insert(eventHeroNpcTable).values({
          id: heroId,
          eventId,
          npcId: hero.npcId ?? null,
          npcName: hero.npcName,
          npcIcon: hero.npcIcon ?? null,
        });
        if (hero.maps && hero.maps.length > 0) {
          const now = new Date();
          yield* database.insert(eventMapTable).values(
            hero.maps.map((map) => ({
              id: randomUUID(),
              heroNpcId: heroId,
              mapId: map.mapId,
              mapName: map.mapName,
              updatedAt: now,
            })),
          );
        }
      }
    });
  }

  createEvent(
    event: Omit<EventInsert, "id" | "updatedAt">,
    heroes: ReadonlyArray<CatalogHeroInput>,
  ) {
    const id = randomUUID();
    const repository = this;
    return this.run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction.insert(eventTable).values({
            ...event,
            id,
            updatedAt: new Date(),
          });
          yield* repository.insertHeroesEffect(transaction, id, heroes);
        }),
      ),
    ).then(() => this.findHydratedEvent(id));
  }

  findEvents(
    guildId: string,
    world: string | undefined,
    activeOnly: boolean,
    now: Date,
  ) {
    return this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(
          and(
            eq(eventTable.guildId, guildId),
            world ? eq(eventTable.world, world) : undefined,
            activeOnly
              ? and(
                  or(
                    isNull(eventTable.startsAt),
                    lte(eventTable.startsAt, now),
                  ),
                  or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(eventTable.createdAt)),
    ).then(async (events) => {
      const heroes = await this.findHeroes(events.map(({ id }) => id));
      return events.map((event) => ({
        ...normalizeEventJson(event),
        heroNpcs: heroes.filter(({ eventId }) => eventId === event.id),
      }));
    });
  }

  findOverview(guildId: string, eventId: string) {
    return this.findScopedEvent(guildId, eventId).then(async (event) => {
      if (!event) return null;
      const heroes = await this.findHeroes([eventId]);
      return { ...normalizeEventJson(event), heroNpcs: heroes };
    });
  }

  async findEventMaps(guildId: string, eventId: string) {
    const event = await this.findScopedEvent(guildId, eventId);
    if (!event) return null;
    const heroes = await this.findHeroes([eventId]);
    const result = [];
    for (const hero of heroes) {
      const [locations, maps] = await Promise.all([
        this.findLocationsWithMaps(hero.id),
        this.findMapsWithMembers(hero.id),
      ]);
      result.push({
        ...hero,
        locations,
        maps: maps.filter(({ locationId }) => locationId === null),
      });
    }
    return { id: event.id, heroNpcs: result };
  }

  findScopedEvent(guildId: string, eventId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)))
        .limit(1),
    ).then((rows) => (rows[0] ? normalizeEventJson(rows[0]) : null));
  }

  async updateEvent(
    eventId: string,
    data: Partial<EventInsert>,
    heroes: ReadonlyArray<CatalogHeroInput> | undefined,
    clearPins: boolean,
  ) {
    const repository = this;
    await this.run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          if (clearPins) {
            yield* transaction
              .delete(userPinnedEventTable)
              .where(eq(userPinnedEventTable.eventId, eventId));
          }
          if (heroes) {
            yield* transaction
              .delete(eventHeroNpcTable)
              .where(eq(eventHeroNpcTable.eventId, eventId));
          }
          yield* transaction
            .update(eventTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(eventTable.id, eventId));
          if (heroes)
            yield* repository.insertHeroesEffect(transaction, eventId, heroes);
        }),
      ),
    );
    return this.findHydratedEvent(eventId);
  }

  deleteEvent(eventId: string) {
    return this.run((database) =>
      database.delete(eventTable).where(eq(eventTable.id, eventId)),
    );
  }

  async findHydratedEvent(eventId: string) {
    const rows = await this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(eq(eventTable.id, eventId))
        .limit(1),
    );
    const event = rows[0];
    if (!event) return null;
    const heroes = await this.findHeroes([eventId]);
    const hydratedHeroes = await Promise.all(
      heroes.map(async (hero) => ({
        ...hero,
        maps: await this.findMapsWithMembers(hero.id),
      })),
    );
    return { ...normalizeEventJson(event), heroNpcs: hydratedHeroes };
  }

  findActiveEvent(guildId: string, eventId: string, now: Date) {
    return this.run((database) =>
      database
        .select()
        .from(eventTable)
        .where(
          and(
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
            or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
            or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
          ),
        )
        .limit(1),
    ).then((rows) => (rows[0] ? normalizeEventJson(rows[0]) : null));
  }

  findHero(guildId: string, eventId: string, heroId: string) {
    return this.run((database) =>
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
    ).then((rows) => rows[0]?.hero ?? null);
  }

  async createHero(
    eventId: string,
    hero: Omit<HeroInsert, "id" | "eventId">,
    maps: CatalogHeroInput["maps"],
  ) {
    const id = randomUUID();
    await this.run((database) =>
      database.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .insert(eventHeroNpcTable)
            .values({ ...hero, id, eventId });
          if (maps && maps.length > 0) {
            const now = new Date();
            yield* transaction.insert(eventMapTable).values(
              maps.map((map) => ({
                id: randomUUID(),
                heroNpcId: id,
                mapId: map.mapId,
                mapName: map.mapName,
                updatedAt: now,
              })),
            );
          }
        }),
      ),
    );
    const rows = await this.findHeroes([eventId]);
    const created = rows.find((row) => row.id === id);
    return created
      ? { ...created, maps: await this.findMapsWithMembers(id) }
      : null;
  }

  updateHero(heroId: string, data: { npcName: string; npcId?: number | null }) {
    return this.run((database) =>
      database
        .update(eventHeroNpcTable)
        .set(data)
        .where(eq(eventHeroNpcTable.id, heroId))
        .returning(),
    ).then((rows) => rows[0] ?? null);
  }

  deleteHero(heroId: string) {
    return this.run((database) =>
      database
        .delete(eventHeroNpcTable)
        .where(eq(eventHeroNpcTable.id, heroId)),
    );
  }

  findMap(guildId: string, eventId: string, heroId: string, mapId: string) {
    return this.run((database) =>
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
    ).then((rows) => rows[0]?.map ?? null);
  }

  findMapByNumericId(heroId: string, mapId: number) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapTable)
        .where(
          and(
            eq(eventMapTable.heroNpcId, heroId),
            eq(eventMapTable.mapId, mapId),
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  async createMap(heroId: string, mapId: number, mapName: string) {
    const id = randomUUID();
    const rows = await this.run((database) =>
      database
        .insert(eventMapTable)
        .values({
          id,
          heroNpcId: heroId,
          mapId,
          mapName,
          updatedAt: new Date(),
        })
        .returning(),
    );
    return { ...rows[0], assignedMembers: [] };
  }

  deleteMap(mapId: string) {
    return this.run((database) =>
      database.delete(eventMapTable).where(eq(eventMapTable.id, mapId)),
    );
  }

  findLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    return this.run((database) =>
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
    ).then((rows) => rows[0]?.location ?? null);
  }

  findLocationByName(heroId: string, name: string, excludedId?: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapLocationTable)
        .where(
          and(
            eq(eventMapLocationTable.heroNpcId, heroId),
            eq(eventMapLocationTable.name, name),
            excludedId ? ne(eventMapLocationTable.id, excludedId) : undefined,
          ),
        )
        .limit(1),
    ).then((rows) => rows[0] ?? null);
  }

  async createLocation(heroId: string, name: string) {
    const maxRows = await this.run((database) =>
      database
        .select({
          order: sql<number>`coalesce(max(${eventMapLocationTable.order}), -1)`,
        })
        .from(eventMapLocationTable)
        .where(eq(eventMapLocationTable.heroNpcId, heroId)),
    );
    const id = randomUUID();
    const rows = await this.run((database) =>
      database
        .insert(eventMapLocationTable)
        .values({
          id,
          heroNpcId: heroId,
          name,
          order: (maxRows[0]?.order ?? -1) + 1,
          updatedAt: new Date(),
        })
        .returning(),
    );
    return { ...rows[0], maps: [] };
  }

  async updateLocation(locationId: string, name: string) {
    const rows = await this.run((database) =>
      database
        .update(eventMapLocationTable)
        .set({ name, updatedAt: new Date() })
        .where(eq(eventMapLocationTable.id, locationId))
        .returning(),
    );
    const location = rows[0];
    return location
      ? {
          ...location,
          maps: await this.findMapsWithMembers(location.heroNpcId, location.id),
        }
      : null;
  }

  deleteLocation(locationId: string) {
    return this.run((database) =>
      database
        .delete(eventMapLocationTable)
        .where(eq(eventMapLocationTable.id, locationId)),
    );
  }

  findLocationsByIds(heroId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventMapLocationTable)
        .where(
          and(
            eq(eventMapLocationTable.heroNpcId, heroId),
            inArray(eventMapLocationTable.id, ids),
          ),
        ),
    );
  }

  reorderLocations(ids: string[]) {
    return this.run((database) =>
      database.transaction((transaction) =>
        Effect.forEach(ids, (id, order) =>
          transaction
            .update(eventMapLocationTable)
            .set({ order, updatedAt: new Date() })
            .where(eq(eventMapLocationTable.id, id)),
        ),
      ),
    );
  }

  async assignMapToLocation(mapId: string, locationId: string | null) {
    const rows = await this.run((database) =>
      database
        .update(eventMapTable)
        .set({ locationId, updatedAt: new Date() })
        .where(eq(eventMapTable.id, mapId))
        .returning(),
    );
    const map = rows[0];
    if (!map) return null;
    const [hydrated] = await this.hydrateMaps([map]);
    const location = locationId
      ? ((
          await this.run((database) =>
            database
              .select()
              .from(eventMapLocationTable)
              .where(eq(eventMapLocationTable.id, locationId))
              .limit(1),
          )
        )[0] ?? null)
      : null;
    return { ...hydrated, location };
  }

  findLocationsWithMaps(heroId: string) {
    return this.run((database) =>
      database
        .select()
        .from(eventMapLocationTable)
        .where(eq(eventMapLocationTable.heroNpcId, heroId))
        .orderBy(asc(eventMapLocationTable.order)),
    ).then(async (locations) =>
      Promise.all(
        locations.map(async (location) => ({
          ...location,
          maps: await this.findMapsWithMembers(heroId, location.id),
        })),
      ),
    );
  }

  findTimerNpc(
    guildId: string,
    world: string,
    npcName: string,
    manualType: string,
  ) {
    return this.run((database) =>
      database
        .select({ npc: timerTable.npc })
        .from(timerTable)
        .where(
          and(
            eq(timerTable.guildId, guildId),
            eq(timerTable.world, world),
            sql`${timerTable.npc}->>'name' ILIKE ${npcName}`,
            sql`coalesce(${timerTable.npc}->>'margonemType', '0') != ${manualType}`,
          ),
        )
        .orderBy(desc(timerTable.updatedAt))
        .limit(1),
    ).then(
      (rows) =>
        (rows[0]?.npc as
          | { id: number; name: string; icon: string }
          | undefined) ?? null,
    );
  }

  private findHeroes(eventIds: string[]) {
    if (eventIds.length === 0) return Promise.resolve([]);
    return this.run((database) =>
      database
        .select()
        .from(eventHeroNpcTable)
        .where(inArray(eventHeroNpcTable.eventId, eventIds)),
    );
  }

  private findMapsWithMembers(heroId: string, locationId?: string) {
    return this.run((database) =>
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
    ).then((maps) => this.hydrateMaps(maps));
  }

  private async hydrateMaps(maps: Array<typeof eventMapTable.$inferSelect>) {
    if (maps.length === 0) return [];
    const assignments = await this.run((database) =>
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
    const memberIds = [...new Set(assignments.map(({ member }) => member.id))];
    const roles =
      memberIds.length === 0
        ? []
        : await this.run((database) =>
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
  }
}
