import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const mapTemplateTable = pgTable(
  "MapTemplate",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    maps: jsonb("maps").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("MapTemplate_guildId_name_key").on(
      table["guildId"],
      table["name"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "MapTemplate_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
