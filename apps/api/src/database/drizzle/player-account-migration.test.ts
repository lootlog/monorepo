import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";

describe("unknown player account migration", () => {
  it("gives unknown-account snapshots the account and character id of their known character without losing references", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const resolutionIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('"PlayerAccountEvidence"'),
        ),
      );

      if (resolutionIndex < 0) {
        throw new Error("Unknown player account migration is missing");
      }

      for (const migration of migrations.slice(0, resolutionIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      await database.exec(`
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "Member" (id, "userId", "guildId", name, "updatedAt") VALUES (10, 'user', 'guild', 'Member', now());
        INSERT INTO "Loot" (id, "uniqueId", world, "gameVersion", source, location, "updatedAt")
        VALUES (100, 'first', 'test', 'pl', 'FIGHT', 'Map', now()), (101, 'second', 'test', 'pl', 'FIGHT', 'Map', now());
        INSERT INTO "PlayerSnapshot" (id, world, "accountId", "characterId", "snapshotHash", name, prof, icon, "createdAt")
        VALUES
          (1, 'test', 7, 70, 'hero', 'Hero', 'MAGE', '/m.gif', '2026-10-01'),
          (2, 'test', 0, 70, 'hero', 'Hero', 'MAGE', '/m.gif', '2026-10-01'),
          (3, 'test', 0, 70, 'hero-renamed', 'Renamed', 'MAGE', '/m.gif', '2026-10-01'),
          (4, 'test', 9, 120, 'truncated', 'Truncated', 'WARRIOR', '/w.gif', '2026-10-01'),
          (5, 'test', 0, 12, 'truncated', 'Truncated', 'WARRIOR', '/w.gif', '2026-10-01'),
          (6, 'test', 5, 12, 'other', 'Other', 'WARRIOR', '/w.gif', '2026-10-01'),
          (7, 'test', 0, 12, 'late', 'Truncated', 'WARRIOR', '/w.gif', '2026-11-10'),
          (8, 'test', 0, 33, 'unknown', 'Unknown', 'MAGE', '/m.gif', '2026-10-01'),
          (9, 'other', 0, 70, 'hero', 'Hero', 'MAGE', '/m.gif', '2026-10-01');
        INSERT INTO "LootPlayer" ("lootId", "playerSnapshotId", lvl)
        VALUES (100, 1, 50), (100, 5, 50), (101, 2, 51), (101, 3, 51), (101, 8, 51);
        INSERT INTO "OrganizationLootRecord" (id, "lootId", "guildId", "updatedAt", "lootWorld", "lootCreatedAt", "lootRarityMask", "npcTypeMask", "npcVisibility")
        VALUES (200, 101, 'guild', now(), 'test', now(), 0, 0, '{}');
        INSERT INTO "LootMapPlayer" ("organizationLootRecordId", "playerSnapshotId") VALUES (200, 1), (200, 2), (200, 5);
        INSERT INTO "Timer" ("createdById", "guildId", "npcId", world, "minSpawnTime", "maxSpawnTime", "updatedAt", npc, "timerKey", "actorCharacterSnapshotId")
        VALUES (10, 'guild', 1, 'test', now(), now(), now(), '{}', 'npc:1', 2);
        INSERT INTO "TimerHistoryEntry" ("guildId", world, "timerKey", "npcId", npc, action, "actorMemberId", "actorCharacterSnapshotId", "timerActorCharacterSnapshotId")
        VALUES ('guild', 'test', 'npc:1', 1, '{}', 'RESET', 10, 2, 5);
      `);

      await database.exec(migrations[resolutionIndex]!.sql.join("\n"));

      expect(
        (
          await database.query(
            `SELECT id, world, "accountId", "characterId" FROM "PlayerSnapshot" ORDER BY id`,
          )
        ).rows,
      ).toEqual([
        { id: 1, world: "test", accountId: 7, characterId: 70 },
        { id: 3, world: "test", accountId: 7, characterId: 70 },
        { id: 4, world: "test", accountId: 9, characterId: 120 },
        { id: 6, world: "test", accountId: 5, characterId: 12 },
        { id: 7, world: "test", accountId: 5, characterId: 12 },
        { id: 8, world: "test", accountId: 0, characterId: 33 },
        { id: 9, world: "other", accountId: 0, characterId: 70 },
      ]);
      expect(
        (
          await database.query(
            `SELECT "lootId", "playerSnapshotId" FROM "LootPlayer" ORDER BY "lootId", "playerSnapshotId"`,
          )
        ).rows,
      ).toEqual([
        { lootId: 100, playerSnapshotId: 1 },
        { lootId: 100, playerSnapshotId: 4 },
        { lootId: 101, playerSnapshotId: 1 },
        { lootId: 101, playerSnapshotId: 3 },
        { lootId: 101, playerSnapshotId: 8 },
      ]);
      expect(
        (
          await database.query(
            `SELECT "organizationLootRecordId", "playerSnapshotId" FROM "LootMapPlayer" ORDER BY "playerSnapshotId"`,
          )
        ).rows,
      ).toEqual([
        { organizationLootRecordId: 200, playerSnapshotId: 1 },
        { organizationLootRecordId: 200, playerSnapshotId: 4 },
      ]);
      expect(
        (await database.query(`SELECT "actorCharacterSnapshotId" FROM "Timer"`))
          .rows,
      ).toEqual([{ actorCharacterSnapshotId: 1 }]);
      expect(
        (
          await database.query(
            `SELECT "actorCharacterSnapshotId", "timerActorCharacterSnapshotId" FROM "TimerHistoryEntry"`,
          )
        ).rows,
      ).toEqual([
        { actorCharacterSnapshotId: 1, timerActorCharacterSnapshotId: 4 },
      ]);
    } finally {
      await database.close();
    }
  });
});
