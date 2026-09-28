import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { asc, eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  eventHeroKillTable,
  eventKillPointTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventRankingTable,
  eventTable,
  eventHeroNpcTable,
  guildTable,
  memberTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { UpdateEventRequest } from "#src/contracts/events/schemas";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventUpdate } from "#src/events/catalog/event-update";
import { makeEventCatalogMutations } from "#src/events/catalog/event-catalog-mutations";

describe("event update Effect module", () => {
  it.each([
    {
      name: "rejects an inverted range without changing persistence",
      data: {
        startsAt: "2026-09-02T13:00:00.000Z",
        endsAt: "2026-09-02T12:00:00.000Z",
      },
      rejects: true,
    },
    {
      name: "rejects replacing hidden heroes without changing persistence",
      data: { heroNpcs: [] },
      rejects: true,
    },
    {
      name: "clears a scheduled end time with an explicit null request",
      data: { endsAt: null },
      rejects: false,
    },
  ])("$name", async ({ data, rejects }) => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const startsAt = new Date("2026-09-02T10:00:00.000Z");
      const endsAt = new Date("2026-09-02T12:00:00.000Z");
      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-1",
          name: "Guild",
          ownerId: "owner",
          updatedAt: startsAt,
        }),
      );
      await boundary.run(
        database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "tempest",
          startsAt,
          endsAt,
          updatedAt: startsAt,
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values({
          id: "hidden",
          eventId: "event-1",
          npcName: "Hidden",
          npcLvl: 300,
        }),
      );
      const logger = { warn: () => undefined };

      const catalog = makeEventsCatalogRead(
        database,
        {
          getOrSetJsonEffect: () =>
            Effect.die("Mutation hydration must read durable state"),
        },
        logger,
      );

      const updateEvent = makeEventUpdate(
        database,
        {
          invalidateScopes: () => Promise.resolve(),
          deleteByPattern: () => Promise.resolve(0),
        },
        catalog,
        logger,
      );

      const request = Schema.decodeUnknownSync(UpdateEventRequest)(data);

      const result = boundary.run(
        updateEvent(
          { id: "guild-1" },
          "event-1",
          request,
          [],
          createAccessPolicy({
            capabilities: [Capability.LOOTLOG_EVENTS_MANAGE],
          }),
        ),
      );

      if (rejects) {
        await expect(result).rejects.toBeInstanceOf(
          "heroNpcs" in data ? ResourceNotFoundError : InvalidRequestError,
        );
      } else {
        const updated = await result;
        expect(updated.endsAt).toBeNull();
        expect(updated.heroNpcs).toEqual([]);
      }

      expect(
        await boundary.run(database.select().from(eventHeroNpcTable)),
      ).toHaveLength(1);

      const rows = await boundary.run(
        database.select().from(eventTable).where(eq(eventTable.id, "event-1")),
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.startsAt).toEqual(startsAt);
      expect(rows[0]?.endsAt).toEqual(rejects ? endsAt : null);
    } finally {
      await boundary.dispose();
    }
  });
});

type DatabaseBoundary = Awaited<ReturnType<typeof createDatabaseBoundary>>;

describe("event hero list history", () => {
  const redis = {
    invalidateScopes: () => Promise.resolve(),
    deleteByPattern: () => Promise.resolve(0),
  };

  const logger = { warn: () => undefined };

  const managePolicy = createAccessPolicy({
    capabilities: [Capability.LOOTLOG_EVENTS_MANAGE],
  });

  const storedHeroList = [
    { npcId: 10, npcName: "Kotołak", maps: [{ mapId: 100, mapName: "Las" }] },
    {
      npcId: 20,
      npcName: "Mietek",
      maps: [{ mapId: 200, mapName: "Jaskinia" }],
    },
  ];

  const withSeededEvent = async (
    test: (boundary: DatabaseBoundary) => Promise<void>,
  ) => {
    const boundary = await createDatabaseBoundary();
    const { database } = boundary;
    const now = new Date("2026-09-02T10:00:00.000Z");

    try {
      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-1",
          name: "Guild",
          ownerId: "owner",
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(memberTable).values({
          id: 1,
          userId: "user-1",
          guildId: "guild-1",
          name: "Member",
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "tempest",
          startsAt: now,
          updatedAt: now,
        }),
      );

      for (const [key, hero] of [
        ["a", storedHeroList[0]],
        ["b", storedHeroList[1]],
      ] as const) {
        await boundary.run(
          database.insert(eventHeroNpcTable).values({
            id: `hero-${key}`,
            eventId: "event-1",
            npcId: hero.npcId,
            npcName: hero.npcName,
            npcIcon: `${key}.gif`,
          }),
        );
        await boundary.run(
          database.insert(eventMapTable).values({
            id: `map-${key}`,
            heroNpcId: `hero-${key}`,
            mapId: hero.maps[0].mapId,
            mapName: hero.maps[0].mapName,
            updatedAt: now,
          }),
        );
        await boundary.run(
          database.insert(eventMapAssignmentHistoryTable).values({
            id: `assignment-${key}`,
            mapId: `map-${key}`,
            heroNpcId: `hero-${key}`,
            memberId: 1,
          }),
        );
        await boundary.run(
          database.insert(eventHeroKillTable).values({
            id: `kill-${key}`,
            heroNpcId: `hero-${key}`,
            minSpawnTimeAtKill: now,
            maxSpawnTimeAtKill: now,
          }),
        );
        await boundary.run(
          database.insert(eventKillPointTable).values({
            id: `point-${key}`,
            killId: `kill-${key}`,
            memberId: 1,
            basePoints: 10,
            points: 10,
            timeOnMapSeconds: 60,
            afkPercentage: 0,
            wasPresent: true,
          }),
        );
        await boundary.run(
          database.insert(eventRankingTable).values({
            id: `ranking-${key}`,
            eventId: "event-1",
            memberId: 1,
            heroNpcName: hero.npcName,
            totalPoints: 10,
            totalKills: 1,
            updatedAt: now,
          }),
        );
      }

      await test(boundary);
    } finally {
      await boundary.dispose();
    }
  };

  const readHistory = (boundary: DatabaseBoundary) => {
    const { database } = boundary;

    return Promise.all([
      boundary.run(
        database
          .select({ id: eventHeroKillTable.id })
          .from(eventHeroKillTable)
          .orderBy(asc(eventHeroKillTable.id)),
      ),
      boundary.run(
        database
          .select({ id: eventKillPointTable.id })
          .from(eventKillPointTable)
          .orderBy(asc(eventKillPointTable.id)),
      ),
      boundary.run(
        database
          .select({ id: eventMapAssignmentHistoryTable.id })
          .from(eventMapAssignmentHistoryTable)
          .orderBy(asc(eventMapAssignmentHistoryTable.id)),
      ),
      boundary.run(
        database
          .select({
            heroNpcName: eventRankingTable.heroNpcName,
            totalPoints: eventRankingTable.totalPoints,
          })
          .from(eventRankingTable)
          .orderBy(asc(eventRankingTable.id)),
      ),
    ]).then(([kills, points, assignments, rankings]) => ({
      kills: kills.map(({ id }) => id),
      points: points.map(({ id }) => id),
      assignments: assignments.map(({ id }) => id),
      rankings,
    }));
  };

  const readCatalog = async (boundary: DatabaseBoundary) => {
    const { database } = boundary;

    return {
      heroes: await boundary.run(
        database
          .select({
            id: eventHeroNpcTable.id,
            npcId: eventHeroNpcTable.npcId,
            npcName: eventHeroNpcTable.npcName,
            npcIcon: eventHeroNpcTable.npcIcon,
          })
          .from(eventHeroNpcTable)
          .orderBy(asc(eventHeroNpcTable.npcName)),
      ),
      maps: await boundary.run(
        database
          .select({
            id: eventMapTable.id,
            heroNpcId: eventMapTable.heroNpcId,
            mapId: eventMapTable.mapId,
            mapName: eventMapTable.mapName,
          })
          .from(eventMapTable)
          .orderBy(asc(eventMapTable.mapId)),
      ),
    };
  };

  const updateHeroList = (
    boundary: DatabaseBoundary,
    heroNpcs: UpdateEventRequest["heroNpcs"],
  ) =>
    boundary.run(
      makeEventUpdate(
        boundary.database,
        redis,
        makeEventsCatalogRead(
          boundary.database,
          {
            getOrSetJsonEffect: () =>
              Effect.die("Mutation hydration must read durable state"),
          },
          logger,
        ),
        logger,
      )({ id: "guild-1" }, "event-1", { heroNpcs }, [], managePolicy),
    );

  it("keeps hero and map identities and history when the list is resent unchanged", () =>
    withSeededEvent(async (boundary) => {
      const history = await readHistory(boundary);
      const catalog = await readCatalog(boundary);

      await updateHeroList(boundary, storedHeroList);

      expect(await readCatalog(boundary)).toEqual(catalog);
      expect(await readHistory(boundary)).toEqual(history);
    }));

  it("adds heroes and maps and renames a map without touching unrelated history", () =>
    withSeededEvent(async (boundary) => {
      const history = await readHistory(boundary);

      const updated = await updateHeroList(boundary, [
        {
          npcId: 10,
          npcName: "Kotołak",
          maps: [
            { mapId: 100, mapName: "Las Szeptów" },
            { mapId: 101, mapName: "Polana" },
          ],
        },
        storedHeroList[1],
        { npcName: "Nowy", maps: [{ mapId: 300, mapName: "Wieża" }] },
      ]);

      expect(await readHistory(boundary)).toEqual(history);

      const { heroes, maps } = await readCatalog(boundary);
      const added = heroes.find((hero) => hero.npcName === "Nowy");

      expect(heroes).toEqual([
        { id: "hero-a", npcId: 10, npcName: "Kotołak", npcIcon: "a.gif" },
        { id: "hero-b", npcId: 20, npcName: "Mietek", npcIcon: "b.gif" },
        {
          id: expect.any(String),
          npcId: null,
          npcName: "Nowy",
          npcIcon: null,
        },
      ]);
      expect(maps).toEqual([
        {
          id: "map-a",
          heroNpcId: "hero-a",
          mapId: 100,
          mapName: "Las Szeptów",
        },
        {
          id: expect.any(String),
          heroNpcId: "hero-a",
          mapId: 101,
          mapName: "Polana",
        },
        { id: "map-b", heroNpcId: "hero-b", mapId: 200, mapName: "Jaskinia" },
        {
          id: expect.any(String),
          heroNpcId: added?.id,
          mapId: 300,
          mapName: "Wieża",
        },
      ]);
      expect(updated.heroNpcs.map((hero) => hero.npcName)).toEqual(
        expect.arrayContaining(["Kotołak", "Mietek", "Nowy"]),
      );
    }));

  it.each([
    { name: "a hero", heroNpcs: [storedHeroList[0]] },
    {
      name: "a map",
      heroNpcs: [{ ...storedHeroList[0], maps: [] }, storedHeroList[1]],
    },
  ])(
    "rejects a list that omits $name without deleting anything",
    ({ heroNpcs }) =>
      withSeededEvent(async (boundary) => {
        const history = await readHistory(boundary);
        const catalog = await readCatalog(boundary);

        await expect(updateHeroList(boundary, heroNpcs)).rejects.toBeInstanceOf(
          InvalidRequestError,
        );

        expect(await readCatalog(boundary)).toEqual(catalog);
        expect(await readHistory(boundary)).toEqual(history);
      }),
  );

  it("deletes a hero with its history and ranking while keeping other heroes", () =>
    withSeededEvent(async (boundary) => {
      await boundary.run(
        makeEventCatalogMutations(boundary.database, redis, logger).deleteHero(
          { id: "guild-1" },
          "event-1",
          "hero-a",
        ),
      );

      expect(await readHistory(boundary)).toEqual({
        kills: ["kill-b"],
        points: ["point-b"],
        assignments: ["assignment-b"],
        rankings: [{ heroNpcName: "Mietek", totalPoints: 10 }],
      });
      expect((await readCatalog(boundary)).maps).toEqual([
        { id: "map-b", heroNpcId: "hero-b", mapId: 200, mapName: "Jaskinia" },
      ]);
    }));
});
