import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable } from "./organization.schema.js";

export const reservationTable = pgTable(
  "Reservation",
  {
    id: serial("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    spotId: text("spotId").notNull(),
    spotName: text("spotName").notNull(),
    startsAt: timestamp("startsAt", { mode: "date", precision: 3 }).notNull(),
    endsAt: timestamp("endsAt", { mode: "date", precision: 3 }).notNull(),
    createdByUserId: text("createdByUserId"),
    authorDisplayName: text("authorDisplayName").notNull(),
    authorAvatarUrl: text("authorAvatarUrl"),
    reminderMinutesBefore: integer("reminderMinutesBefore"),
    comment: text("comment"),
    legacyReservationId: text("reservationId"),
    legacyCreatedDate: timestamp("createdDate", { mode: "date", precision: 3 }),
    legacyFromDate: timestamp("fromDate", { mode: "date", precision: 3 }),
    legacyToDate: timestamp("toDate", { mode: "date", precision: 3 }),
    legacyCreatedByDiscordId: text("createdBy"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("Reservation_guildId_spotId_startsAt_endsAt_idx").on(
      table["guildId"],
      table["spotId"],
      table["startsAt"],
      table["endsAt"],
    ),
    index("Reservation_guildId_endsAt_idx").on(
      table["guildId"],
      table["endsAt"],
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Reservation_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check(
      "Reservation_valid_time_range_check",
      sql`${table["endsAt"]} > ${table["startsAt"]}`,
    ),
    check(
      "Reservation_reminder_minutes_check",
      sql`${table["reminderMinutesBefore"]} IS NULL OR ${table["reminderMinutesBefore"]} IN (0, 5, 15, 30)`,
    ),
  ],
);

export const reservationShareTable = pgTable(
  "ReservationShare",
  {
    id: text("id").notNull().primaryKey(),
    firstGuildId: text("firstGuildId").notNull(),
    secondGuildId: text("secondGuildId").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    acceptedByUserId: text("acceptedByUserId").notNull(),
    revokedAt: timestamp("revokedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("ReservationShare_firstGuildId_secondGuildId_key").on(
      table["firstGuildId"],
      table["secondGuildId"],
    ),
    index("ReservationShare_firstGuildId_revokedAt_idx").on(
      table["firstGuildId"],
      table["revokedAt"],
    ),
    index("ReservationShare_secondGuildId_revokedAt_idx").on(
      table["secondGuildId"],
      table["revokedAt"],
    ),
    foreignKey({
      columns: [table["firstGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShare_firstGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["secondGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShare_secondGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check(
      "ReservationShare_distinct_guilds_check",
      sql`${table["firstGuildId"]} < ${table["secondGuildId"]}`,
    ),
  ],
);

export const reservationShareInvitationTable = pgTable(
  "ReservationShareInvitation",
  {
    id: text("id").notNull().primaryKey(),
    sourceGuildId: text("sourceGuildId").notNull(),
    tokenHash: text("tokenHash").notNull(),
    createdByUserId: text("createdByUserId").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date", precision: 3 }).notNull(),
    acceptedAt: timestamp("acceptedAt", { mode: "date", precision: 3 }),
    acceptedByUserId: text("acceptedByUserId"),
    targetGuildId: text("targetGuildId"),
    revokedAt: timestamp("revokedAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("ReservationShareInvitation_tokenHash_key").on(
      table["tokenHash"],
    ),
    index("ReservationShareInvitation_sourceGuildId_createdAt_idx").on(
      table["sourceGuildId"],
      table["createdAt"],
    ),
    index("ReservationShareInvitation_targetGuildId_idx").on(
      table["targetGuildId"],
    ),
    foreignKey({
      columns: [table["sourceGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShareInvitation_sourceGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["targetGuildId"]],
      foreignColumns: [guildTable["id"]],
      name: "ReservationShareInvitation_targetGuildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userPinnedReservationSpotTable = pgTable(
  "UserPinnedReservationSpot",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildId: text("guildId").notNull(),
    spotId: text("spotId").notNull(),
    pinnedAt: timestamp("pinnedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("UserPinnedReservationSpot_userId_guildId_spotId_key").on(
      table["userId"],
      table["guildId"],
      table["spotId"],
    ),
    index("UserPinnedReservationSpot_userId_guildId_pinnedAt_idx").on(
      table["userId"],
      table["guildId"],
      table["pinnedAt"].desc(),
    ),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "UserPinnedReservationSpot_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
