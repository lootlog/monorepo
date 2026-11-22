import type { DiscordGuildSyncState } from "@lootlog/schema/discord";
import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const discordGuildChannelDeletedOutboxTable = pgTable(
  "DiscordGuildChannelDeletedOutbox",
  {
    id: serial("id").primaryKey(),
    guildId: text("guildId").notNull(),
    channelId: text("channelId").notNull(),
    syncState: jsonb("syncState").$type<DiscordGuildSyncState>().notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "DiscordGuildChannelDeletedOutbox_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("DiscordGuildChannelDeletedOutbox_lastAttemptAt_id_idx").on(
      table.lastAttemptAt.asc().nullsFirst(),
      table.id.asc(),
    ),
  ],
);
