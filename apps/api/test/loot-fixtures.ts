import { sql } from "drizzle-orm";
import { PgDialect, type PgInsertValue } from "drizzle-orm/pg-core";
import { organizationLootRecordTable } from "../src/database/drizzle/loot.schema.js";
import { organizationLootRecordFactsOf } from "../src/loots/loot-record-facts.js";

type OrganizationLootRecord = typeof organizationLootRecordTable.$inferInsert;

type OrganizationLootRecordInsert = PgInsertValue<
  typeof organizationLootRecordTable
>;

/**
 * An Organization's record of a loot. The loot's world and creation time are
 * required columns the page selection filters on, so a fixture that forgets
 * them would not insert at all; defaulting them here keeps every test that
 * only cares about the scoping columns readable.
 *
 * The rarity and NPC type masks and the NPC visibility are read from the
 * loot's items and NPCs as the insert runs, exactly as acceptance does, so
 * insert those first.
 */
export const createOrganizationLootRecordFixture = (
  overrides: Partial<OrganizationLootRecord> &
    Pick<OrganizationLootRecord, "lootId" | "guildId">,
): OrganizationLootRecordInsert => ({
  lootWorld: "test",
  lootCreatedAt: new Date(0),
  ...organizationLootRecordFactsOf(overrides.lootId),
  updatedAt: new Date(0),
  ...overrides,
});

const facts = organizationLootRecordFactsOf(organizationLootRecordTable.lootId);

/**
 * For suites that seed through a raw client, where a record is inserted in
 * the same statement as its loot's NPCs or before them: insert the record with
 * `0`, `0` and `'{[-1,0)}'`, then run this once the items and NPCs exist. It
 * rewrites every record with the expressions acceptance uses.
 */
export const refreshOrganizationLootRecordFactsSql = new PgDialect().sqlToQuery(
  sql`UPDATE ${organizationLootRecordTable} SET "lootRarityMask" = ${facts.lootRarityMask}, "npcTypeMask" = ${facts.npcTypeMask}, "npcVisibility" = ${facts.npcVisibility}`,
).sql;
