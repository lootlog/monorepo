import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { GUILD_KILL_DAY_BACKFILL_SQL } from "#src/kills/guild-kill-day-backfill";

describe("guild kill day backfill", () => {
  it("rolls hourly buckets up into Warsaw days, merging the repeated hour of a 25-hour day and keeping the latest NPC description", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../drizzle/migrations", import.meta.url),
        ),
      });

      const dayIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('CREATE TABLE "GuildKillDay"'),
        ),
      );

      if (dayIndex < 0) throw new Error("Guild kill day migration is missing");

      for (const migration of migrations.slice(0, dayIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      // 2026-10-25 has 25 hours in Warsaw: 00:00Z and 01:00Z are both 02:00.
      // 22:00Z on the 24th is the 25th's midnight (CEST).
      await database.exec(`
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "GuildKillBucket" ("periodStart", "guildId", world, "npcId", "npcName", "npcType", "npcLvl", kills, "lastKilledAt") VALUES
          ('2026-10-24T22:00:00Z', 'guild', 'w', 1, 'Old name', 'HERO', 100, 1, '2026-10-24T22:00:00Z'),
          ('2026-10-25T00:00:00Z', 'guild', 'w', 1, 'New name', 'HERO', 101, 2, '2026-10-25T00:00:00Z'),
          ('2026-10-25T01:00:00Z', 'guild', 'w', 1, 'New name', 'HERO', 101, 4, '2026-10-25T01:00:00Z'),
          ('2026-10-25T01:00:00Z', 'guild', 'w', 2, 'Other', 'TITAN', 250, 8, '2026-10-25T01:00:00Z');
      `);

      await database.exec(migrations[dayIndex]!.sql.join("\n"));
      await database.query(GUILD_KILL_DAY_BACKFILL_SQL, ["guild"]);
      // Running it again replaces the rows instead of adding to them.
      await database.query(GUILD_KILL_DAY_BACKFILL_SQL, ["guild"]);

      const { rows } = await database.query(
        `SELECT "npcId", day::text AS day, "npcName", "npcLvl", kills, hours FROM "GuildKillDay" ORDER BY "npcId"`,
      );

      const hours = (counts: Record<number, number>) =>
        Array.from({ length: 24 }, (_, hour) => counts[hour] ?? 0);

      expect(rows).toEqual([
        {
          npcId: 1,
          day: "2026-10-25",
          npcName: "New name",
          npcLvl: 101,
          kills: 7,
          hours: hours({ 0: 1, 2: 6 }),
        },
        {
          npcId: 2,
          day: "2026-10-25",
          npcName: "Other",
          npcLvl: 250,
          kills: 8,
          hours: hours({ 2: 8 }),
        },
      ]);
    } finally {
      await database.close();
    }
  }, 60_000);
});
