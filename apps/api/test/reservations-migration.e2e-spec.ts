import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsRoot = path.resolve(dirname, "../prisma/migrations");
const reservationMigrations = [
  "20260826120000_reservations_v2",
  "20260826120500_reservations_v2_rollout_bridge",
  "20260826121000_reservations_v2_backfill",
  "20260826122000_reservations_v2_contract",
  "20260826123000_reservations_v2_constraint_alignment",
];

describe("reservation v2 migration", () => {
  it("preserves every legacy row, date, comment, and unresolved author", async () => {
    const client = new Client({
      connectionString: process.env.POSTGRESQL_CONNECTION_URI,
    });
    await client.connect();
    const schema = `reservation_migration_${Date.now()}`;

    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(`
        CREATE TABLE "Guild" (
          "id" TEXT PRIMARY KEY
        );
        CREATE TABLE "Member" (
          "globalUserId" TEXT,
          "userId" TEXT NOT NULL,
          "guildId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "avatar" TEXT,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE "Reservation" (
          "id" SERIAL PRIMARY KEY,
          "guildId" TEXT NOT NULL,
          "reservationId" TEXT NOT NULL,
          "createdDate" TIMESTAMP(3) NOT NULL,
          "fromDate" TIMESTAMP(3) NOT NULL,
          "toDate" TIMESTAMP(3) NOT NULL,
          "createdBy" TEXT NOT NULL,
          "comment" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX "Reservation_guildId_reservationId_idx"
          ON "Reservation"("guildId", "reservationId");
        CREATE INDEX "Reservation_guildId_toDate_idx"
          ON "Reservation"("guildId", "toDate");
      `);
      await client.query(`INSERT INTO "Guild" ("id") VALUES ('guild-1')`);
      await client.query(`
        INSERT INTO "Member"
          ("globalUserId", "userId", "guildId", "name", "avatar")
        VALUES
          ('user-1', 'discord-1', 'guild-1', 'Żółw 🐢', 'avatar-hash')
      `);
      await client.query(`
        INSERT INTO "Reservation"
          ("guildId", "reservationId", "createdDate", "fromDate", "toDate", "createdBy", "comment")
        VALUES
          ('guild-1', 'Potępione Zamczysko', '2026-08-01T09:00:00Z', '2026-08-01T10:00:00Z', '2026-08-01T11:00:00Z', 'discord-1', 'Znany autor'),
          ('guild-1', 'Grota Szeptów', '2026-08-02T09:00:00Z', '2026-08-02T10:00:00Z', '2026-08-02T11:00:00Z', 'missing-discord', 'Nie usuwaj')
      `);

      for (const migration of reservationMigrations) {
        const sql = await readFile(
          path.join(migrationsRoot, migration, "migration.sql"),
          "utf8",
        );
        await client.query(sql);

        if (migration === "20260826121000_reservations_v2_backfill") {
          await client.query(`
            INSERT INTO "Reservation"
              ("guildId", "reservationId", "createdDate", "fromDate", "toDate", "createdBy", "comment")
            VALUES
              ('guild-1', 'W trakcie wdrożenia', '2026-08-02T12:00:00Z', '2026-08-02T13:00:00Z', '2026-08-02T14:00:00Z', 'discord-1', 'Ruch podczas migracji')
          `);
        }
      }

      await client.query(`
        INSERT INTO "Reservation"
          ("guildId", "reservationId", "createdDate", "fromDate", "toDate", "createdBy", "comment")
        VALUES
          ('guild-1', 'Legacy po wdrożeniu', '2026-08-03T09:00:00Z', '2026-08-03T10:00:00Z', '2026-08-03T11:00:00Z', 'discord-1', 'Stare API')
      `);
      await client.query(`
        INSERT INTO "Reservation"
          ("guildId", "spotId", "spotName", "startsAt", "endsAt", "createdByUserId", "authorDisplayName", "comment")
        VALUES
          ('guild-1', 'v2-po-wdrozeniu', 'V2 po wdrożeniu', '2026-08-04T10:00:00Z', '2026-08-04T11:00:00Z', 'user-1', 'Żółw 🐢', 'Nowe API')
      `);

      const result = await client.query<{
        authorDisplayName: string;
        comment: string;
        createdAt: Date;
        createdBy: string;
        createdByUserId: string | null;
        createdDate: Date;
        endsAt: Date;
        fromDate: Date;
        reservationId: string;
        spotId: string;
        spotName: string;
        startsAt: Date;
        toDate: Date;
      }>(`SELECT * FROM "Reservation" ORDER BY "id"`);

      expect(result.rows).toHaveLength(5);
      expect(result.rows[0]).toMatchObject({
        reservationId: "Potępione Zamczysko",
        spotId: "potepione-zamczysko",
        spotName: "Potępione Zamczysko",
        createdBy: "discord-1",
        createdByUserId: "user-1",
        authorDisplayName: "Żółw 🐢",
        comment: "Znany autor",
      });
      expect(result.rows[0]?.startsAt).toEqual(result.rows[0]?.fromDate);
      expect(result.rows[0]?.endsAt).toEqual(result.rows[0]?.toDate);
      expect(result.rows[0]?.createdAt).toEqual(result.rows[0]?.createdDate);
      expect(result.rows[1]).toMatchObject({
        reservationId: "Grota Szeptów",
        spotId: "grota-szeptow",
        spotName: "Grota Szeptów",
        createdBy: "missing-discord",
        createdByUserId: null,
        authorDisplayName: "Nieznany użytkownik",
        comment: "Nie usuwaj",
      });
      expect(result.rows[1]?.startsAt).toEqual(result.rows[1]?.fromDate);
      expect(result.rows[1]?.endsAt).toEqual(result.rows[1]?.toDate);
      expect(result.rows[1]?.createdAt).toEqual(result.rows[1]?.createdDate);
      expect(result.rows[2]).toMatchObject({
        reservationId: "W trakcie wdrożenia",
        spotId: "w-trakcie-wdrozenia",
        spotName: "W trakcie wdrożenia",
        createdBy: "discord-1",
        createdByUserId: "user-1",
        authorDisplayName: "Żółw 🐢",
        comment: "Ruch podczas migracji",
      });
      expect(result.rows[2]?.startsAt).toEqual(result.rows[2]?.fromDate);
      expect(result.rows[2]?.endsAt).toEqual(result.rows[2]?.toDate);
      expect(result.rows[2]?.createdAt).toEqual(result.rows[2]?.createdDate);
      expect(result.rows[3]).toMatchObject({
        reservationId: "Legacy po wdrożeniu",
        spotId: "legacy-po-wdrozeniu",
        spotName: "Legacy po wdrożeniu",
        createdBy: "discord-1",
        createdByUserId: "user-1",
        authorDisplayName: "Żółw 🐢",
        comment: "Stare API",
      });
      expect(result.rows[3]?.startsAt).toEqual(result.rows[3]?.fromDate);
      expect(result.rows[3]?.endsAt).toEqual(result.rows[3]?.toDate);
      expect(result.rows[3]?.createdAt).toEqual(result.rows[3]?.createdDate);
      expect(result.rows[4]).toMatchObject({
        reservationId: "V2 po wdrożeniu",
        spotId: "v2-po-wdrozeniu",
        spotName: "V2 po wdrożeniu",
        createdBy: "discord-1",
        createdByUserId: "user-1",
        authorDisplayName: "Żółw 🐢",
        comment: "Nowe API",
      });
      expect(result.rows[4]?.startsAt).toEqual(result.rows[4]?.fromDate);
      expect(result.rows[4]?.endsAt).toEqual(result.rows[4]?.toDate);
      expect(result.rows[4]?.createdAt).toEqual(result.rows[4]?.createdDate);
    } finally {
      await client.end();
    }
  });
});
