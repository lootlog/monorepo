import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventMapTable,
  eventTable,
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  memberTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { makeEventWrappedStore } from "#src/events/wrapped/event-wrapped.repository";
import { makeEventWrapped } from "#src/events/wrapped/event-wrapped.service";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootsOperations } from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { applicationLogger } from "#src/shared/application-logger";

const eventStart = new Date("2026-06-01T00:00:00.000Z");

const eventEnd = new Date("2026-06-02T00:00:00.000Z");

const minute = (value: number) =>
  new Date(eventStart.getTime() + value * 60_000);

const millisecond = (value: Date, offset: number) =>
  new Date(value.getTime() + offset);

describe("event wrapped summary", () => {
  it("attributes visible loots and counts maps assigned during spawn windows at their exact bounds", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = eventStart;

      const [guild] = await run(
        database
          .insert(guildTable)
          .values([
            {
              id: "wrapped",
              name: "Wrapped",
              ownerId: "owner",
              updatedAt: now,
            },
            { id: "other", name: "Other", ownerId: "owner", updatedAt: now },
          ])
          .returning(),
      );

      if (!guild) throw new Error("Expected Organization");

      const [midLevelHeroes] = await run(
        database
          .insert(roleTable)
          .values({
            id: "mid-heroes",
            guildId: guild.id,
            name: "Mid heroes",
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_HEROES_READ,
            ],
            lvlRangeFrom: 0,
            lvlRangeTo: 150,
            updatedAt: now,
          })
          .returning(),
      );

      if (!midLevelHeroes) throw new Error("Expected role");

      await run(
        database.insert(memberTable).values([
          { id: 1, userId: "a", guildId: guild.id, name: "A", updatedAt: now },
          { id: 2, userId: "b", guildId: guild.id, name: "B", updatedAt: now },
        ]),
      );
      await run(
        database.insert(eventTable).values({
          id: "event",
          guildId: guild.id,
          name: "Event",
          world: "world",
          startsAt: eventStart,
          endsAt: eventEnd,
          updatedAt: now,
        }),
      );
      await run(
        database.insert(eventHeroNpcTable).values([
          { id: "patryk", eventId: "event", npcName: "Mroczny Patryk" },
          { id: "zlodziej", eventId: "event", npcName: "Złodziej" },
          { id: "absent", eventId: "event", npcName: "Nieobecny" },
        ]),
      );
      await run(
        database.insert(eventMapTable).values(
          ["m1", "m2", "m3", "m4"].map((id, index) => ({
            id,
            heroNpcId: index < 2 ? "patryk" : "zlodziej",
            mapId: index,
            mapName: id,
            updatedAt: now,
          })),
        ),
      );

      // Each window's bounds are inclusive; one assignment per map makes every
      // wrongly included or excluded assignment change the map totals.
      await run(
        database.insert(eventHeroKillTable).values([
          {
            id: "window",
            heroNpcId: "patryk",
            minSpawnTimeAtKill: minute(10),
            killedAt: minute(20),
            maxSpawnTimeAtKill: minute(20),
          },
          {
            // Killed before its minimum spawn time: only an assignment spanning
            // the inverted range covers it.
            id: "inverted",
            heroNpcId: "zlodziej",
            minSpawnTimeAtKill: minute(50),
            killedAt: minute(40),
            maxSpawnTimeAtKill: minute(40),
          },
          {
            id: "instant",
            heroNpcId: "patryk",
            minSpawnTimeAtKill: minute(60),
            killedAt: minute(60),
            maxSpawnTimeAtKill: minute(60),
          },
        ]),
      );

      const assignment = (
        id: string,
        memberId: number,
        mapId: string,
        assignedAt: Date,
        unassignedAt: Date | null,
      ) => ({
        id,
        memberId,
        mapId,
        heroNpcId: mapId === "m1" || mapId === "m2" ? "patryk" : "zlodziej",
        assignedAt,
        unassignedAt,
      });

      await run(
        database
          .insert(eventMapAssignmentHistoryTable)
          .values([
            assignment("ends-at-min-spawn", 1, "m1", minute(0), minute(10)),
            assignment("starts-at-kill", 1, "m2", minute(20), minute(30)),
            assignment(
              "ends-before-min-spawn",
              2,
              "m3",
              minute(0),
              millisecond(minute(10), -1),
            ),
            assignment(
              "open-after-kill",
              2,
              "m4",
              millisecond(minute(20), 1),
              null,
            ),
            assignment(
              "ends-inside-inverted",
              2,
              "m3",
              minute(35),
              millisecond(minute(50), -1),
            ),
            assignment("spans-inverted", 1, "m1", minute(30), minute(50)),
            assignment("instant", 1, "m2", minute(60), minute(60)),
          ]),
      );

      await run(
        database.insert(npcSnapshotTable).values([
          {
            id: 1,
            npcId: 1,
            name: "Mroczny Patryk",
            type: "HERO",
            lvl: 90,
            gameVersion: "pl",
          },
          {
            id: 2,
            npcId: 2,
            name: "Mroczny Patryk",
            type: "HERO",
            lvl: 90,
            gameVersion: "pl",
          },
          {
            id: 3,
            npcId: 3,
            name: "mroczny patryk",
            type: "HERO",
            lvl: 90,
            gameVersion: "pl",
          },
          {
            id: 4,
            npcId: 4,
            name: "Złodziej",
            type: "HERO",
            lvl: 200,
            gameVersion: "pl",
          },
          {
            id: 5,
            npcId: 5,
            name: "Kompan",
            type: "COMMON",
            lvl: 80,
            gameVersion: "pl",
          },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values(
          (["UNIQUE", "HEROIC", "LEGENDARY", "UPGRADED", null] as const).map(
            (rarity, index) => ({
              id: index + 1,
              itemId: index + 1,
              statsHash: `item-${index + 1}`,
              name: `Item ${index + 1}`,
              icon: "",
              rarity,
              statRaw: "",
              statsSnapshot: {},
              gameVersion: "pl" as const,
            }),
          ),
        ),
      );

      const loots = [
        // Both window bounds are inclusive.
        { npcs: [1], items: [1, 2, 3, 4], createdAt: eventStart },
        // A hero named twice, or in another case, counts the loot twice.
        { npcs: [1, 2], items: [3] },
        { npcs: [1, 3], items: [1], createdAt: eventEnd },
        { npcs: [1, 5], items: [2, 5] },
        // Above the role's level range.
        { npcs: [4], items: [1] },
        { npcs: [1], items: [1], createdAt: millisecond(eventEnd, 1) },
        { npcs: [1], items: [1], archived: true },
        { npcs: [1], items: [1], guildId: "other" },
        { npcs: [1], items: [1], world: "elsewhere" },
        { npcs: [5], items: [1] },
      ];

      await run(
        database.insert(lootTable).values(
          loots.map((loot, index) => ({
            id: index + 1,
            uniqueId: `loot-${index + 1}`,
            world: loot.world ?? "world",
            gameVersion: "pl" as const,
            source: "FIGHT" as const,
            location: "Map",
            createdAt: loot.createdAt ?? minute(90),
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          loots.map((loot, index) => ({
            lootId: index + 1,
            guildId: loot.guildId ?? guild.id,
            archivedAt: loot.archived ? now : null,
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(lootNpcTable).values(
          loots.flatMap((loot, index) =>
            loot.npcs.map((npcSnapshotId) => ({
              lootId: index + 1,
              npcSnapshotId,
            })),
          ),
        ),
      );
      await run(
        database.insert(lootItemTable).values(
          loots.flatMap((loot, index) =>
            loot.items.map((itemSnapshotId, item) => ({
              lootId: index + 1,
              itemSnapshotId,
              hid: `hid-${index + 1}-${item}`,
            })),
          ),
        ),
      );

      const wrapped = makeEventWrapped(
        makeEventWrappedStore(database),
        { getJson: async () => null, setJson: async () => undefined },
        makeLootsOperations({
          persistence: makeLootPersistence(database),
          query: makeLootQueryOperations(makeLootQueryPersistence(database)),
          stats: { invalidateCache: () => Effect.void },
          redis: {
            invalidateScopes: async () => undefined,
            getOrSetJsonEffect: (options) => options.factory,
          },
          logger: applicationLogger,
        }),
      );

      const owner = await run(
        wrapped.getWrapped(guild, "event", [Permission.OWNER], []),
      );

      expect(owner.loot).toEqual({
        totalLoots: 5,
        rarityTotals: { unique: 4, heroic: 2, legendary: 3 },
        heroBreakdown: [
          {
            heroNpcId: "patryk",
            npcName: "Mroczny Patryk",
            npcIcon: null,
            totalLoots: 6,
            rarityTotals: { unique: 3, heroic: 2, legendary: 3 },
          },
          {
            heroNpcId: "zlodziej",
            npcName: "Złodziej",
            npcIcon: null,
            totalLoots: 1,
            rarityTotals: { unique: 1, heroic: 0, legendary: 0 },
          },
          {
            heroNpcId: "absent",
            npcName: "Nieobecny",
            npcIcon: null,
            totalLoots: 0,
            rarityTotals: { unique: 0, heroic: 0, legendary: 0 },
          },
        ],
      });

      const member = await run(
        wrapped.getWrapped(
          guild,
          "event",
          [Permission.LOOTLOG_LOOTS_READ],
          [midLevelHeroes],
        ),
      );

      expect(member.overview).toMatchObject({
        totalLoots: 4,
        rarityTotals: { unique: 3, heroic: 2, legendary: 3 },
      });
      expect(
        Object.fromEntries(
          member.loot.heroBreakdown.map(({ heroNpcId, totalLoots }) => [
            heroNpcId,
            totalLoots,
          ]),
        ),
      ).toEqual({ patryk: 6, zlodziej: 0, absent: 0 });

      // Maps per window: {m1, m2}, {m4, m1} and {m4, m2}. A alone covers two
      // maps in one window; B's included assignments cover one map each.
      expect(owner.overview.avgMapsPerSpawnWindow).toBe(2);
      expect(owner.leaders.mostFlexible).toEqual({
        winner: {
          memberId: 1,
          name: "A",
          avatar: null,
          primaryValue: 2,
          secondaryValue: 1.33,
        },
        candidateCount: 2,
        tiedWinnerCount: 1,
      });
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});
