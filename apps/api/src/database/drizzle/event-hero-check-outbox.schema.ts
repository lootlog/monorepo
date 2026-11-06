import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";
import { guildTable } from "./organization.schema.js";

/** Event hero checks committed with their timer, pending a BullMQ enqueue. */
export const eventHeroCheckOutboxTable = pgTable(
  "EventHeroCheckOutbox",
  {
    id: serial("id").primaryKey(),
    guildId: text("guildId").notNull(),
    jobId: text("jobId").notNull(),
    payload: jsonb("payload").$type<EventHeroKillJobData>().notNull(),
    lastAttemptAt: timestamp("lastAttemptAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "EventHeroCheckOutbox_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    // Matches the dispatcher's `lastAttemptAt ASC NULLS FIRST, id ASC` selection.
    index("EventHeroCheckOutbox_lastAttemptAt_id_idx").on(
      table.lastAttemptAt.asc().nullsFirst(),
      table.id.asc(),
    ),
  ],
);
