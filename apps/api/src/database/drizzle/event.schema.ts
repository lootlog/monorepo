import type { JsonValue } from "#src/database/json";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { guildTable, memberTable } from "./organization.schema.js";

export const coverageGapTypeEnum = pgEnum("CoverageGapType", [
  "UNASSIGNED",
  "UNCOVERED",
]);

export const eventScoringModeEnum = pgEnum("EventScoringMode", [
  "SIMPLE",
  "ADVANCED",
]);

export const pointsEditTypeEnum = pgEnum("PointsEditType", [
  "KILL_POINT",
  "RANKING",
]);

export const eventTable = pgTable(
  "Event",
  {
    id: text("id").notNull().primaryKey(),
    guildId: text("guildId").notNull(),
    name: text("name").notNull(),
    world: text("world").notNull(),
    startsAt: timestamp("startsAt", { mode: "date", precision: 3 }),
    endsAt: timestamp("endsAt", { mode: "date", precision: 3 }),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
    basePointsPerKill: integer("basePointsPerKill").default(1).notNull(),
    assignmentTimeoutMinutes: integer("assignmentTimeoutMinutes")
      .default(5)
      .notNull(),
    participationConfirmationMinutes: integer(
      "participationConfirmationMinutes",
    )
      .default(0)
      .notNull(),
    mapAssignmentCap: integer("mapAssignmentCap"),
    scoringMode: eventScoringModeEnum("scoringMode")
      .default("SIMPLE")
      .notNull(),
    scoringRules: jsonb("scoringRules").$type<JsonValue>(),
    rulebookMarkdown: text("rulebookMarkdown"),
  },
  (table) => [
    index("Event_guildId_startsAt_endsAt_idx").on(
      table["guildId"],
      table["startsAt"],
      table["endsAt"],
    ),
    index("Event_world_idx").on(table["world"]),
    foreignKey({
      columns: [table["guildId"]],
      foreignColumns: [guildTable["id"]],
      name: "Event_guildId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const userPinnedEventTable = pgTable(
  "UserPinnedEvent",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    eventId: text("eventId").notNull(),
    pinnedAt: timestamp("pinnedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("UserPinnedEvent_userId_eventId_key").on(
      table["userId"],
      table["eventId"],
    ),
    index("UserPinnedEvent_userId_pinnedAt_idx").on(
      table["userId"],
      table["pinnedAt"].desc(),
    ),
    index("UserPinnedEvent_eventId_idx").on(table["eventId"]),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "UserPinnedEvent_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapLocationTable = pgTable(
  "EventMapLocation",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    name: text("name").notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventMapLocation_heroNpcId_name_key").on(
      table["heroNpcId"],
      table["name"],
    ),
    index("EventMapLocation_heroNpcId_order_idx").on(
      table["heroNpcId"],
      table["order"],
    ),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapLocation_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapTable = pgTable(
  "EventMap",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    locationId: text("locationId"),
    mapId: integer("mapId").notNull(),
    mapName: text("mapName").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventMap_heroNpcId_mapId_key").on(
      table["heroNpcId"],
      table["mapId"],
    ),
    index("EventMap_locationId_idx").on(table["locationId"]),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMap_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["locationId"]],
      foreignColumns: [eventMapLocationTable["id"]],
      name: "EventMap_locationId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const eventMapCoverageGapTable = pgTable(
  "EventMapCoverageGap",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    heroNpcId: text("heroNpcId").notNull(),
    gapType: coverageGapTypeEnum("gapType").notNull(),
    startedAt: timestamp("startedAt", { mode: "date", precision: 3 }).notNull(),
    endedAt: timestamp("endedAt", { mode: "date", precision: 3 }),
    durationSeconds: integer("durationSeconds"),
    hadAssignedMembers: boolean("hadAssignedMembers"),
  },
  (table) => [
    index("EventMapCoverageGap_mapId_gapType_endedAt_idx").on(
      table["mapId"],
      table["gapType"],
      table["endedAt"],
    ),
    index("EventMapCoverageGap_heroNpcId_endedAt_idx").on(
      table["heroNpcId"],
      table["endedAt"],
    ),
    index("EventMapCoverageGap_heroNpcId_startedAt_idx").on(
      table["heroNpcId"],
      table["startedAt"],
    ),
    index("EventMapCoverageGap_mapId_startedAt_idx").on(
      table["mapId"],
      table["startedAt"],
    ),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventMapCoverageGap_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapCoverageGap_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventMapAssignmentHistoryTable = pgTable(
  "EventMapAssignmentHistory",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    heroNpcId: text("heroNpcId").notNull(),
    memberId: integer("memberId").notNull(),
    assignedAt: timestamp("assignedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    unassignedAt: timestamp("unassignedAt", { mode: "date", precision: 3 }),
  },
  (table) => [
    index("EventMapAssignmentHistory_mapId_assignedAt_idx").on(
      table["mapId"],
      table["assignedAt"],
    ),
    index("EventMapAssignmentHistory_heroNpcId_assignedAt_idx").on(
      table["heroNpcId"],
      table["assignedAt"],
    ),
    index("EventMapAssignmentHistory_memberId_idx").on(table["memberId"]),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventMapAssignmentHistory_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventMapAssignmentHistory_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventMapAssignmentHistory_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventHeroNpcTable = pgTable(
  "EventHeroNpc",
  {
    id: text("id").notNull().primaryKey(),
    eventId: text("eventId").notNull(),
    npcId: integer("npcId"),
    npcName: text("npcName").notNull(),
    npcIcon: text("npcIcon"),
    npcLvl: integer("npcLvl"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventHeroNpc_eventId_npcName_key").on(
      table["eventId"],
      table["npcName"],
    ),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "EventHeroNpc_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventPresenceLogTable = pgTable(
  "EventPresenceLog",
  {
    id: text("id").notNull().primaryKey(),
    mapId: text("mapId").notNull(),
    memberId: integer("memberId").notNull(),
    isAfk: boolean("isAfk").notNull(),
    startedAt: timestamp("startedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("endedAt", { mode: "date", precision: 3 }),
  },
  (table) => [
    index("EventPresenceLog_mapId_memberId_idx").on(
      table["mapId"],
      table["memberId"],
    ),
    index("EventPresenceLog_mapId_endedAt_isAfk_memberId_idx").on(
      table["mapId"],
      table["endedAt"],
      table["isAfk"],
      table["memberId"],
    ),
    index("EventPresenceLog_startedAt_endedAt_idx").on(
      table["startedAt"],
      table["endedAt"],
    ),
    foreignKey({
      columns: [table["mapId"]],
      foreignColumns: [eventMapTable["id"]],
      name: "EventPresenceLog_mapId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventPresenceLog_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventHeroKillTable = pgTable(
  "EventHeroKill",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    killedAt: timestamp("killedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    minSpawnTimeAtKill: timestamp("minSpawnTimeAtKill", {
      mode: "date",
      precision: 3,
    }).notNull(),
    maxSpawnTimeAtKill: timestamp("maxSpawnTimeAtKill", {
      mode: "date",
      precision: 3,
    }).notNull(),
    timerCreatedById: integer("timerCreatedById"),
    isManualClose: boolean("isManualClose").default(false).notNull(),
    // The respawn window a timer report recorded this kill for. Kills recorded
    // before it existed, and kills not tied to a reported window, leave it null.
    windowKey: text("windowKey"),
  },
  (table) => [
    uniqueIndex("EventHeroKill_heroNpcId_windowKey_isManualClose_key").on(
      table["heroNpcId"],
      table["windowKey"],
      table["isManualClose"],
    ),
    // Match ORDER BY DESC's null ordering so PostgreSQL can seek without sorting.
    index("EventHeroKill_heroNpcId_killedAt_id_idx").on(
      table["heroNpcId"],
      table["killedAt"].desc().nullsFirst(),
      table["id"].desc().nullsFirst(),
    ),
    index("EventHeroKill_killedAt_id_idx").on(
      table["killedAt"].desc().nullsFirst(),
      table["id"].desc().nullsFirst(),
    ),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventHeroKill_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["timerCreatedById"]],
      foreignColumns: [memberTable["id"]],
      name: "EventHeroKill_timerCreatedById_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const eventKillPointTable = pgTable(
  "EventKillPoint",
  {
    id: text("id").notNull().primaryKey(),
    killId: text("killId").notNull(),
    memberId: integer("memberId").notNull(),
    basePoints: doublePrecision("basePoints").notNull(),
    points: doublePrecision("points").notNull(),
    manualAdjustmentPoints: doublePrecision("manualAdjustmentPoints")
      .default(0)
      .notNull(),
    trackingDurationSeconds: integer("trackingDurationSeconds"),
    trackingDurationPercentage: doublePrecision("trackingDurationPercentage"),
    confirmationDeadlineAt: timestamp("confirmationDeadlineAt", {
      mode: "date",
      precision: 3,
    }),
    confirmedAt: timestamp("confirmedAt", { mode: "date", precision: 3 }),
    confirmationExpiredAcknowledgedAt: timestamp(
      "confirmationExpiredAcknowledgedAt",
      { mode: "date", precision: 3 },
    ),
    timeOnMapSeconds: integer("timeOnMapSeconds").notNull(),
    afkPercentage: doublePrecision("afkPercentage").notNull(),
    wasPresent: boolean("wasPresent").notNull(),
    bonusBreakdown: jsonb("bonusBreakdown").$type<JsonValue>(),
    mapPresenceData: jsonb("mapPresenceData"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventKillPoint_killId_memberId_key").on(
      table["killId"],
      table["memberId"],
    ),
    index("EventKillPoint_memberId_killId_idx").on(
      table["memberId"],
      table["killId"],
    ),
    index("EventKillPoint_memberId_confirmationDeadlineAt_confirmedAt_idx").on(
      table["memberId"],
      table["confirmationDeadlineAt"],
      table["confirmedAt"],
    ),
    foreignKey({
      columns: [table["killId"]],
      foreignColumns: [eventHeroKillTable["id"]],
      name: "EventKillPoint_killId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventKillPoint_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventRankingTable = pgTable(
  "EventRanking",
  {
    id: text("id").notNull().primaryKey(),
    eventId: text("eventId").notNull(),
    memberId: integer("memberId").notNull(),
    heroNpcName: text("heroNpcName").notNull(),
    totalPoints: doublePrecision("totalPoints").default(0).notNull(),
    manualAdjustmentPoints: doublePrecision("manualAdjustmentPoints")
      .default(0)
      .notNull(),
    totalKills: integer("totalKills").default(0).notNull(),
    totalTimeSeconds: integer("totalTimeSeconds").default(0).notNull(),
    avgAfkPercentage: doublePrecision("avgAfkPercentage").default(0).notNull(),
    pointsModified: boolean("pointsModified").default(false).notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("EventRanking_eventId_memberId_heroNpcName_key").on(
      table["eventId"],
      table["memberId"],
      table["heroNpcName"],
    ),
    index("EventRanking_eventId_totalPoints_idx").on(
      table["eventId"],
      table["totalPoints"].desc(),
    ),
    foreignKey({
      columns: [table["eventId"]],
      foreignColumns: [eventTable["id"]],
      name: "EventRanking_eventId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["memberId"]],
      foreignColumns: [memberTable["id"]],
      name: "EventRanking_memberId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const eventPointsEditHistoryTable = pgTable(
  "EventPointsEditHistory",
  {
    id: text("id").notNull().primaryKey(),
    rankingId: text("rankingId").notNull(),
    previousPoints: doublePrecision("previousPoints").notNull(),
    newPoints: doublePrecision("newPoints").notNull(),
    editType: pointsEditTypeEnum("editType").notNull(),
    editedByUserId: text("editedByUserId").notNull(),
    comment: text("comment"),
    editedAt: timestamp("editedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("EventPointsEditHistory_rankingId_editedAt_idx").on(
      table["rankingId"],
      table["editedAt"].desc(),
    ),
    foreignKey({
      columns: [table["rankingId"]],
      foreignColumns: [eventRankingTable["id"]],
      name: "EventPointsEditHistory_rankingId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);

export const eventRespawnWindowSummaryTable = pgTable(
  "EventRespawnWindowSummary",
  {
    id: text("id").notNull().primaryKey(),
    heroNpcId: text("heroNpcId").notNull(),
    killId: text("killId"),
    windowOpenedAt: timestamp("windowOpenedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    windowClosedAt: timestamp("windowClosedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
    minSpawnTime: timestamp("minSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    maxSpawnTime: timestamp("maxSpawnTime", {
      mode: "date",
      precision: 3,
    }).notNull(),
    wasManualClose: boolean("wasManualClose").default(false).notNull(),
    totalWindowSeconds: integer("totalWindowSeconds").notNull(),
    totalCoverageSeconds: integer("totalCoverageSeconds").notNull(),
    totalUncoveredSeconds: integer("totalUncoveredSeconds").notNull(),
    totalUnassignedSeconds: integer("totalUnassignedSeconds").notNull(),
    coveragePercentage: doublePrecision("coveragePercentage").notNull(),
    memberStats: jsonb("memberStats").notNull(),
    mapStats: jsonb("mapStats").notNull(),
    gapsTimeline: jsonb("gapsTimeline").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("EventRespawnWindowSummary_killId_key").on(table["killId"]),
    index("EventRespawnWindowSummary_heroNpcId_idx").on(table["heroNpcId"]),
    foreignKey({
      columns: [table["heroNpcId"]],
      foreignColumns: [eventHeroNpcTable["id"]],
      name: "EventRespawnWindowSummary_heroNpcId_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table["killId"]],
      foreignColumns: [eventHeroKillTable["id"]],
      name: "EventRespawnWindowSummary_killId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const eventMapToMemberTable = pgTable(
  "_EventMapToMember",
  { A: text("A").notNull(), B: integer("B").notNull() },
  (table) => [
    primaryKey({
      columns: [table.A, table.B],
      name: "_EventMapToMember_AB_pkey",
    }),
    index("_EventMapToMember_B_index").on(table.B),
    foreignKey({
      columns: [table.A],
      foreignColumns: [eventMapTable.id],
      name: "_EventMapToMember_A_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.B],
      foreignColumns: [memberTable.id],
      name: "_EventMapToMember_B_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
  ],
);
