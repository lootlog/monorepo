import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One catalog entry per edition, item id and name, as the search index holds
 * it. The document is the source of the index; the columns beside it are the
 * keys the writers look entries up by.
 */
export const catalogItemTable = pgTable(
  "CatalogItem",
  {
    uid: text("uid").primaryKey(),
    gameVersion: text("gameVersion").notNull(),
    itemId: integer("itemId").notNull(),
    /** The monsters that drop the item, as `npcMonsterKey` names them. */
    monsterKeys: text("monsterKeys")
      .array()
      .notNull()
      .default(sql`'{}'`),
    document: jsonb("document").$type<object>().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("CatalogItem_gameVersion_itemId_idx").on(
      table.gameVersion,
      table.itemId,
    ),
    index("CatalogItem_monsterKeys_idx").using("gin", table.monsterKeys),
  ],
);

/** One catalog entry per edition, identity namespace, NPC id and type. */
export const catalogNpcTable = pgTable(
  "CatalogNpc",
  {
    uid: text("uid").primaryKey(),
    monsterKey: text("monsterKey").notNull(),
    document: jsonb("document").$type<object>().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("CatalogNpc_monsterKey_idx").on(table.monsterKey)],
);
