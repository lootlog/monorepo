import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { eq, sql, type SQLWrapper } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { lootNpcVisibilityOf } from "#src/loots/loot-visibility";

/**
 * The bit each rarity sets in `OrganizationLootRecord.lootRarityMask`. The
 * values are persisted on every record, so a bit is never renumbered or reused.
 */
const LOOT_RARITY_BIT: Record<ItemRarity, number> = {
  UNIQUE: 1,
  HEROIC: 2,
  LEGENDARY: 4,
  UPGRADED: 8,
};

/** The bit each NPC type sets in `OrganizationLootRecord.npcTypeMask`; persisted like the rarity bits. */
const NPC_TYPE_BIT: Record<NpcType, number> = {
  COMMON: 1,
  ELITE: 2,
  ELITE2: 4,
  ELITE3: 8,
  HERO: 16,
  EVENT_HERO: 32,
  TITAN: 64,
  COLOSSUS: 128,
  NPC: 256,
  HERO_TRACKER: 512,
};

const maskOf = <Key extends string>(
  bits: Record<Key, number>,
  keys: ReadonlyArray<Key>,
) => keys.reduce((mask, key) => mask | bits[key], 0);

/** Matches the records whose loot holds an item of any of the rarities. */
export const lootRarityCondition = (
  lootRarityMask: SQLWrapper,
  rarities: ReadonlyArray<ItemRarity>,
) => sql`(${lootRarityMask} & ${maskOf(LOOT_RARITY_BIT, rarities)}) <> 0`;

/** Matches the records whose loot has an NPC of any of the types. */
export const lootNpcTypeCondition = (
  npcTypeMask: SQLWrapper,
  types: ReadonlyArray<NpcType>,
) => sql`(${npcTypeMask} & ${maskOf(NPC_TYPE_BIT, types)}) <> 0`;

const query = new QueryBuilder();

const bitOr = (column: SQLWrapper, bits: Record<string, number>) =>
  sql`coalesce(bit_or(case ${column} ${sql.join(
    Object.entries(bits).map(([value, bit]) =>
      sql.raw(`when '${value}' then ${bit}`),
    ),
    sql` `,
  )} else 0 end), 0)::smallint`;

/**
 * What an Organization's record copies from its loot's items and NPCs, read
 * from those rows themselves. Every writer of the three columns spreads this
 * into its insert or update, so a record cannot disagree with the loot it was
 * accepted with. The items and NPCs must already be written.
 */
export const organizationLootRecordFactsOf = (lootId: number | SQLWrapper) => ({
  lootRarityMask: sql<number>`(${query
    .select({ mask: bitOr(itemSnapshotTable.rarity, LOOT_RARITY_BIT) })
    .from(lootItemTable)
    .innerJoin(
      itemSnapshotTable,
      eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
    )
    .where(eq(lootItemTable.lootId, lootId))})`,
  npcTypeMask: sql<number>`(${query
    .select({ mask: bitOr(npcSnapshotTable.type, NPC_TYPE_BIT) })
    .from(lootNpcTable)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
    )
    .where(eq(lootNpcTable.lootId, lootId))})`,
  npcVisibility: lootNpcVisibilityOf(lootId),
});
