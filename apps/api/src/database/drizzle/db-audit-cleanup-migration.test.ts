import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";

describe("database audit cleanup migration", () => {
  it("deletes only loots without an Organization record and the snapshots only they referenced", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const cleanupIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) => statement.includes('"OrphanLoot"')),
      );

      if (cleanupIndex < 0) throw new Error("Audit cleanup is missing");

      for (const migration of migrations.slice(0, cleanupIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      // Loot 100 has a record; 101 has none. Snapshots 1 are shared by both,
      // 2 only belong to 101, and player 3 is also a timer actor.
      await database.exec(`
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "Member" (id, "userId", "guildId", name, "updatedAt") VALUES (10, 'user', 'guild', 'Member', now());
        INSERT INTO "Loot" (id, "uniqueId", world, "gameVersion", source, location, "updatedAt")
        VALUES (100, 'kept', 'test', 'pl', 'FIGHT', 'Map', now()), (101, 'orphan', 'test', 'pl', 'FIGHT', 'Map', now());
        INSERT INTO "OrganizationLootRecord" (id, "lootId", "guildId", "updatedAt") VALUES (200, 100, 'guild', now());
        INSERT INTO "LootSubmission" ("organizationLootRecordId", "memberId", "updatedAt") VALUES (200, 10, now());
        INSERT INTO "ItemSnapshot" (id, "itemId", "gameVersion", "statsHash", "snapshotHash", name, icon, "statRaw", "statsSnapshot")
        VALUES (1, 1, 'pl', 's1', 'h1', 'Shared', 'a.gif', '', '{}'), (2, 2, 'pl', 's2', 'h2', 'Orphan', 'b.gif', '', '{}');
        INSERT INTO "LootItem" ("lootId", "itemSnapshotId", hid) VALUES (100, 1, 'a'), (101, 1, 'b'), (101, 2, 'c');
        INSERT INTO "NpcSnapshot" (id, "npcId", "gameVersion", "snapshotHash", name)
        VALUES (1, 1, 'pl', 'h1', 'Shared'), (2, 2, 'pl', 'h2', 'Orphan');
        INSERT INTO "LootNpc" ("lootId", "npcSnapshotId") VALUES (100, 1), (101, 1), (101, 2);
        INSERT INTO "PlayerSnapshot" (id, world, "accountId", "characterId", "snapshotHash", name)
        VALUES (1, 'test', 1, 1, 'h1', 'Shared'), (2, 'test', 2, 2, 'h2', 'Orphan'), (3, 'test', 3, 3, 'h3', 'Timer actor');
        INSERT INTO "LootPlayer" ("lootId", "playerSnapshotId") VALUES (100, 1), (101, 1), (101, 2), (101, 3);
        INSERT INTO "Timer" ("createdById", "guildId", "npcId", world, "minSpawnTime", "maxSpawnTime", "updatedAt", npc, "timerKey", "actorCharacterSnapshotId")
        VALUES (10, 'guild', 1, 'test', now(), now(), now(), '{}', 'npc:1', 3);
        INSERT INTO "UserSettingDocument" ("userId", domain, "scopeType", "scopeId", "updatedAt")
        VALUES ('user', 'timers', 'GUILD', 'guild', now()), ('user', 'timers', 'GUILD', 'missing', now());
      `);

      await database.exec(migrations[cleanupIndex]!.sql.join("\n"));

      const ids = async (query: string) =>
        (await database.query<{ id: number | string }>(query)).rows.map(
          ({ id }) => id,
        );

      expect(await ids(`SELECT id FROM "Loot" ORDER BY id`)).toEqual([100]);
      expect(
        await ids(`SELECT "lootId" AS id FROM "LootItem" ORDER BY id`),
      ).toEqual([100]);
      expect(
        await ids(`SELECT "memberId" AS id FROM "LootSubmission"`),
      ).toEqual([10]);
      expect(await ids(`SELECT id FROM "ItemSnapshot" ORDER BY id`)).toEqual([
        1,
      ]);
      expect(await ids(`SELECT id FROM "NpcSnapshot" ORDER BY id`)).toEqual([
        1,
      ]);
      expect(await ids(`SELECT id FROM "PlayerSnapshot" ORDER BY id`)).toEqual([
        1, 3,
      ]);
      expect(
        await ids(`SELECT "scopeId" AS id FROM "UserSettingDocument"`),
      ).toEqual(["guild"]);
    } finally {
      await database.close();
    }
  });
});
