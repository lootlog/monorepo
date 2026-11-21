import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

/**
 * A User's report that a catalog page shows something wrong. A page is an
 * item or NPC id of one edition, as the wiki links it, so a report outlives
 * the entries a rebuild replaces. A User keeps one open report per page.
 */
export const catalogReportTable = pgTable(
  "CatalogReport",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subjectType").notNull(),
    gameVersion: text("gameVersion").notNull(),
    subjectId: integer("subjectId").notNull(),
    reason: text("reason").notNull(),
    comment: text("comment"),
    reporterUserId: text("reporterUserId").notNull(),
    status: text("status").notNull().default("OPEN"),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("CatalogReport_open_reporter_subject_key")
      .on(
        table.reporterUserId,
        table.subjectType,
        table.gameVersion,
        table.subjectId,
      )
      .where(sql`${table.status} = 'OPEN'`),
    index("CatalogReport_status_subject_idx").on(
      table.status,
      table.subjectType,
      table.gameVersion,
      table.subjectId,
    ),
    index("CatalogReport_reporter_createdAt_idx").on(
      table.reporterUserId,
      table.createdAt,
    ),
  ],
);
