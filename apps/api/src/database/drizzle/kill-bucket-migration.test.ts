import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readMigrationFiles } from "drizzle-orm/migrator";

describe("kill bucket migration", () => {
  it("copies closed hours and totals, the follow-up adds the kills recorded after the copy, and the drop requires the follow-up to have committed", async () => {
    const database = new PGlite({ extensions: { pg_trgm } });

    try {
      const migrations = readMigrationFiles({
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle/migrations", import.meta.url),
        ),
      });

      const conversionIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) =>
          statement.includes('CREATE TABLE "KillBucketCutover"'),
        ),
      );

      const reconcileIndex = migrations.findIndex((migration) =>
        migration.sql.some((statement) => statement.includes('"LateUserKill"')),
      );

      if (conversionIndex < 0 || reconcileIndex !== conversionIndex + 1)
        throw new Error("Kill bucket migrations are missing");

      for (const migration of migrations.slice(0, conversionIndex)) {
        await database.exec(migration.sql.join("\n"));
      }

      // Member 10 has 2 kills before buckets existed, 3 in a closed hour and 4
      // in the cutover hour. Member 11's lifetime counter was deleted with its
      // account, leaving a 5-kill bucket behind.
      await database.exec(`
        CREATE TEMPORARY TABLE hours AS SELECT
          date_trunc('hour', now() AT TIME ZONE 'UTC') - interval '2 hours' AS closed,
          date_trunc('hour', now() AT TIME ZONE 'UTC') AS cutover;
        INSERT INTO "Guild" (id, name, "ownerId", "updatedAt") VALUES ('guild', 'Guild', 'owner', now());
        INSERT INTO "Member" (id, "userId", "guildId", name, "updatedAt")
        VALUES (10, 'kept', 'guild', 'Kept', now()), (11, 'deleted', 'guild', 'Deleted', now());
        INSERT INTO "UserKillStats" (id, "userId", world, "npcId", "npcName", "npcType", "npcLvl", "totalKills", "lastKilledAt", "updatedAt")
        SELECT 'u', 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 9, cutover, now() FROM hours;
        INSERT INTO "UserKillStatsBucket" (id, "userId", world, "npcId", "npcName", "npcType", "npcLvl", "totalKills", "periodStart", "lastKilledAt", "updatedAt")
        SELECT 'u1', 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 3, closed, closed, now() FROM hours
        UNION ALL SELECT 'u2', 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 4, cutover, cutover, now() FROM hours
        UNION ALL SELECT 'u3', 'deleted', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 5, closed, closed, now() FROM hours;
        INSERT INTO "NpcKillStats" (id, "guildId", "memberId", "userId", world, "npcId", "npcName", "npcType", "npcLvl", "memberKills", "lastKilledAt", "updatedAt")
        SELECT 'm', 'guild', 10, 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 9, cutover, now() FROM hours;
        INSERT INTO "NpcKillStatsBucket" (id, "guildId", "memberId", "userId", world, "npcId", "npcName", "npcType", "npcLvl", "memberKills", "periodStart", "lastKilledAt", "updatedAt")
        SELECT 'm1', 'guild', 10, 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 3, closed, closed, now() FROM hours
        UNION ALL SELECT 'm2', 'guild', 10, 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 4, cutover, cutover, now() FROM hours
        UNION ALL SELECT 'm3', 'guild', 11, 'deleted', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 5, closed, closed, now() FROM hours;
        INSERT INTO "GuildKillSummary" (id, "guildId", world, "npcId", "npcName", "npcType", "npcLvl", "uniqueKills", "lastKilledAt", "updatedAt")
        SELECT 'g', 'guild', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 9, cutover, now() FROM hours;
        INSERT INTO "GuildKillSummaryBucket" (id, "guildId", world, "npcId", "npcName", "npcType", "npcLvl", "uniqueKills", "periodStart", "lastKilledAt", "updatedAt")
        SELECT 'g1', 'guild', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 3, closed, closed, now() FROM hours
        UNION ALL SELECT 'g2', 'guild', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 4, cutover, cutover, now() FROM hours;
      `);

      await database.exec(migrations[conversionIndex]!.sql.join("\n"));

      const rows = async (query: string) => (await database.query(query)).rows;

      // The cutover hour stays in the old tables for the follow-up migration.
      expect(
        await rows(
          `SELECT "discordUserId", kills FROM "UserKillBucket" ORDER BY "discordUserId"`,
        ),
      ).toEqual([
        { discordUserId: "deleted", kills: 5 },
        { discordUserId: "kept", kills: 3 },
      ]);
      expect(
        await rows(
          `SELECT "memberId", kills FROM "MemberKillBucket" ORDER BY "memberId"`,
        ),
      ).toEqual([
        { memberId: 10, kills: 3 },
        { memberId: 11, kills: 5 },
      ]);
      expect(await rows(`SELECT kills FROM "GuildKillBucket"`)).toEqual([
        { kills: 3 },
      ]);
      // The follow-up migration adds the cutover hour's 4 kills to the totals.
      expect(
        await rows(`SELECT "discordUserId", kills FROM "UserKillTotal"`),
      ).toEqual([{ discordUserId: "kept", kills: 5 }]);
      expect(
        await rows(
          `SELECT "memberId", "discordUserId", kills FROM "MemberKillTotal"`,
        ),
      ).toEqual([{ memberId: 10, discordUserId: "kept", kills: 5 }]);
      expect(await rows(`SELECT kills FROM "GuildKillTotal"`)).toEqual([
        { kills: 5 },
      ]);
      expect(
        await rows(
          `SELECT "cutoverHour" = date_trunc('hour', now() AT TIME ZONE 'UTC') AS current FROM "KillBucketCutover"`,
        ),
      ).toEqual([{ current: true }]);

      const reconcile = migrations[reconcileIndex]!.sql.join("\n");

      // The older API wrote a moment ago, so the follow-up refuses to run.
      await expect(database.exec(reconcile)).rejects.toThrow(
        "wrote kills in the last 5 minutes",
      );

      // After the copy the older API added a member kill to the cutover hour and
      // committed 2 personal kills into the hour before it; the new API recorded
      // 1 personal kill. Then the older API stopped.
      await database.exec(`
        UPDATE "NpcKillStatsBucket" SET "memberKills" = 5 WHERE id = 'm2';
        INSERT INTO "UserKillStatsBucket" (id, "userId", world, "npcId", "npcName", "npcType", "npcLvl", "totalKills", "periodStart", "lastKilledAt", "updatedAt")
        SELECT 'u4', 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 2, cutover - interval '1 hour', cutover - interval '1 minute', now() FROM hours;
        INSERT INTO "UserKillBucket" ("periodStart", "discordUserId", world, "npcId", "npcName", "npcType", "npcLvl", kills, "lastKilledAt")
        SELECT cutover AT TIME ZONE 'UTC', 'kept', 'w', 1, 'Npc', 'HERO'::"NpcType", 100, 1, cutover AT TIME ZONE 'UTC' FROM hours;
        UPDATE "UserKillTotal" SET kills = kills + 1;
        UPDATE "UserKillStatsBucket" SET "updatedAt" = "updatedAt" - interval '10 minutes';
        UPDATE "NpcKillStatsBucket" SET "updatedAt" = "updatedAt" - interval '10 minutes';
        UPDATE "GuildKillSummaryBucket" SET "updatedAt" = "updatedAt" - interval '10 minutes';
      `);
      await database.exec(reconcile);

      expect(
        await rows(
          `SELECT "discordUserId", kills FROM "UserKillBucket" ORDER BY "discordUserId", "periodStart"`,
        ),
      ).toEqual([
        { discordUserId: "deleted", kills: 5 },
        { discordUserId: "kept", kills: 3 },
        { discordUserId: "kept", kills: 2 },
        { discordUserId: "kept", kills: 5 },
      ]);
      expect(
        await rows(`SELECT "discordUserId", kills FROM "UserKillTotal"`),
      ).toEqual([{ discordUserId: "kept", kills: 12 }]);
      expect(
        await rows(
          `SELECT "memberId", kills FROM "MemberKillBucket" ORDER BY "memberId", "periodStart"`,
        ),
      ).toEqual([
        { memberId: 10, kills: 3 },
        { memberId: 10, kills: 5 },
        { memberId: 11, kills: 5 },
      ]);
      expect(await rows(`SELECT kills FROM "MemberKillTotal"`)).toEqual([
        { kills: 10 },
      ]);
      expect(
        await rows(
          `SELECT kills FROM "GuildKillBucket" ORDER BY "periodStart"`,
        ),
      ).toEqual([{ kills: 3 }, { kills: 4 }]);
      expect(await rows(`SELECT kills FROM "GuildKillTotal"`)).toEqual([
        { kills: 9 },
      ]);

      // A reconcile that runs with the drop ran after the API stopped deleting
      // old rows, so it may have restored deleted accounts' kills.
      const drop = migrations[reconcileIndex + 1]!.sql.join("\n");

      const recordReconcile = (appliedAt: string) => `
        CREATE SCHEMA IF NOT EXISTS drizzle;
        CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (name text, applied_at timestamptz);
        INSERT INTO drizzle."__drizzle_migrations" VALUES ('20261004005422_kill_bucket_reconcile', ${appliedAt});
      `;

      await expect(
        database.transaction(async (transaction) => {
          await transaction.exec(recordReconcile("now()"));
          await transaction.exec(drop);
        }),
      ).rejects.toThrow("Apply 20261004005422_kill_bucket_reconcile before");
      expect(
        await rows(`SELECT to_regclass('"UserKillStats"') IS NOT NULL AS kept`),
      ).toEqual([{ kept: true }]);

      await database.exec(recordReconcile("now() - interval '1 minute'"));
      await database.exec(drop);

      expect(
        await rows(
          `SELECT to_regclass('"UserKillStats"') IS NULL AND to_regclass('"KillBucketCutover"') IS NULL AS dropped`,
        ),
      ).toEqual([{ dropped: true }]);
    } finally {
      await database.close();
    }
  });
});
