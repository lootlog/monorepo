import {
  createItemSnapshotHash,
  createItemStatsHash,
  createNpcSnapshotHash,
} from "@lootlog/database/snapshot-hash";
import { parseItemStats, splitItemStat } from "@lootlog/database/item-stat";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  notExists,
  sql,
  sum,
} from "drizzle-orm";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import {
  legacyRepairEntryTable,
  legacyRepairLinkTable,
  legacyRepairRunTable,
  type LegacyRepairEntryStatus,
  type LegacyRepairRowTable,
} from "#src/database/drizzle/legacy-repair.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  notificationRuleTable,
  notificationRuleUnresolvedSelectionTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import { NotificationTriggerType } from "#src/notifications/notification-enums";
import type { RedisService } from "#src/redis/redis.service";
import {
  getEventWrappedCachePattern,
  getLootListCacheScope,
  getLootStatsCacheScope,
} from "#src/shared/cache";
import { notificationMatchingPolicy } from "#src/notifications/rules/notification-matching.service";
import type {
  LegacyRepairManifest,
  LegacyRepairPlanEntry,
} from "./legacy-repair-manifest.js";

/**
 * Applies and rolls back a verified LOO-38 manifest. Each loot link moves in a
 * bounded batch transaction that also records it in `LegacyRepairLink` and
 * advances the entry cursor, so an interrupted run resumes after its last
 * committed batch, a repeated run changes nothing, and a rollback restores
 * exactly the rows this run moved.
 */

export class LegacyRepairError extends TaggedErrorClass<LegacyRepairError>()(
  "LegacyRepairError",
  { message: Schema.String },
) {}

type Transaction = Parameters<
  Parameters<ApiDatabaseValue["transaction"]>[0]
>[0];

type Executor = ApiDatabaseValue | Transaction;

type RelinkPlan = Extract<
  LegacyRepairPlanEntry,
  { kind: "npcRelink" | "itemRelink" }
>;

type EntryRow = typeof legacyRepairEntryTable.$inferSelect;

export interface LegacyRepairOptions {
  /** Loot links moved or restored per transaction. */
  readonly batchSize: number;
  /** Upper bound of loot links one invocation moves or restores. */
  readonly maxRows: number;
}

export interface LegacyRepairProgress {
  readonly runId: string;
  readonly status: string;
  readonly complete: boolean;
  readonly processedRows: number;
}

const fail = (message: string) =>
  Effect.fail(new LegacyRepairError({ message }));

const initialStatus = (
  entry: LegacyRepairPlanEntry,
): LegacyRepairEntryStatus => {
  if (entry.kind === "record") return "recorded";

  return entry.kind === "defer" ? "deferred" : "pending";
};

const entryValues = (
  runId: string,
  entry: LegacyRepairPlanEntry,
  now: Date,
): typeof legacyRepairEntryTable.$inferInsert => {
  const rows =
    entry.kind === "npcRelink" ||
    entry.kind === "itemRelink" ||
    entry.kind === "record" ||
    entry.kind === "defer"
      ? {
          rowTable: entry.rowTable ?? null,
          sourceSnapshotId: entry.sourceSnapshotId ?? null,
          rowCount:
            entry.kind === "npcRelink" || entry.kind === "itemRelink"
              ? entry.rowIds.length
              : entry.rowCount,
          rowIdsSha256: entry.rowIdsSha256 ?? null,
        }
      : { rowTable: null, sourceSnapshotId: null, rowCount: 1 };

  const status = initialStatus(entry);

  return {
    runId,
    entryId: entry.entryId,
    domain: entry.domain,
    action: entry.action,
    classification: entry.classification,
    unresolvedReason: entry.unresolvedReason,
    ...rows,
    status,
    appliedAt: status === "recorded" ? now : null,
    updatedAt: now,
  };
};

const linkColumns = (rowTable: LegacyRepairRowTable) =>
  rowTable === "LootNpc"
    ? {
        table: lootNpcTable,
        id: lootNpcTable.id,
        lootId: lootNpcTable.lootId,
        snapshotId: lootNpcTable.npcSnapshotId,
      }
    : {
        table: lootItemTable,
        id: lootItemTable.id,
        lootId: lootItemTable.lootId,
        snapshotId: lootItemTable.itemSnapshotId,
      };

/** Current snapshot, world and game version of the given links, locked. */
const lockLinks = (
  executor: Executor,
  rowTable: LegacyRepairRowTable,
  ids: readonly number[],
) => {
  const link = linkColumns(rowTable);

  return executor
    .select({
      id: link.id,
      snapshotId: link.snapshotId,
      world: lootTable.world,
      gameVersion: lootTable.gameVersion,
    })
    .from(link.table)
    .innerJoin(lootTable, eq(lootTable.id, link.lootId))
    .where(inArray(link.id, [...ids]))
    .for("update", { of: link.table });
};

const moveLinks = (
  executor: Executor,
  rowTable: LegacyRepairRowTable,
  ids: readonly number[],
  from: number,
  to: number,
) =>
  ids.length === 0
    ? Effect.succeed<{ id: number }[]>([])
    : rowTable === "LootNpc"
      ? executor
          .update(lootNpcTable)
          .set({ npcSnapshotId: to })
          .where(
            and(
              inArray(lootNpcTable.id, [...ids]),
              eq(lootNpcTable.npcSnapshotId, from),
            ),
          )
          .returning({ id: lootNpcTable.id })
      : executor
          .update(lootItemTable)
          .set({ itemSnapshotId: to })
          .where(
            and(
              inArray(lootItemTable.id, [...ids]),
              eq(lootItemTable.itemSnapshotId, from),
            ),
          )
          .returning({ id: lootItemTable.id });

const lockEntry = (executor: Executor, runId: string, entryId: string) =>
  executor
    .select()
    .from(legacyRepairEntryTable)
    .where(
      and(
        eq(legacyRepairEntryTable.runId, runId),
        eq(legacyRepairEntryTable.entryId, entryId),
      ),
    )
    .for("update")
    .pipe(Effect.map((rows) => rows[0] ?? null));

const updateEntry = (
  executor: Executor,
  runId: string,
  entryId: string,
  values: Partial<typeof legacyRepairEntryTable.$inferInsert>,
) =>
  executor
    .update(legacyRepairEntryTable)
    .set(values)
    .where(
      and(
        eq(legacyRepairEntryTable.runId, runId),
        eq(legacyRepairEntryTable.entryId, entryId),
      ),
    );

const now = Clock.currentTimeMillis.pipe(
  Effect.map((millis) => new Date(millis)),
);

const sameValue = <T extends string | number>(
  left: T | null | undefined,
  right: T | null | undefined,
) => (left ?? null) === (right ?? null);

export const makeLegacyRepair = (database: ApiDatabaseValue) => {
  const registerRun = Effect.fn("legacyRepair.registerRun")(function* (
    manifest: LegacyRepairManifest,
  ) {
    const at = yield* now;

    const run = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        yield* transaction
          .insert(legacyRepairRunTable)
          .values({
            runId: manifest.runId,
            manifestVersion: manifest.manifestVersion,
            manifestSha256: manifest.manifestSha256,
            entryCount: manifest.entries.length,
            status: "applying",
            updatedAt: at,
          })
          .onConflictDoNothing();

        const rows = yield* transaction
          .select()
          .from(legacyRepairRunTable)
          .where(eq(legacyRepairRunTable.runId, manifest.runId))
          .for("update");

        return rows[0];
      }),
    );

    if (!run) return yield* fail("run could not be registered");

    if (run.manifestSha256 !== manifest.manifestSha256) {
      return yield* fail(
        "the manifest differs from the one this run started with",
      );
    }

    if (run.status === "rollingBack" || run.status === "rolledBack") {
      return yield* fail("this run was rolled back; apply under a new run id");
    }

    for (let index = 0; index < manifest.entries.length; index += 500) {
      yield* database
        .insert(legacyRepairEntryTable)
        .values(
          manifest.entries
            .slice(index, index + 500)
            .map((entry) => entryValues(manifest.runId, entry, at)),
        )
        .onConflictDoNothing();
    }

    return run;
  });

  const ensureNpcTarget = (
    transaction: Transaction,
    entry: Extract<RelinkPlan, { kind: "npcRelink" }>,
  ) =>
    Effect.gen(function* () {
      const [source] = yield* transaction
        .select()
        .from(npcSnapshotTable)
        .where(eq(npcSnapshotTable.id, entry.sourceSnapshotId));

      const revision = entry.revision;

      if (!source || source.snapshotHash !== null) {
        return yield* fail(`${entry.entryId}: source is not a legacy snapshot`);
      }

      const copied =
        source.npcId === revision.npcId &&
        source.identityNamespace === revision.identityNamespace &&
        source.name === revision.name &&
        sameValue(source.type, revision.type) &&
        sameValue(source.icon, revision.icon) &&
        sameValue(source.prof, revision.prof) &&
        sameValue(source.wt, revision.wt) &&
        sameValue(source.margonemType, revision.margonemType);

      if (!copied) {
        return yield* fail(
          `${entry.entryId}: revision attributes other than the level differ from the source`,
        );
      }

      if (createNpcSnapshotHash(revision) !== entry.snapshotHash) {
        return yield* fail(`${entry.entryId}: proposed snapshot hash differs`);
      }

      const inserted = yield* transaction
        .insert(npcSnapshotTable)
        .values({
          npcId: revision.npcId,
          identityNamespace: revision.identityNamespace,
          world: revision.world,
          gameVersion: revision.gameVersion,
          snapshotHash: entry.snapshotHash,
          name: revision.name,
          type: source.type,
          lvl: revision.lvl,
          icon: source.icon,
          wt: source.wt,
          margonemType: source.margonemType,
          prof: source.prof,
        })
        .onConflictDoNothing({
          target: [npcSnapshotTable.npcId, npcSnapshotTable.snapshotHash],
        })
        .returning({ id: npcSnapshotTable.id });

      if (inserted[0]) return { id: inserted[0].id, created: true };

      const [existing] = yield* transaction
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(
          and(
            eq(npcSnapshotTable.npcId, revision.npcId),
            eq(npcSnapshotTable.snapshotHash, entry.snapshotHash),
          ),
        );

      if (!existing) return yield* fail(`${entry.entryId}: target not found`);

      return { id: existing.id, created: false };
    });

  const ensureItemTarget = (
    transaction: Transaction,
    entry: Extract<RelinkPlan, { kind: "itemRelink" }>,
  ) =>
    Effect.gen(function* () {
      const [source] = yield* transaction
        .select()
        .from(itemSnapshotTable)
        .where(eq(itemSnapshotTable.id, entry.sourceSnapshotId));

      const [presentation] = yield* transaction
        .select()
        .from(itemSnapshotTable)
        .where(eq(itemSnapshotTable.id, entry.nameIconSourceSnapshotId));

      const revision = entry.revision;

      if (!source || source.snapshotHash !== null) {
        return yield* fail(`${entry.entryId}: source is not a legacy snapshot`);
      }

      if (
        source.itemId !== revision.itemId ||
        !sameValue(source.itemType, revision.itemType) ||
        source.statsHash !== revision.statsHash ||
        createItemStatsHash(source.statRaw) !== source.statsHash
      ) {
        return yield* fail(`${entry.entryId}: source stats differ`);
      }

      if (
        !presentation ||
        presentation.itemId !== revision.itemId ||
        !sameValue(presentation.itemType, revision.itemType) ||
        presentation.name !== revision.name ||
        presentation.icon !== revision.icon
      ) {
        return yield* fail(`${entry.entryId}: name and icon source differs`);
      }

      const stat = splitItemStat(source.statRaw).revision;

      const snapshotHash = createItemSnapshotHash({
        gameVersion: revision.gameVersion,
        itemId: revision.itemId,
        name: revision.name,
        icon: revision.icon,
        itemType: source.itemType,
        stat,
      });

      if (snapshotHash !== entry.snapshotHash) {
        return yield* fail(`${entry.entryId}: proposed snapshot hash differs`);
      }

      const inserted = yield* transaction
        .insert(itemSnapshotTable)
        .values({
          itemId: revision.itemId,
          gameVersion: revision.gameVersion,
          statsHash: source.statsHash,
          snapshotHash,
          name: revision.name,
          icon: revision.icon,
          lvl: source.lvl,
          rarity: source.rarity,
          itemType: source.itemType,
          statRaw: stat,
          statsSnapshot: parseItemStats(stat),
        })
        .onConflictDoNothing({
          target: [itemSnapshotTable.itemId, itemSnapshotTable.snapshotHash],
        })
        .returning({ id: itemSnapshotTable.id });

      if (inserted[0]) return { id: inserted[0].id, created: true };

      const [existing] = yield* transaction
        .select({ id: itemSnapshotTable.id })
        .from(itemSnapshotTable)
        .where(
          and(
            eq(itemSnapshotTable.itemId, revision.itemId),
            eq(itemSnapshotTable.snapshotHash, snapshotHash),
          ),
        );

      if (!existing) return yield* fail(`${entry.entryId}: target not found`);

      return { id: existing.id, created: false };
    });

  // Creates the replacement revision, or relinks to an identical one that
  // already exists, and records which it was on the entry.
  const ensureTarget = Effect.fn("legacyRepair.ensureTarget")(function* (
    runId: string,
    entry: RelinkPlan,
  ) {
    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row)
          return yield* fail(`${entry.entryId}: entry is not registered`);

        if (row.targetSnapshotId !== null) return row.targetSnapshotId;

        const target =
          entry.kind === "npcRelink"
            ? yield* ensureNpcTarget(transaction, entry)
            : yield* ensureItemTarget(transaction, entry);

        yield* updateEntry(transaction, runId, entry.entryId, {
          targetSnapshotId: target.id,
          targetCreated: target.created,
          updatedAt: yield* now,
        });

        return target.id;
      }),
    );
  });

  // Moves one batch of an entry's rows. Returns the rows it processed, or
  // null once the entry is no longer pending.
  const relinkBatch = Effect.fn("legacyRepair.relinkBatch")(function* (
    runId: string,
    entry: RelinkPlan,
    targetSnapshotId: number,
    batchSize: number,
  ) {
    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row || row.status !== "pending") return null;

        const cursor = row.cursorRowId ?? 0;

        const ids = entry.rowIds
          .filter((id) => id > cursor)
          .slice(0, batchSize);

        const at = yield* now;

        if (ids.length === 0) {
          yield* updateEntry(transaction, runId, entry.entryId, {
            status: "applied",
            appliedAt: at,
            updatedAt: at,
          });

          return null;
        }

        const current = yield* lockLinks(transaction, entry.rowTable, ids);
        const movable: number[] = [];
        let alreadyOnTarget = 0;

        for (const link of current) {
          if (link.snapshotId === targetSnapshotId) {
            alreadyOnTarget += 1;
          } else if (
            link.snapshotId === entry.sourceSnapshotId &&
            entry.worlds.includes(link.world) &&
            (link.gameVersion === null ||
              link.gameVersion === entry.revision.gameVersion)
          ) {
            movable.push(link.id);
          }
        }

        const moved = yield* moveLinks(
          transaction,
          entry.rowTable,
          movable,
          entry.sourceSnapshotId,
          targetSnapshotId,
        );

        if (moved.length > 0) {
          yield* transaction.insert(legacyRepairLinkTable).values(
            moved.map(({ id }) => ({
              runId,
              rowTable: entry.rowTable,
              rowId: id,
              entryId: entry.entryId,
              fromSnapshotId: entry.sourceSnapshotId,
              toSnapshotId: targetSnapshotId,
              appliedAt: at,
            })),
          );
        }

        const lastId = ids.at(-1) ?? cursor;
        const done = !entry.rowIds.some((id) => id > lastId);

        yield* updateEntry(transaction, runId, entry.entryId, {
          cursorRowId: lastId,
          appliedRows: row.appliedRows + moved.length,
          alreadyOnTargetRows: row.alreadyOnTargetRows + alreadyOnTarget,
          skippedRows:
            row.skippedRows + ids.length - moved.length - alreadyOnTarget,
          status: done ? "applied" : "pending",
          appliedAt: done ? at : null,
          updatedAt: at,
        });

        return ids.length;
      }),
    );
  });

  const applySelection = Effect.fn("legacyRepair.applySelection")(function* (
    runId: string,
    entry: Extract<
      LegacyRepairPlanEntry,
      { kind: "npcSelection" | "itemSelection" }
    >,
  ) {
    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row || row.status !== "pending") return;

        const selection =
          entry.kind === "npcSelection"
            ? yield* npcSelection(transaction, entry)
            : yield* itemSelection(transaction, entry);

        const inserted = selection
          ? yield* transaction
              .insert(notificationRuleUnresolvedSelectionTable)
              .values({
                ...selection,
                repairRunId: runId,
                repairEntryId: entry.entryId,
              })
              .onConflictDoNothing()
              .returning({ id: notificationRuleUnresolvedSelectionTable.id })
          : [];

        const at = yield* now;

        yield* updateEntry(transaction, runId, entry.entryId, {
          status: "applied",
          appliedRows: inserted.length,
          alreadyOnTargetRows: selection && inserted.length === 0 ? 1 : 0,
          skippedRows: selection ? 0 : 1,
          appliedAt: at,
          updatedAt: at,
        });
      }),
    );
  });

  // The rule still selects the id, so members see why it matches no timer.
  // A rule edited or deleted since the dry run is left alone.
  const npcSelection = (
    transaction: Transaction,
    entry: Extract<LegacyRepairPlanEntry, { kind: "npcSelection" }>,
  ) =>
    Effect.gen(function* () {
      const [rule] = yield* transaction
        .select({
          triggerType: notificationRuleTable.triggerType,
          filters: notificationRuleTable.filters,
        })
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, entry.ruleId))
        .for("update");

      if (
        !rule ||
        rule.triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN ||
        !notificationMatchingPolicy
          .timerSelections(rule.filters)
          .npcIds.includes(entry.npcId)
      ) {
        return null;
      }

      return {
        ruleId: entry.ruleId,
        kind: "npc",
        selectedId: entry.npcId,
        selectedName: entry.selectedName,
        reason: entry.reason,
        suggestedId: entry.suggestedId,
        suggestedName: entry.suggestedName,
      } as const;
    });

  const itemSelection = (
    transaction: Transaction,
    entry: Extract<LegacyRepairPlanEntry, { kind: "itemSelection" }>,
  ) =>
    Effect.gen(function* () {
      const [watched] = yield* transaction
        .select({
          itemId: watchedItemTable.itemId,
          itemName: watchedItemTable.itemName,
          ruleId: watchedItemTable.notificationRuleId,
        })
        .from(watchedItemTable)
        .where(eq(watchedItemTable.id, entry.watchedItemId))
        .for("update");

      if (
        !watched ||
        watched.ruleId === null ||
        watched.itemId !== entry.itemId ||
        watched.itemName !== entry.itemName
      ) {
        return null;
      }

      return {
        ruleId: watched.ruleId,
        kind: "item",
        selectedId: entry.itemId,
        selectedName: entry.itemName,
        reason: entry.reason,
        suggestedId: null,
        suggestedName: null,
      } as const;
    });

  const setRunStatus = (
    runId: string,
    status: "applied" | "rollingBack" | "rolledBack",
  ) =>
    Effect.gen(function* () {
      const at = yield* now;

      const values: Partial<typeof legacyRepairRunTable.$inferInsert> = {
        status,
        updatedAt: at,
      };

      if (status === "applied") values.appliedAt = at;

      if (status === "rolledBack") values.rolledBackAt = at;

      yield* database
        .update(legacyRepairRunTable)
        .set(values)
        .where(eq(legacyRepairRunTable.runId, runId));
    });

  const openEntries = (
    runId: string,
    statuses: readonly LegacyRepairEntryStatus[],
  ) =>
    database
      .select()
      .from(legacyRepairEntryTable)
      .where(
        and(
          eq(legacyRepairEntryTable.runId, runId),
          inArray(legacyRepairEntryTable.status, [...statuses]),
        ),
      );

  const apply = Effect.fn("legacyRepair.apply")(function* (
    manifest: LegacyRepairManifest,
    options: LegacyRepairOptions,
  ) {
    const run = yield* registerRun(manifest);

    const pending = new Set(
      (yield* openEntries(manifest.runId, ["pending"])).map(
        ({ entryId }) => entryId,
      ),
    );

    let processedRows = 0;

    for (const entry of manifest.entries) {
      if (!pending.has(entry.entryId)) continue;

      if (entry.kind === "npcSelection" || entry.kind === "itemSelection") {
        yield* applySelection(manifest.runId, entry);
        continue;
      }

      if (entry.kind !== "npcRelink" && entry.kind !== "itemRelink") continue;

      if (processedRows >= options.maxRows) break;
      const target = yield* ensureTarget(manifest.runId, entry);

      while (processedRows < options.maxRows) {
        const batch = yield* relinkBatch(
          manifest.runId,
          entry,
          target,
          Math.min(options.batchSize, options.maxRows - processedRows),
        );

        if (batch === null) break;
        processedRows += batch;
      }
    }

    const remaining = yield* openEntries(manifest.runId, ["pending"]);
    const complete = remaining.length === 0;

    if (complete && run.status === "applying") {
      yield* setRunStatus(manifest.runId, "applied");
    }

    return {
      runId: manifest.runId,
      status: complete ? "applied" : "applying",
      complete,
      processedRows,
    } satisfies LegacyRepairProgress;
  });

  // Restores one batch of logged rows that still point at the entry's target;
  // a row changed since the repair keeps its current snapshot.
  const restoreBatch = Effect.fn("legacyRepair.restoreBatch")(function* (
    runId: string,
    entryId: string,
    batchSize: number,
  ) {
    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entryId);

        if (!row?.rowTable || row.status === "rolledBack") return 0;

        const links = yield* transaction
          .select()
          .from(legacyRepairLinkTable)
          .where(
            and(
              eq(legacyRepairLinkTable.runId, runId),
              eq(legacyRepairLinkTable.entryId, entryId),
              isNull(legacyRepairLinkTable.restoredAt),
            ),
          )
          .orderBy(asc(legacyRepairLinkTable.rowId))
          .limit(batchSize);

        if (links.length === 0) return 0;

        const current = new Map(
          (yield* lockLinks(
            transaction,
            row.rowTable,
            links.map(({ rowId }) => rowId),
          )).map((link) => [link.id, link.snapshotId]),
        );

        // One entry moves rows between one source and one target revision.
        const [{ fromSnapshotId, toSnapshotId }] = links;

        const restored = yield* moveLinks(
          transaction,
          row.rowTable,
          links
            .filter((link) => current.get(link.rowId) === toSnapshotId)
            .map(({ rowId }) => rowId),
          toSnapshotId,
          fromSnapshotId,
        );

        const at = yield* now;
        const restoredIds = new Set(restored.map(({ id }) => id));

        const outcome = (outcomeValue: "restored" | "kept", ids: number[]) =>
          ids.length === 0
            ? Effect.void
            : transaction
                .update(legacyRepairLinkTable)
                .set({ restoredAt: at, restoreOutcome: outcomeValue })
                .where(
                  and(
                    eq(legacyRepairLinkTable.runId, runId),
                    eq(legacyRepairLinkTable.rowTable, row.rowTable),
                    inArray(legacyRepairLinkTable.rowId, ids),
                  ),
                )
                .pipe(Effect.asVoid);

        yield* outcome("restored", [...restoredIds]);
        yield* outcome(
          "kept",
          links
            .map(({ rowId }) => rowId)
            .filter((rowId) => !restoredIds.has(rowId)),
        );

        yield* updateEntry(transaction, runId, entryId, {
          restoredRows: row.restoredRows + restoredIds.size,
          keptRows: row.keptRows + links.length - restoredIds.size,
          updatedAt: at,
        });

        return links.length;
      }),
    );
  });

  // Removes a revision this run created once no loot link references it; a
  // revision reused by a newer accepted loot stays.
  const removeCreatedTarget = (row: EntryRow) =>
    Effect.gen(function* () {
      if (!row.targetCreated || row.targetSnapshotId === null) return;

      const targetId = row.targetSnapshotId;

      // Built per use: drizzle builders are mutable, so the subquery of the
      // delete and the later lookup must not share one.
      const references = () =>
        row.rowTable === "LootNpc"
          ? database
              .select({ id: lootNpcTable.id })
              .from(lootNpcTable)
              .where(eq(lootNpcTable.npcSnapshotId, targetId))
          : database
              .select({ id: lootItemTable.id })
              .from(lootItemTable)
              .where(eq(lootItemTable.itemSnapshotId, targetId));

      const remove =
        row.rowTable === "LootNpc"
          ? database
              .delete(npcSnapshotTable)
              .where(
                and(eq(npcSnapshotTable.id, targetId), notExists(references())),
              )
          : database
              .delete(itemSnapshotTable)
              .where(
                and(
                  eq(itemSnapshotTable.id, targetId),
                  notExists(references()),
                ),
              );

      yield* remove.pipe(
        // A loot accepted concurrently can reference the revision before the
        // delete; it is then a valid observation and stays. Any other failure
        // fails the invocation, so the entry stays open and is retried.
        Effect.catch((cause) =>
          Effect.gen(function* () {
            const [referenced] = yield* references().limit(1);

            if (!referenced) return yield* Effect.fail(cause);

            yield* Effect.logWarning(
              "Legacy repair kept a created revision a newer loot references",
            ).pipe(Effect.annotateLogs({ entryId: row.entryId }));
          }),
        ),
      );
    });

  const rollback = Effect.fn("legacyRepair.rollback")(function* (
    runId: string,
    options: LegacyRepairOptions,
  ) {
    const [run] = yield* database
      .select()
      .from(legacyRepairRunTable)
      .where(eq(legacyRepairRunTable.runId, runId));

    if (!run) return yield* fail("unknown run id");

    if (run.status !== "rolledBack") {
      yield* setRunStatus(runId, "rollingBack");
    }

    const entries = (yield* openEntries(runId, [
      "pending",
      "applied",
      "recorded",
      "deferred",
    ])).sort((left, right) =>
      left.entryId < right.entryId ? 1 : left.entryId > right.entryId ? -1 : 0,
    );

    let processedRows = 0;

    for (const entry of entries) {
      if (entry.rowTable && entry.domain !== "timerRule") {
        let exhausted = false;

        while (processedRows < options.maxRows) {
          const batch = yield* restoreBatch(
            runId,
            entry.entryId,
            Math.min(options.batchSize, options.maxRows - processedRows),
          );

          if (batch === 0) {
            exhausted = true;
            break;
          }

          processedRows += batch;
        }

        if (!exhausted) break;

        const [latest] = yield* database
          .select()
          .from(legacyRepairEntryTable)
          .where(
            and(
              eq(legacyRepairEntryTable.runId, runId),
              eq(legacyRepairEntryTable.entryId, entry.entryId),
            ),
          );

        if (latest) yield* removeCreatedTarget(latest);
      }

      if (entry.domain === "timerRule" || entry.domain === "watchedItem") {
        yield* database
          .delete(notificationRuleUnresolvedSelectionTable)
          .where(
            and(
              eq(notificationRuleUnresolvedSelectionTable.repairRunId, runId),
              eq(
                notificationRuleUnresolvedSelectionTable.repairEntryId,
                entry.entryId,
              ),
            ),
          );
      }

      const at = yield* now;

      yield* updateEntry(database, runId, entry.entryId, {
        status: "rolledBack",
        rolledBackAt: at,
        updatedAt: at,
      });
    }

    const remaining = yield* openEntries(runId, [
      "pending",
      "applied",
      "recorded",
      "deferred",
    ]);

    const complete = remaining.length === 0;

    if (complete) yield* setRunStatus(runId, "rolledBack");

    return {
      runId,
      status: complete ? "rolledBack" : "rollingBack",
      complete,
      processedRows,
    } satisfies LegacyRepairProgress;
  });

  /** Organizations whose loots have links this run moved or restored. */
  const affectedOrganizationIds = Effect.fn(
    "legacyRepair.affectedOrganizationIds",
  )(function* (runId: string) {
    const organizations = (rowTable: LegacyRepairRowTable) => {
      const link = linkColumns(rowTable);

      return database
        .selectDistinct({ guildId: organizationLootRecordTable.guildId })
        .from(legacyRepairLinkTable)
        .innerJoin(link.table, eq(link.id, legacyRepairLinkTable.rowId))
        .innerJoin(
          organizationLootRecordTable,
          eq(organizationLootRecordTable.lootId, link.lootId),
        )
        .where(
          and(
            eq(legacyRepairLinkTable.runId, runId),
            eq(legacyRepairLinkTable.rowTable, rowTable),
          ),
        );
    };

    const [npc, item] = yield* Effect.all([
      organizations("LootNpc"),
      organizations("LootItem"),
    ]);

    return [...new Set([...npc, ...item].map(({ guildId }) => guildId))];
  });

  /** Counts per decision and status; never Organization data. */
  const status = Effect.fn("legacyRepair.status")(function* (runId: string) {
    const [run] = yield* database
      .select()
      .from(legacyRepairRunTable)
      .where(eq(legacyRepairRunTable.runId, runId));

    if (!run) return yield* fail("unknown run id");

    const entries = yield* database
      .select({
        domain: legacyRepairEntryTable.domain,
        action: legacyRepairEntryTable.action,
        classification: legacyRepairEntryTable.classification,
        unresolvedReason: legacyRepairEntryTable.unresolvedReason,
        status: legacyRepairEntryTable.status,
        entries: count(),
        rows: sum(legacyRepairEntryTable.rowCount).mapWith(Number),
        appliedRows: sum(legacyRepairEntryTable.appliedRows).mapWith(Number),
        alreadyOnTargetRows: sum(
          legacyRepairEntryTable.alreadyOnTargetRows,
        ).mapWith(Number),
        skippedRows: sum(legacyRepairEntryTable.skippedRows).mapWith(Number),
        restoredRows: sum(legacyRepairEntryTable.restoredRows).mapWith(Number),
        keptRows: sum(legacyRepairEntryTable.keptRows).mapWith(Number),
        createdTargets:
          sql<number>`count(*) filter (where ${legacyRepairEntryTable.targetCreated})`.mapWith(
            Number,
          ),
      })
      .from(legacyRepairEntryTable)
      .where(eq(legacyRepairEntryTable.runId, runId))
      .groupBy(
        legacyRepairEntryTable.domain,
        legacyRepairEntryTable.action,
        legacyRepairEntryTable.classification,
        legacyRepairEntryTable.unresolvedReason,
        legacyRepairEntryTable.status,
      )
      .orderBy(
        legacyRepairEntryTable.domain,
        legacyRepairEntryTable.action,
        legacyRepairEntryTable.classification,
        desc(legacyRepairEntryTable.status),
      );

    const [selections] = yield* database
      .select({ open: count() })
      .from(notificationRuleUnresolvedSelectionTable)
      .where(eq(notificationRuleUnresolvedSelectionTable.repairRunId, runId));

    return {
      runId,
      status: run.status,
      manifestSha256: run.manifestSha256,
      entryCount: run.entryCount,
      entries,
      openUnresolvedSelections: selections?.open ?? 0,
    };
  });

  return { apply, rollback, status, affectedOrganizationIds };
};

export class LegacyRepair extends Context.Service<
  LegacyRepair,
  ReturnType<typeof makeLegacyRepair>
>()("@lootlog/api/legacy-repair/LegacyRepair") {
  static readonly layer = Layer.effect(
    LegacyRepair,
    Effect.map(ApiDatabase, makeLegacyRepair),
  );
}

/**
 * Drops read caches that may hold loots with their pre-repair NPC level or
 * item presentation: list pages, statistics and event summaries. Rarity is
 * unchanged by an item relink, so the public stats card stays valid.
 */
export const invalidateLegacyRepairCaches = Effect.fn(
  "legacyRepair.invalidateCaches",
)(function* (
  redis: Pick<RedisService, "invalidateScopes" | "deleteByPattern">,
  guildIds: readonly string[],
) {
  yield* Effect.forEach(
    guildIds,
    (guildId) =>
      Effect.tryPromise({
        try: () =>
          Promise.all([
            redis.invalidateScopes(
              getLootListCacheScope(guildId),
              getLootStatsCacheScope(guildId),
            ),
            redis.deleteByPattern(getEventWrappedCachePattern(guildId)),
          ]),
        catch: (cause) =>
          new LegacyRepairError({
            message: `cache invalidation failed: ${String(cause)}`,
          }),
      }),
    { concurrency: 8, discard: true },
  );

  return guildIds.length;
});
