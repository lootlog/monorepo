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

      for (const migration of migrations.slice(revisionIndex)) {
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
});
