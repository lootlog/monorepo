import { desc, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const activityType = pgEnum("ActivityType", [
  "CONNECT_EVENT",
  "DISCONNECT_EVENT",
]);
export type ActivityType = (typeof activityType.enumValues)[number];
export const ActivityType = {
  CONNECT_EVENT: "CONNECT_EVENT",
  DISCONNECT_EVENT: "DISCONNECT_EVENT",
} as const satisfies Record<ActivityType, ActivityType>;

export const activitySource = pgEnum("ActivitySource", ["GAME", "WEB_APP"]);
export type ActivitySource = (typeof activitySource.enumValues)[number];
export const ActivitySource = {
  GAME: "GAME",
  WEB_APP: "WEB_APP",
} as const satisfies Record<ActivitySource, ActivitySource>;

export const activityActorSnapshots = pgTable(
  "ActivityActorSnapshot",
  {
    id: text().primaryKey(),
    accountId: integer().notNull(),
    characterId: integer().notNull(),
    clanName: text(),
    icon: text().notNull(),
    lvl: integer().notNull(),
    source: activitySource().notNull(),
    fingerprint: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    clanId: integer(),
    name: text().notNull(),
    prof: text().notNull(),
  },
  (table) => [
    uniqueIndex("ActivityActorSnapshot_fingerprint_key").on(table.fingerprint),
  ],
);

export const activities = pgTable(
  "Activity",
  {
    id: text().notNull(),
    userId: text().notNull(),
    guildId: text().notNull(),
    discordId: text().notNull(),
    type: activityType().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    source: activitySource().notNull(),
    details: jsonb(),
    actorSnapshotId: text().references(() => activityActorSnapshots.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    world: text(),
    idempotencyKey: text().notNull(),
  },
  (table) => [
    primaryKey({ name: "Activity_pkey", columns: [table.id, table.createdAt] }),
    uniqueIndex("Activity_idempotencyKey_createdAt_key").on(
      table.idempotencyKey,
      table.createdAt,
    ),
    index("Activity_createdAt_guildId_idx").on(
      desc(table.createdAt),
      table.guildId,
    ),
    index("Activity_createdAt_userId_idx").on(
      desc(table.createdAt),
      table.userId,
    ),
    index("Activity_createdAt_type_idx").on(desc(table.createdAt), table.type),
    index("Activity_guildId_createdAt_idx").on(
      table.guildId,
      desc(table.createdAt),
    ),
  ],
);

export const memberActivityStats = pgTable(
  "MemberActivityStats",
  {
    guildId: text().notNull(),
    discordId: text().notNull(),
    source: activitySource().notNull(),
    lastSeenAt: timestamp({ withTimezone: true, mode: "date" }),
    visitCount: integer().default(0).notNull(),
    activeSessionCount: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "MemberActivityStats_pkey",
      columns: [table.guildId, table.discordId, table.source],
    }),
    index("MemberActivityStats_guildId_source_idx").on(
      table.guildId,
      table.source,
    ),
  ],
);

export const memberActivitySessions = pgTable(
  "MemberActivitySession",
  {
    guildId: text().notNull(),
    discordId: text().notNull(),
    source: activitySource().notNull(),
    sessionId: text().notNull(),
    userId: text(),
    userAgent: text(),
    world: text(),
    connectedAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp({ withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "MemberActivitySession_pkey",
      columns: [table.guildId, table.discordId, table.source, table.sessionId],
    }),
    index("MemberActivitySession_guildId_discordId_source_idx").on(
      table.guildId,
      table.discordId,
      table.source,
    ),
    index("MemberActivitySession_guildId_source_idx").on(
      table.guildId,
      table.source,
    ),
    index("MemberActivitySession_lastSeenAt_idx").on(table.lastSeenAt),
  ],
);

export const activitySchema = {
  activities,
  activityActorSnapshots,
  memberActivitySessions,
  memberActivityStats,
};
export const oneDay = sql`INTERVAL '1 day'`;
