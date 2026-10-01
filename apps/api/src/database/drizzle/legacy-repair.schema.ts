import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { gameVersionEnum } from "./schema.js";

export type LegacyRepairRowTable = "LootNpc" | "LootItem";

export type LegacyRepairSnapshotTable = "NpcSnapshot" | "ItemSnapshot";

export type LegacyRepairRunStatus =
  | "applying"
  | "applied"
  | "rollingBack"
  | "rolledBack";

export type LegacyRepairEntryStatus =
  | "pending"
  | "applied"
  | "recorded"
  | "deferred"
  | "rolledBack";

// Retained audit log of the legacy association repairs (LOO-38, LOO-250). Rows hold
// snapshot and link ids, counts and manifest decisions, never Organization
// data, and are kept after a run completes or is rolled back.

export const legacyRepairRunTable = pgTable(
  "LegacyRepairRun",
  {
    runId: text("runId").primaryKey(),
    manifestVersion: integer("manifestVersion").notNull(),
    manifestSha256: text("manifestSha256").notNull(),
    entryCount: integer("entryCount").notNull(),
    // applying -> applied -> rollingBack -> rolledBack
    status: text("status").$type<LegacyRepairRunStatus>().notNull(),
    createdAt: timestamp("createdAt", { precision: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull(),
    appliedAt: timestamp("appliedAt", { precision: 3 }),
    rolledBackAt: timestamp("rolledBackAt", { precision: 3 }),
  },
  (table) => [
    check(
      "LegacyRepairRun_status_check",
      sql`${table.status} in ('applying', 'applied', 'rollingBack', 'rolledBack')`,
    ),
  ],
);

export const legacyRepairEntryTable = pgTable(
  "LegacyRepairEntry",
  {
    runId: text("runId")
      .notNull()
      .references(() => legacyRepairRunTable.runId),
    entryId: text("entryId").notNull(),
    domain: text("domain").notNull(),
    action: text("action").notNull(),
    classification: text("classification").notNull(),
    unresolvedReason: text("unresolvedReason"),
    // `LootNpc` or `LootItem` for entries that carry loot links.
    rowTable: text("rowTable").$type<LegacyRepairRowTable>(),
    sourceSnapshotId: integer("sourceSnapshotId"),
    targetSnapshotId: integer("targetSnapshotId"),
    // True when this run inserted the target revision, so a rollback may
    // remove it once nothing references it.
    targetCreated: boolean("targetCreated").default(false).notNull(),
    rowCount: integer("rowCount").notNull(),
    rowIdsSha256: text("rowIdsSha256"),
    // pending -> applied, recorded (log only), deferred (not applied), and
    // rolledBack after a rollback.
    status: text("status").$type<LegacyRepairEntryStatus>().notNull(),
    // Highest manifest row id already processed; the next batch starts after it.
    cursorRowId: integer("cursorRowId"),
    appliedRows: integer("appliedRows").default(0).notNull(),
    alreadyOnTargetRows: integer("alreadyOnTargetRows").default(0).notNull(),
    skippedRows: integer("skippedRows").default(0).notNull(),
    restoredRows: integer("restoredRows").default(0).notNull(),
    keptRows: integer("keptRows").default(0).notNull(),
    appliedAt: timestamp("appliedAt", { precision: 3 }),
    rolledBackAt: timestamp("rolledBackAt", { precision: 3 }),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.runId, table.entryId],
      name: "LegacyRepairEntry_pkey",
    }),
    index("LegacyRepairEntry_runId_status_idx").on(table.runId, table.status),
    check(
      "LegacyRepairEntry_status_check",
      sql`${table.status} in ('pending', 'applied', 'recorded', 'deferred', 'rolledBack')`,
    ),
  ],
);

export const legacyRepairLinkTable = pgTable(
  "LegacyRepairLink",
  {
    runId: text("runId").notNull(),
    rowTable: text("rowTable").$type<LegacyRepairRowTable>().notNull(),
    rowId: integer("rowId").notNull(),
    entryId: text("entryId").notNull(),
    fromSnapshotId: integer("fromSnapshotId").notNull(),
    toSnapshotId: integer("toSnapshotId").notNull(),
    appliedAt: timestamp("appliedAt", { precision: 3 }).notNull(),
    restoredAt: timestamp("restoredAt", { precision: 3 }),
    // `restored`, or `kept` when the row no longer pointed at the target.
    restoreOutcome: text("restoreOutcome").$type<"restored" | "kept">(),
  },
  (table) => [
    primaryKey({
      columns: [table.runId, table.rowTable, table.rowId],
      name: "LegacyRepairLink_pkey",
    }),
    foreignKey({
      columns: [table.runId, table.entryId],
      foreignColumns: [
        legacyRepairEntryTable.runId,
        legacyRepairEntryTable.entryId,
      ],
      name: "LegacyRepairLink_runId_entryId_fkey",
    }),
    index("LegacyRepairLink_runId_entryId_rowId_idx").on(
      table.runId,
      table.entryId,
      table.rowId,
    ),
    check(
      "LegacyRepairLink_rowTable_check",
      sql`${table.rowTable} in ('LootNpc', 'LootItem')`,
    ),
  ],
);

// One row per revision whose identity a run changed: a legacy or per-world
// revision promoted to its edition, or a revision whose hash was handed to a
// promoted one. Holds the previous values so a rollback restores them exactly.
export const legacyRepairSnapshotTable = pgTable(
  "LegacyRepairSnapshot",
  {
    runId: text("runId").notNull(),
    snapshotTable: text("snapshotTable")
      .$type<LegacyRepairSnapshotTable>()
      .notNull(),
    snapshotId: integer("snapshotId").notNull(),
    entryId: text("entryId").notNull(),
    // `promote`: the revision took the edition identity; `retire`: it handed
    // its hash to a promoted revision and its links moved there.
    change: text("change").$type<"promote" | "retire">().notNull(),
    previousSnapshotHash: text("previousSnapshotHash"),
    previousGameVersion: gameVersionEnum("previousGameVersion"),
    previousWorld: text("previousWorld"),
    // Item revisions only: stats before per-instance entries were removed.
    previousStatRaw: text("previousStatRaw"),
    previousStatsSnapshot: jsonb("previousStatsSnapshot"),
    appliedSnapshotHash: text("appliedSnapshotHash"),
    appliedGameVersion: gameVersionEnum("appliedGameVersion"),
    appliedAt: timestamp("appliedAt", { precision: 3 }).notNull(),
    restoredAt: timestamp("restoredAt", { precision: 3 }),
    // `restored`, or `kept` when the revision changed since the run.
    restoreOutcome: text("restoreOutcome").$type<"restored" | "kept">(),
  },
  (table) => [
    primaryKey({
      columns: [table.runId, table.snapshotTable, table.snapshotId],
      name: "LegacyRepairSnapshot_pkey",
    }),
    foreignKey({
      columns: [table.runId, table.entryId],
      foreignColumns: [
        legacyRepairEntryTable.runId,
        legacyRepairEntryTable.entryId,
      ],
      name: "LegacyRepairSnapshot_runId_entryId_fkey",
    }),
    index("LegacyRepairSnapshot_runId_entryId_idx").on(
      table.runId,
      table.entryId,
    ),
    check(
      "LegacyRepairSnapshot_snapshotTable_check",
      sql`${table.snapshotTable} in ('NpcSnapshot', 'ItemSnapshot')`,
    ),
    check(
      "LegacyRepairSnapshot_change_check",
      sql`${table.change} in ('promote', 'retire')`,
    ),
  ],
);
