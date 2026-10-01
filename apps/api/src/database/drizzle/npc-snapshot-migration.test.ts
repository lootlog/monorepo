import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { createNpcSnapshotHash } from "@lootlog/database/snapshot-hash";
import { GameVersion } from "@lootlog/schema/game-version";

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

  it("stores relative NPC icons and merges revisions that only differed in the icon form", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const repairIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('CREATE TEMPORARY TABLE "NpcIconRepair"'),
        ),
      );

      if (repairIndex < 0) throw new Error("NPC icon repair is missing");

      for (const migration of migrations.slice(0, repairIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      const cdn = "https://micc.garmory-cdn.cloud/obrazki/npc/";

      const revision = (
        id: number,
        icon: string,
        observation: Partial<Parameters<typeof createNpcSnapshotHash>[0]> = {},
      ) => {
        const values = {
          identityNamespace: "template",
          gameVersion: GameVersion.PL,
          npcId: 25_124,
          name: "Rycerz z za małym mieczem",
          type: "ELITE2",
          lvl: 214,
          icon,
          prof: "WARRIOR",
          wt: 25,
          margonemType: 5,
          ...observation,
        };

        return { id, ...values, snapshotHash: createNpcSnapshotHash(values) };
      };

      // The legacy name exercises JSON escaping of quotes, backslashes and
      // non-ASCII text in the SQL hash.
      const bragarth = {
        identityNamespace: "legacy",
        npcId: 227_436,
        name: 'Bragarth "Myśliwy" \\ Dusz',
        type: "HERO",
        lvl: 170,
        prof: "HUNTER",
        wt: 81,
        margonemType: 2,
      };

      const altar = {
        npcId: 83_157,
        name: "Ołtarz Pajęczej Bogini",
        lvl: null,
        prof: null,
        wt: null,
      };

      const revisions = [
        // 1 has more links than its relative twin 2 and absorbs it.
        revision(1, `${cdn}e2/praork.gif`, bragarth),
        revision(2, "e2/praork.gif", bragarth),
        // 3 has fewer links than its relative twin 4 and merges into it.
        revision(3, `${cdn}e2/pajeczy16.gif`),
        revision(4, "e2/pajeczy16.gif"),
        // 5 has no twin; 6 is another graphic variant and stays separate.
        revision(
          5,
          "//micc.garmory-cdn.cloud/obrazki/npc/mas/oltarz.gif",
          altar,
        ),
        revision(6, "mas/oltarz2.gif", altar),
        revision(7, "../img/def-npc-sprite.gif", { npcId: 9 }),
        {
          ...revision(8, `${cdn}hum/gnoll21.gif`, { npcId: 10 }),
          snapshotHash: null,
        },
        revision(9, "/hum/gnoll14.gif", { npcId: 11 }),
      ];

      for (const row of revisions) {
        await database.query(
          `INSERT INTO "NpcSnapshot" (id, "identityNamespace", "gameVersion", "npcId", name, type, lvl, icon, prof, wt, "margonemType", "snapshotHash")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            row.id,
            row.identityNamespace,
            row.gameVersion,
            row.npcId,
            row.name,
            row.type,
            row.lvl,
            row.icon,
            row.prof,
            row.wt,
            row.margonemType,
            row.snapshotHash,
          ],
        );
      }

      const timerNpc = {
        id: 1,
        name: "Ołtarz Pajęczej Bogini",
        // Some timers carry the directory prefix twice.
        icon: `${cdn}${cdn}mas/oltarz.gif`,
        lvl: 220,
      };

      await database.exec(`
        INSERT INTO "Loot" (id, "uniqueId", world, "gameVersion", source, location, "updatedAt")
        SELECT id, 'loot-' || id, 'test', 'pl', 'FIGHT', 'Map', now() FROM generate_series(1, 7) AS id;
        INSERT INTO "LootNpc" ("lootId", "npcSnapshotId")
        VALUES (1, 1), (2, 1), (3, 2), (4, 3), (5, 4), (6, 4), (7, 5);
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "Member" (id, "userId", "guildId", name, "updatedAt") VALUES (1, 'user', 'guild', 'Member', now());
        INSERT INTO "Event" (id, "guildId", name, world, "updatedAt") VALUES ('event', 'guild', 'Event', 'test', now());
        INSERT INTO "EventHeroNpc" (id, "eventId", "npcName", "npcIcon")
        VALUES ('cdn', 'event', 'Kasim', '${cdn}her/ksiaze.gif'), ('relative', 'event', 'Mamuna', 'hum/mamuna.gif');
      `);

      for (const [timerKey, npc] of [
        ["cdn", timerNpc],
        ["relative", { ...timerNpc, icon: "mas/oltarz.gif" }],
      ] as const) {
        await database.query(
          `INSERT INTO "Timer" ("createdById", "guildId", "npcId", "timerKey", world, "minSpawnTime", "maxSpawnTime", npc, "updatedAt")
          VALUES (1, 'guild', 1, $1, 'test', now(), now(), $2, '2026-01-01T00:00:00Z')`,
          [timerKey, npc],
        );
        await database.query(
          `INSERT INTO "TimerHistoryEntry" ("guildId", world, "timerKey", "npcId", npc, action, "actorMemberId")
          VALUES ('guild', 'test', $1, 1, $2, 'CREATE', 1)`,
          [timerKey, npc],
        );
      }

      for (const migration of migrations.slice(repairIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      const stored = await database.query<{
        id: number;
        icon: string;
        snapshotHash: string | null;
      }>(`SELECT id, icon, "snapshotHash" FROM "NpcSnapshot" ORDER BY id`);

      expect(stored.rows).toEqual(
        [
          revision(1, "e2/praork.gif", bragarth),
          revision(4, "e2/pajeczy16.gif"),
          revision(5, "mas/oltarz.gif", altar),
          revision(6, "mas/oltarz2.gif", altar),
          revision(7, "../img/def-npc-sprite.gif", { npcId: 9 }),
          { id: 8, icon: "hum/gnoll21.gif", snapshotHash: null },
          revision(9, "hum/gnoll14.gif", { npcId: 11 }),
        ].map(({ id, icon, snapshotHash }) => ({ id, icon, snapshotHash })),
      );
      expect(
        (
          await database.query(
            `SELECT "lootId", "npcSnapshotId" FROM "LootNpc" ORDER BY "lootId"`,
          )
        ).rows,
      ).toEqual(
        [1, 1, 1, 4, 4, 4, 5].map((npcSnapshotId, index) => ({
          lootId: index + 1,
          npcSnapshotId,
        })),
      );

      const relativeTimerNpc = { ...timerNpc, icon: "mas/oltarz.gif" };

      expect(
        (
          await database.query(
            `SELECT "timerKey", npc, "updatedAt" FROM "Timer" ORDER BY "timerKey"`,
          )
        ).rows,
      ).toEqual(
        ["cdn", "relative"].map((timerKey) => ({
          timerKey,
          npc: relativeTimerNpc,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        })),
      );
      expect(
        (
          await database.query(
            `SELECT npc FROM "TimerHistoryEntry" ORDER BY "timerKey"`,
          )
        ).rows,
      ).toEqual([{ npc: relativeTimerNpc }, { npc: relativeTimerNpc }]);
      expect(
        (
          await database.query(
            `SELECT "npcIcon" FROM "EventHeroNpc" ORDER BY id`,
          )
        ).rows,
      ).toEqual([{ npcIcon: "her/ksiaze.gif" }, { npcIcon: "hum/mamuna.gif" }]);
    } finally {
      await database.close();
    }
  });
});
