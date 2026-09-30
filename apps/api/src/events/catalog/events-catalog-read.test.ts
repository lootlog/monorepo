import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import superjson from "superjson";
import { describe, expect, it, mock } from "bun:test";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Effect } from "effect";
import {
  eventHeroNpcTable,
  eventMapLocationTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

import type { RedisGetOrSetJsonBestEffortOptions } from "#src/redis/redis.service";

import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";

describe("event catalog read Effect module", () => {
  it("returns the established cached overview without touching Drizzle", async () => {
    const cachedEvent = {
      id: "event-1",
      guildId: "guild-1",
      name: "Event",
      world: "tempest",
      startsAt: new Date("2026-08-16T10:00:00.000Z"),
      endsAt: null,
      createdAt: new Date("2026-08-16T09:00:00.000Z"),
      updatedAt: new Date("2026-08-16T09:00:00.000Z"),
      basePointsPerKill: 1,
      assignmentTimeoutMinutes: 5,
      participationConfirmationMinutes: 0,
      mapAssignmentCap: null,
      scoringMode: "SIMPLE" as const,
      scoringRules: null,
      rulebookMarkdown: null,
      active: true,
      heroNpcs: [],
    };

    const cacheRead = mock(() => undefined);

    const redis = {
      getOrSetJsonEffect<T, E>(
        options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
          factory: Effect.Effect<T, E>;
        },
      ) {
        cacheRead();

        return Effect.succeed(
          options.codec.parse(superjson.stringify(cachedEvent)),
        );
      },
    };

    const boundary = await createDatabaseBoundary();

    try {
      const logger = { warn: mock(() => undefined) };

      const catalog = makeEventsCatalogRead(boundary.database, redis, logger);

      const result = await boundary.run(
        catalog.getEvent(
          { id: "guild-1" },
          "event-1",
          [],
          createAccessPolicy({ capabilities: [] }),
        ),
      );

      expect(result).toEqual(cachedEvent);
      expect(cacheRead).toHaveBeenCalledTimes(1);
    } finally {
      await boundary.dispose();
    }
  });

  it("groups every hero's maps under its ordered locations exactly once", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date("2026-09-02T10:00:00.000Z");
      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-1",
          name: "Guild",
          ownerId: "owner",
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "tempest",
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values([
          { id: "hero-a", eventId: "event-1", npcName: "A", npcLvl: 100 },
          { id: "hero-b", eventId: "event-1", npcName: "B", npcLvl: 120 },
          { id: "hidden", eventId: "event-1", npcName: "Hidden", npcLvl: 300 },
        ]),
      );
      await boundary.run(
        database.insert(eventMapLocationTable).values([
          {
            id: "a-second",
            heroNpcId: "hero-a",
            name: "2",
            order: 1,
            updatedAt: now,
          },
          {
            id: "a-first",
            heroNpcId: "hero-a",
            name: "1",
            order: 0,
            updatedAt: now,
          },
          {
            id: "b-only",
            heroNpcId: "hero-b",
            name: "1",
            order: 0,
            updatedAt: now,
          },
          {
            id: "hidden-only",
            heroNpcId: "hidden",
            name: "1",
            order: 0,
            updatedAt: now,
          },
        ]),
      );

      const map = (
        id: string,
        heroNpcId: string,
        locationId: string | null,
        mapId: number,
      ) => ({ id, heroNpcId, locationId, mapId, mapName: id, updatedAt: now });

      await boundary.run(
        database
          .insert(eventMapTable)
          .values([
            map("a-first-late", "hero-a", "a-first", 30),
            map("a-first-early", "hero-a", "a-first", 10),
            map("a-second-map", "hero-a", "a-second", 20),
            map("a-standalone-late", "hero-a", null, 40),
            map("a-standalone-early", "hero-a", null, 5),
            map("b-located", "hero-b", "b-only", 10),
            map("b-standalone", "hero-b", null, 5),
            map("hidden-map", "hidden", "hidden-only", 10),
          ]),
      );
      await boundary.run(
        database.insert(roleTable).values([
          {
            id: "low",
            guildId: "guild-1",
            name: "Low",
            position: 1,
            color: 1,
            updatedAt: now,
          },
          {
            id: "top",
            guildId: "guild-1",
            name: "Top",
            position: 9,
            color: 9,
            updatedAt: now,
          },
        ]),
      );
      await boundary.run(
        database.insert(memberTable).values([
          {
            id: 1,
            userId: "user-1",
            guildId: "guild-1",
            name: "One",
            updatedAt: now,
          },
          {
            id: 2,
            userId: "user-2",
            guildId: "guild-1",
            name: "Two",
            updatedAt: now,
          },
        ]),
      );
      await boundary.run(
        database.insert(memberToRoleTable).values([
          { A: 1, B: "low" },
          { A: 1, B: "top" },
        ]),
      );
      await boundary.run(
        database.insert(eventMapToMemberTable).values([
          { A: "a-first-early", B: 2 },
          { A: "a-first-early", B: 1 },
          { A: "b-standalone", B: 1 },
        ]),
      );

      // Serve the loaded value through the cache codec, as a cache hit would.
      const redis = {
        getOrSetJsonEffect<T, E>(
          options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
            factory: Effect.Effect<T, E>;
          },
        ) {
          return options.factory.pipe(
            Effect.map((value) =>
              options.codec.parse(options.codec.stringify(value)),
            ),
          );
        },
      };

      const catalog = makeEventsCatalogRead(database, redis, {
        warn: () => undefined,
      });

      const result = await boundary.run(
        catalog.getEventMaps(
          { id: "guild-1" },
          "event-1",
          [
            {
              id: "viewer",
              guildId: "guild-1",
              name: "Viewer",
              color: null,
              position: 0,
              permissions: [],
              lvlRangeFrom: 0,
              lvlRangeTo: 200,
              createdAt: now,
              updatedAt: now,
            },
          ],
          createAccessPolicy({ capabilities: [] }),
        ),
      );

      const layout = result.heroNpcs.map((hero) => ({
        id: hero.id,
        locations: hero.locations.map((location) => ({
          id: location.id,
          maps: location.maps.map(({ id }) => id),
        })),
        maps: hero.maps.map(({ id }) => id),
      }));

      expect(layout).toEqual([
        {
          id: "hero-a",
          locations: [
            { id: "a-first", maps: ["a-first-early", "a-first-late"] },
            { id: "a-second", maps: ["a-second-map"] },
          ],
          maps: ["a-standalone-early", "a-standalone-late"],
        },
        {
          id: "hero-b",
          locations: [{ id: "b-only", maps: ["b-located"] }],
          maps: ["b-standalone"],
        },
      ]);

      const assignedMembers = (mapId: string) =>
        result.heroNpcs
          .flatMap((hero) => [
            ...hero.maps,
            ...hero.locations.flatMap((location) => location.maps),
          ])
          .find(({ id }) => id === mapId)?.assignedMembers;

      expect(assignedMembers("a-first-early")).toEqual([
        {
          id: 1,
          name: "One",
          avatar: null,
          userId: "user-1",
          roles: [{ position: 9, color: 9 }],
        },
        { id: 2, name: "Two", avatar: null, userId: "user-2", roles: [] },
      ]);
      expect(assignedMembers("b-standalone")).toEqual([
        {
          id: 1,
          name: "One",
          avatar: null,
          userId: "user-1",
          roles: [{ position: 9, color: 9 }],
        },
      ]);

      const mutation = await boundary.run(catalog.hydrateMutation("event-1"));

      expect(
        mutation.heroNpcs.map((hero) => ({
          id: hero.id,
          maps: hero.maps.map(({ id }) => id),
        })),
      ).toEqual([
        {
          id: "hero-a",
          maps: [
            "a-standalone-early",
            "a-first-early",
            "a-second-map",
            "a-first-late",
            "a-standalone-late",
          ],
        },
        { id: "hero-b", maps: ["b-standalone", "b-located"] },
        { id: "hidden", maps: ["hidden-map"] },
      ]);
    } finally {
      await boundary.dispose();
    }
  });
});
