import type { organizationLootRecordTable } from "../src/database/drizzle/loot.schema.js";

type OrganizationLootRecord = typeof organizationLootRecordTable.$inferInsert;

/**
 * An Organization's record of a loot. The loot's world and creation time are
 * required columns the page selection filters on, so a fixture that forgets
 * them would not insert at all; defaulting them here keeps every test that
 * only cares about the scoping columns readable.
 */
export const createOrganizationLootRecordFixture = (
  overrides: Partial<OrganizationLootRecord> &
    Pick<OrganizationLootRecord, "lootId" | "guildId">,
): OrganizationLootRecord => ({
  lootWorld: "test",
  lootCreatedAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});
