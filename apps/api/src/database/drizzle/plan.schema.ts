import {
  boolean,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const planEnum = pgEnum("Plan", ["premium"]);

export const organizationEntitlementTable = pgTable(
  "OrganizationEntitlement",
  {
    guildId: text("guildId").notNull().primaryKey(),
    plan: planEnum("plan"),
    planValidUntil: timestamp("planValidUntil", { mode: "date", precision: 3 }),
    notificationRuleLimit: integer("notificationRuleLimit"),
    documentLimit: integer("documentLimit"),
    updatedByUserId: text("updatedByUserId"),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId],
      foreignColumns: [guildTable.id],
      name: "OrganizationEntitlement_guildId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const userEntitlementTable = pgTable(
  "UserEntitlement",
  {
    userId: text("userId").notNull().primaryKey(),
    plan: planEnum("plan"),
    planValidUntil: timestamp("planValidUntil", { mode: "date", precision: 3 }),
    planExpiryAnnouncedAt: timestamp("planExpiryAnnouncedAt", {
      mode: "date",
      precision: 3,
    }),
    notificationRuleLimit: integer("notificationRuleLimit"),
    watchedItemLimit: integer("watchedItemLimit"),
    customThemeLimit: integer("customThemeLimit"),
    apiKeyLimit: integer("apiKeyLimit"),
    equipmentSetLimit: integer("equipmentSetLimit"),
    characterAuras: boolean("characterAuras"),
    updatedByUserId: text("updatedByUserId"),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("UserEntitlement_planValidUntil_idx").on(table.planValidUntil),
  ],
);
