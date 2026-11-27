import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { GameVersion } from "@lootlog/schema/game-version";
import type { GameFact, GameFactKind } from "@lootlog/game-facts/facts";
import type {
  CatalogReportReason,
  CatalogReportStatus,
  CatalogReportSubjectType,
} from "#src/http-api/contracts/reports/schemas";
import type { ItemEntry } from "#src/items/items.service";
import type { NpcEntry } from "#src/npcs/npcs.service";
import type { CatalogFactSource } from "#src/http-api/contracts/facts/schemas";

export const catalogItemTable = pgTable(
  "CatalogItem",
  {
    uid: text("uid").primaryKey(),
    gameVersion: text("gameVersion").notNull(),
    itemId: integer("itemId").notNull(),
    monsterKeys: text("monsterKeys")
      .array()
      .notNull()
      .default(sql`'{}'`),
    document: jsonb("document").$type<ItemEntry>().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("CatalogItem_gameVersion_itemId_idx").on(
      table.gameVersion,
      table.itemId,
    ),
    index("CatalogItem_monsterKeys_idx").using("gin", table.monsterKeys),
  ],
);

export const catalogNpcTable = pgTable(
  "CatalogNpc",
  {
    uid: text("uid").primaryKey(),
    monsterKey: text("monsterKey").notNull(),
    document: jsonb("document").$type<NpcEntry>().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("CatalogNpc_monsterKey_idx").on(table.monsterKey)],
);

export const catalogReportTable = pgTable(
  "CatalogReport",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subjectType")
      .$type<CatalogReportSubjectType>()
      .notNull(),
    gameVersion: text("gameVersion").$type<GameVersion>().notNull(),
    subjectId: integer("subjectId").notNull(),
    reason: text("reason").$type<CatalogReportReason>().notNull(),
    comment: text("comment"),
    reporterUserId: text("reporterUserId").notNull(),
    status: text("status")
      .$type<CatalogReportStatus>()
      .notNull()
      .default("OPEN"),
    reviewedByUserId: text("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("CatalogReport_open_reporter_subject_key")
      .on(
        table.reporterUserId,
        table.subjectType,
        table.gameVersion,
        table.subjectId,
      )
      .where(sql`${table.status} = 'OPEN'`),
    index("CatalogReport_status_subject_idx").on(
      table.status,
      table.subjectType,
      table.gameVersion,
      table.subjectId,
    ),
    index("CatalogReport_reporter_createdAt_idx").on(
      table.reporterUserId,
      table.createdAt,
    ),
  ],
);

export const catalogFactSubmissionTable = pgTable("CatalogFactSubmission", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionKey: text("submissionKey").notNull().unique(),
  source: text("source").$type<CatalogFactSource>().notNull(),
  contributorUserId: text("contributorUserId").notNull(),
  gameVersion: text("gameVersion").$type<GameVersion>().notNull(),
  world: text("world").notNull(),
  extractorVersion: integer("extractorVersion").notNull(),
  factCount: integer("factCount").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const catalogFactTable = pgTable(
  "CatalogFact",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameVersion: text("gameVersion").$type<GameVersion>().notNull(),
    kind: text("kind").$type<GameFactKind>().notNull(),
    subject: text("subject").notNull(),
    contentHash: text("contentHash").notNull(),
    document: jsonb("document").$type<GameFact>().notNull(),
    firstObservedAt: timestamp("firstObservedAt", {
      withTimezone: true,
    }).notNull(),
    lastObservedAt: timestamp("lastObservedAt", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    uniqueIndex("CatalogFact_variant_key").on(
      table.gameVersion,
      table.kind,
      table.subject,
      table.contentHash,
    ),
    index("CatalogFact_subject_lastObservedAt_idx").on(
      table.gameVersion,
      table.kind,
      table.subject,
      table.lastObservedAt,
    ),
  ],
);

export const catalogFactObservationTable = pgTable(
  "CatalogFactObservation",
  {
    factId: uuid("factId")
      .notNull()
      .references(() => catalogFactTable.id, { onDelete: "cascade" }),
    submissionId: uuid("submissionId")
      .notNull()
      .references(() => catalogFactSubmissionTable.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.factId, table.submissionId] }),
    index("CatalogFactObservation_submissionId_idx").on(table.submissionId),
  ],
);
