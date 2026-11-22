import {
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const lootDrawAnnouncementOutboxTable = pgTable(
  "LootDrawAnnouncementOutbox",
  {
    id: serial("id").primaryKey(),
    guildId: text("guildId").notNull(),
    lootId: integer("lootId").notNull(),
    drawId: integer("drawId").notNull(),
    outcome: text("outcome", { enum: ["DRAWN", "VOIDED"] }).notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "LootDrawAnnouncementOutbox_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("LootDrawAnnouncementOutbox_lastAttemptAt_id_idx").on(
      table.lastAttemptAt.asc().nullsFirst(),
      table.id.asc(),
    ),
  ],
);
