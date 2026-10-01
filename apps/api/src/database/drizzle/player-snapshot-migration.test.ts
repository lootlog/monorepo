import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";

describe("player snapshot merge migration", () => {
  it("moves every reference to the kept snapshot and deletes unreferenced ones", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const mergeIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('"PlayerSnapshotMerge"'),
        ),
      );

      if (mergeIndex < 0) throw new Error("Player snapshot merge is missing");

      for (const migration of migrations.slice(0, mergeIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      // 1 and 2 hold the same content under both legacy hashes; 2 is linked
      // from a loot, a timer and its history. 3 is the same character after a
      // rename, 4 a timer actor nothing references any more.
      await database.exec(`
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "Member" (id, "userId", "guildId", name, "updatedAt") VALUES (10, 'user', 'guild', 'Member', now());
        INSERT INTO "Loot" (id, "uniqueId", world, "gameVersion", source, location, "updatedAt")
        VALUES (100, 'first', 'test', 'pl', 'FIGHT', 'Map', now()), (101, 'second', 'test', 'pl', 'FIGHT', 'Map', now());
        INSERT INTO "PlayerSnapshot" (id, world, "accountId", "characterId", "snapshotHash", name, prof, icon)
        VALUES
          (1, 'test', 7, 70, 'full-profession', 'Hero', 'MAGE', '/m.gif'),
          (2, 'test', 7, 70, 'shortname', 'Hero', 'MAGE', '/m.gif'),
          (3, 'test', 7, 70, 'renamed', 'Renamed', 'MAGE', '/m.gif'),
          (4, 'test', 8, 80, 'timer-actor', 'Gone', 'WARRIOR', '/w.gif');
        INSERT INTO "LootPlayer" ("lootId", "playerSnapshotId", lvl) VALUES (100, 1, 50), (101, 2, 51), (101, 3, 51);
        INSERT INTO "Timer" ("createdById", "guildId", "npcId", world, "minSpawnTime", "maxSpawnTime", "updatedAt", npc, "timerKey", "actorCharacterSnapshotId")
        VALUES (10, 'guild', 1, 'test', now(), now(), now(), '{}', 'npc:1', 2);
        INSERT INTO "TimerHistoryEntry" ("guildId", world, "timerKey", "npcId", npc, action, "actorMemberId", "actorCharacterSnapshotId", "timerActorCharacterSnapshotId")
        VALUES ('guild', 'test', 'npc:1', 1, '{}', 'RESET', 10, 2, 2);
      `);

      for (const migration of migrations.slice(mergeIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      expect(
        (await database.query(`SELECT id FROM "PlayerSnapshot" ORDER BY id`))
          .rows,
      ).toEqual([{ id: 1 }, { id: 3 }]);
      expect(
        (
          await database.query(
            `SELECT "lootId", "playerSnapshotId" FROM "LootPlayer" ORDER BY "lootId", "playerSnapshotId"`,
          )
        ).rows,
      ).toEqual([
        { lootId: 100, playerSnapshotId: 1 },
        { lootId: 101, playerSnapshotId: 1 },
        { lootId: 101, playerSnapshotId: 3 },
      ]);
      // Timer references are ON DELETE SET NULL, so a merged row deleted
      // before its timers move would silently drop the actor.
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
        { actorCharacterSnapshotId: 1, timerActorCharacterSnapshotId: 1 },
      ]);
    } finally {
      await database.close();
    }
  });
});
