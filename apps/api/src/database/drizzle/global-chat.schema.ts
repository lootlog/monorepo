import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Global chat admins keep one mute per User; a past `mutedUntil` has expired
 * and a null one lasts until an admin lifts it. Users live in the auth
 * service, so `userId` has no foreign key.
 */
export const globalChatMuteTable = pgTable(
  "GlobalChatMute",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    /** The sender's name when muted, so admins recognise the entry. */
    displayName: text("displayName").notNull(),
    mutedUntil: timestamp("mutedUntil", { mode: "date", precision: 3 }),
    mutedByUserId: text("mutedByUserId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("GlobalChatMute_userId_key").on(table.userId)],
);
