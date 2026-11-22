import { sql } from "drizzle-orm";
import { PgDialect, type PgInsertValue } from "drizzle-orm/pg-core";
import { organizationLootRecordTable } from "../src/database/drizzle/loot.schema.js";
import { organizationLootRecordFactsOf } from "../src/loots/loot-record-facts.js";

type OrganizationLootRecord = typeof organizationLootRecordTable.$inferInsert;

type OrganizationLootRecordInsert = PgInsertValue<
  typeof organizationLootRecordTable
>;

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

export const refreshOrganizationLootRecordFactsSql = new PgDialect().sqlToQuery(
  sql`UPDATE ${organizationLootRecordTable} SET "lootRarityMask" = ${facts.lootRarityMask}, "npcTypeMask" = ${facts.npcTypeMask}, "npcVisibility" = ${facts.npcVisibility}`,
).sql;
