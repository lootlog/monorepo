import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userEquipmentSetTable = pgTable(
  "UserEquipmentSet",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    code: text("code").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("UserEquipmentSet_userId_createdAt_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
