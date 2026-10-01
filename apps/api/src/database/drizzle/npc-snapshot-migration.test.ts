import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";

describe("NPC observation revision migration", () => {
  it("preserves historical associations and permits new same-name revisions", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const revisionIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('ADD COLUMN "snapshotHash" text'),
        ),
      );

      if (revisionIndex < 0)
        throw new Error("NPC revision migration is missing");

      // The LOO-252 cleanup requires an edition on every linked revision,
      // which only the LOO-250 repair gave historical rows.
      const cleanupIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('DROP TABLE "LegacyRepairSnapshot"'),
        ),
      );

      if (cleanupIndex < 0) throw new Error("LOO-252 cleanup is missing");

      for (const migration of migrations.slice(0, revisionIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      await database.exec(`
        INSERT INTO "NpcSnapshot" (id, "npcId", name, lvl, type, icon)
        VALUES (100, 52950, 'Historical hero', 183, 'HERO', 'old.png');
        INSERT INTO "Loot" (id, "uniqueId", world, source, location, "updatedAt")
        VALUES (100, 'historical-loot', 'test', 'FIGHT', 'Map', now());
        INSERT INTO "LootNpc" ("lootId", "npcSnapshotId") VALUES (100, 100);
      `);

      const historicalQuery = `SELECT ns.id, ns."npcId", ns.name, ns.lvl, ns.icon,
          ns."createdAt", ln."lootId", ln."npcSnapshotId"
        FROM "LootNpc" ln JOIN "NpcSnapshot" ns ON ns.id = ln."npcSnapshotId"`;

      const before = await database.query(historicalQuery);

      for (const migration of migrations.slice(revisionIndex, cleanupIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      expect((await database.query(historicalQuery)).rows).toEqual(before.rows);
      expect(
        (
          await database.query(
            `SELECT "identityNamespace", world, "snapshotHash" FROM "NpcSnapshot" WHERE id = 100`,
          )
        ).rows,
      ).toEqual([
        { identityNamespace: "legacy", world: null, snapshotHash: null },
      ]);

      // This is the new writer's conflict target. Neither this insert nor its
      // duplicate may overwrite/relink the already accepted historical loot.
      await database.exec(`
        INSERT INTO "NpcSnapshot" ("npcId", name, lvl, type, world, "snapshotHash")
        VALUES (52950, 'Historical hero', 210, 'HERO', 'test', 'new-observation')
        ON CONFLICT ("npcId", "snapshotHash") DO NOTHING;
        INSERT INTO "NpcSnapshot" ("npcId", name, lvl, type, world, "snapshotHash")
        VALUES (52950, 'Historical hero', 210, 'HERO', 'test', 'new-observation')
        ON CONFLICT ("npcId", "snapshotHash") DO NOTHING;
      `);
      expect(
        (await database.query(`SELECT lvl FROM "NpcSnapshot" ORDER BY lvl`))
          .rows,
      ).toEqual([{ lvl: 183 }, { lvl: 210 }]);
      expect((await database.query(historicalQuery)).rows).toEqual(before.rows);
    } finally {
      await database.close();
    }
  });

  it("deletes only unlinked revisions that repeat a linked revision", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const deletionIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) => statement.includes('AS "linked"')),
      );

      if (deletionIndex < 0)
        throw new Error("Duplicate revision deletion is missing");

      for (const migration of migrations.slice(0, deletionIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      // 1 is linked, 2 repeats it, 3 differs in level and 4 repeats only the
      // unlinked 3; items follow the same pattern with their stats.
      await database.exec(`
        INSERT INTO "Loot" (id, "uniqueId", world, "gameVersion", source, location, "updatedAt")
        VALUES (100, 'loot', 'test', 'pl', 'FIGHT', 'Map', now());
        INSERT INTO "NpcSnapshot" (id, "npcId", "identityNamespace", "gameVersion", "snapshotHash", name, lvl, type, icon, prof)
        VALUES
          (1, 52950, 'template', 'pl', 'linked', 'Hero', 183, 'HERO', 'her/a.gif', NULL),
          (2, 52950, 'template', 'pl', 'per-world', 'Hero', 183, 'HERO', 'her/a.gif', NULL),
          (3, 52950, 'template', 'pl', 'other-level', 'Hero', 184, 'HERO', 'her/a.gif', NULL),
          (4, 52950, 'template', 'pl', 'other-level-copy', 'Hero', 184, 'HERO', 'her/a.gif', NULL);
        INSERT INTO "LootNpc" ("lootId", "npcSnapshotId") VALUES (100, 1);
        INSERT INTO "ItemSnapshot" (id, "itemId", "gameVersion", "statsHash", "snapshotHash", name, icon, "itemType", "statRaw", "statsSnapshot")
        VALUES
          (1, 1147, 'pl', 'stats', 'linked', 'Item', 'tar/a.gif', 'SHIELD', 'ac=1', '{}'),
          (2, 1147, 'pl', 'stats', NULL, 'Item', 'tar/a.gif', 'SHIELD', 'ac=1', '{}'),
          (3, 1147, 'pl', 'other-stats', NULL, 'Item', 'tar/a.gif', 'SHIELD', 'ac=2', '{}');
        INSERT INTO "LootItem" ("lootId", "itemSnapshotId", hid) VALUES (100, 1, 'hid');
      `);

      for (const migration of migrations.slice(deletionIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      expect(
        (await database.query(`SELECT id FROM "NpcSnapshot" ORDER BY id`)).rows,
      ).toEqual([{ id: 1 }, { id: 3 }, { id: 4 }]);
      expect(
        (await database.query(`SELECT id FROM "ItemSnapshot" ORDER BY id`))
          .rows,
      ).toEqual([{ id: 1 }, { id: 3 }]);
    } finally {
      await database.close();
    }
  });
});
