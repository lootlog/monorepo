import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { lootTable } from "./schema.js";

export const lootPublicationOutboxTable = pgTable(
  "LootPublicationOutbox",
  {
    id: serial("id").primaryKey(),
    lootId: integer("lootId")
      .notNull()
      .references(() => lootTable.id, { onDelete: "cascade" }),
    organizationIds: text("organizationIds").array().notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [index("LootPublicationOutbox_lootId_idx").on(table.lootId)],
);
