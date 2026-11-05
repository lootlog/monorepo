import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const guildDocumentHistoryActionEnum = pgEnum(
  "GuildDocumentHistoryAction",
  ["SAVE", "DELETE", "RESTORE"],
);

export const guildDocumentTable = pgTable(
  "GuildDocument",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    version: integer("version").default(1).notNull(),
    createdByDiscordId: text("createdByDiscordId").notNull(),
    updatedByDiscordId: text("updatedByDiscordId").notNull(),
    deletedAt: timestamp("deletedAt", { mode: "date", precision: 3 }),
    deletedByDiscordId: text("deletedByDiscordId"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("GuildDocument_guildId_deletedAt_idx").on(
      table["guildId"],
      table["deletedAt"].desc(),
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildDocument_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const guildDocumentHistoryTable = pgTable(
  "GuildDocumentHistory",
  {
    id: text("id").notNull().primaryKey(),
    documentId: text("documentId").notNull(),
    guildId: text("guildId").notNull(),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    action: guildDocumentHistoryActionEnum("action").default("SAVE").notNull(),
    actorDiscordId: text("actorDiscordId").notNull(),
    editedAt: timestamp("editedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("GuildDocumentHistory_documentId_version_idx").on(
      table["documentId"],
      table["version"],
    ),
    index("GuildDocumentHistory_guildId_editedAt_idx").on(
      table["guildId"],
      table["editedAt"].desc(),
    ),
    foreignKey({
      columns: [table["documentId"]],
      foreignColumns: [guildDocumentTable["id"]],
      name: "GuildDocumentHistory_documentId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "GuildDocumentHistory_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
