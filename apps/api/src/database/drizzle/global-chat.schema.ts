import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const globalChatMuteTable = pgTable(
  "GlobalChatMute",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    displayName: text("displayName").notNull(),
    mutedUntil: timestamp("mutedUntil", { mode: "date", precision: 3 }),
    mutedByUserId: text("mutedByUserId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("GlobalChatMute_userId_key").on(table.userId)],
);
