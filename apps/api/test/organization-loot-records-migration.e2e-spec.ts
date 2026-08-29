import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsRoot = path.resolve(dirname, "../prisma/migrations");
const expandMigration = "20260829040000_organization_loot_records_expand";
const backfillMigration = "20260829041000_organization_loot_records_backfill";
const archiveCommentOnlyMigration =
  "20260829043000_archive_comment_only_organization_loot_records";

type OrganizationLootRecordMigrationRow = {
  archivedAt: Date | null;
  commentCount: string;
  guildId: string;
  lootId: number;
  submissionCount: string;
};

describe("organization loot records migration", () => {
  it("keeps submission-backed records active and comment-only records archived", async () => {
    const client = new Client({
      connectionString: process.env.POSTGRESQL_CONNECTION_URI,
    });
    await client.connect();
    const schema = `organization_loot_migration_${Date.now()}`;

    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "Permission" AS ENUM ('LOOTLOG_MANAGE');
        CREATE TABLE "Role" (
          "id" TEXT PRIMARY KEY,
          "permissions" "Permission"[] NOT NULL DEFAULT '{}'
        );
        CREATE TABLE "Guild" (
          "id" TEXT PRIMARY KEY
        );
        CREATE TABLE "Member" (
          "id" SERIAL PRIMARY KEY
        );
        CREATE TABLE "Loot" (
          "id" SERIAL PRIMARY KEY
        );
        CREATE TABLE "LootSubmission" (
          "id" SERIAL PRIMARY KEY,
          "lootId" INTEGER NOT NULL,
          "guildId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
        CREATE TABLE "LootComment" (
          "id" SERIAL PRIMARY KEY,
          "lootId" INTEGER NOT NULL,
          "guildId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `);
      await client.query(`
        INSERT INTO "Guild" ("id") VALUES ('guild-1');
        INSERT INTO "Loot" ("id") VALUES (1), (2);
        INSERT INTO "LootSubmission"
          ("lootId", "guildId", "createdAt", "updatedAt")
        VALUES
          (1, 'guild-1', '2026-08-01T10:00:00Z', '2026-08-01T10:00:00Z');
        INSERT INTO "LootComment"
          ("lootId", "guildId", "createdAt", "updatedAt")
        VALUES
          (1, 'guild-1', '2026-08-01T11:00:00Z', '2026-08-01T11:00:00Z'),
          (2, 'guild-1', '2026-08-02T11:00:00Z', '2026-08-02T11:00:00Z');
      `);

      const [expandSql, backfillSql, archiveCommentOnlySql] = await Promise.all(
        [expandMigration, backfillMigration, archiveCommentOnlyMigration].map(
          (migration) =>
            readFile(
              path.join(migrationsRoot, migration, "migration.sql"),
              "utf8",
            ),
        ),
      );
      await client.query(expandSql);
      await client.query(backfillSql);
      await client.query(archiveCommentOnlySql);

      const result = await client.query<OrganizationLootRecordMigrationRow>(`
        SELECT
          record."lootId",
          record."guildId",
          record."archivedAt",
          count(DISTINCT submission."id") AS "submissionCount",
          count(DISTINCT comment."id") AS "commentCount"
        FROM "OrganizationLootRecord" AS record
        LEFT JOIN "LootSubmission" AS submission
          ON submission."organizationLootRecordId" = record."id"
        LEFT JOIN "LootComment" AS comment
          ON comment."organizationLootRecordId" = record."id"
        GROUP BY record."id"
        ORDER BY record."lootId"
      `);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        lootId: 1,
        guildId: "guild-1",
        archivedAt: null,
        submissionCount: "1",
        commentCount: "1",
      });
      expect(result.rows[1]).toMatchObject({
        lootId: 2,
        guildId: "guild-1",
        submissionCount: "0",
        commentCount: "1",
      });
      expect(result.rows[1]?.archivedAt).toBeInstanceOf(Date);
    } finally {
      await client.end();
    }
  });
});
