import { afterEach, describe, expect, it } from "bun:test";
import { asc } from "drizzle-orm";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { backfillOrganizationLootRecordFacts } from "#src/loots/backfill-organization-loot-record-facts";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";

const boundaries: Array<Awaited<ReturnType<typeof createDatabaseBoundary>>> =
  [];

afterEach(async () => {
  await Promise.all(boundaries.splice(0).map((boundary) => boundary.dispose()));
});

const now = new Date("2026-11-10T00:00:00Z");

// Far enough apart to land in different windows of the backfill, so an
// off-by-one in the window arithmetic leaves a record behind.
const lootIds = [1, 50_000, 50_001, 120_000];

const setup = async () => {
  const boundary = await createDatabaseBoundary();
  boundaries.push(boundary);
  const { database, run } = boundary;

  const [guild] = await run(
    database
      .insert(guildTable)
      .values([createGuildFixture({ id: "first", ownerId: "owner" })])
      .returning(),
  );

  if (!guild) throw new Error("Expected an Organization");

  await run(
    database.insert(lootTable).values(
      lootIds.map((id) => ({
        id,
        gameVersion: "pl" as const,
        uniqueId: `loot-${id}`,
        world: `world-${id}`,
        source: "FIGHT" as const,
        location: "Test location",
        createdAt: new Date(now.getTime() + id),
        updatedAt: now,
      })),
    ),
  );

  return { boundary, guildId: guild.id };
};

const readFacts = (
  boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>,
) =>
  boundary.run(
    boundary.database
      .select({
        lootId: organizationLootRecordTable.lootId,
        lootWorld: organizationLootRecordTable.lootWorld,
        lootCreatedAt: organizationLootRecordTable.lootCreatedAt,
      })
      .from(organizationLootRecordTable)
      .orderBy(asc(organizationLootRecordTable.lootId)),
  );

describe("Organization loot record facts backfill", () => {
  it("fills every record that predates the columns, across window boundaries", async () => {
    const { boundary, guildId } = await setup();

    await boundary.run(
      boundary.database.insert(organizationLootRecordTable).values(
        lootIds.map((lootId) => ({
          lootId,
          guildId,
          updatedAt: now,
        })),
      ),
    );

    const updated = await boundary.run(backfillOrganizationLootRecordFacts);

    expect(updated).toBe(lootIds.length);
    expect(await readFacts(boundary)).toEqual(
      lootIds.map((lootId) => ({
        lootId,
        lootWorld: `world-${lootId}`,
        lootCreatedAt: new Date(now.getTime() + lootId),
      })),
    );
  });

  it("leaves records written with their facts untouched and reports nothing to do", async () => {
    const { boundary, guildId } = await setup();

    await boundary.run(
      boundary.database.insert(organizationLootRecordTable).values(
        lootIds.map((lootId) => ({
          lootId,
          guildId,
          // What the write path stores: deliberately not the loot's own world,
          // so a backfill that overwrites a filled row is visible here.
          lootWorld: "already-written",
          lootCreatedAt: now,
          updatedAt: now,
        })),
      ),
    );

    expect(await boundary.run(backfillOrganizationLootRecordFacts)).toBe(0);
    expect(await readFacts(boundary)).toEqual(
      lootIds.map((lootId) => ({
        lootId,
        lootWorld: "already-written",
        lootCreatedAt: now,
      })),
    );
  });
});
