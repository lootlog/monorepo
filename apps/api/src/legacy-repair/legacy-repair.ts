import {
  createItemSnapshotHash,
  createItemStatsHash,
  createNpcSnapshotHash,
} from "@lootlog/database/snapshot-hash";
import { parseItemStats, splitItemStat } from "@lootlog/database/item-stat";
import { gameVersionOfWorld } from "@lootlog/schema/game-version";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  ne,
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
import { gameVersionOfWorldSql } from "#src/database/drizzle/game-version";
import {
  legacyRepairEntryTable,
  legacyRepairLinkTable,
  legacyRepairRunTable,
  legacyRepairSnapshotTable,
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
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
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
 * Applies and rolls back a verified repair manifest. Each loot link moves in a
 * bounded batch transaction that also records it in `LegacyRepairLink` and
 * advances the entry cursor, and each revision whose identity changes is
 * recorded with its previous values in `LegacyRepairSnapshot`, so an
 * interrupted run resumes after its last committed batch, a repeated run
 * changes nothing, and a rollback restores exactly what this run changed.
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

type PromotionPlan = Extract<LegacyRepairPlanEntry, { kind: "promote" }>;

type EntryRow = typeof legacyRepairEntryTable.$inferSelect;

type NpcRow = typeof npcSnapshotTable.$inferSelect;

type ItemRow = typeof itemSnapshotTable.$inferSelect;

export interface LegacyRepairOptions {
  /** Loot links moved or restored, or loots backfilled, per transaction. */
  readonly batchSize: number;
  /** Upper bound of loot links or loots one invocation changes. */
  readonly maxRows: number;
}

export interface LegacyRepairProgress {
  readonly runId: string;
  readonly status: string;
  readonly complete: boolean;
  readonly processedRows: number;
  /** Organizations whose read caches this invocation invalidated. */
  readonly invalidatedOrganizations: number;
}

/** Drops the read caches of Organizations whose loots changed. */
export type LegacyRepairCacheInvalidation = (
  guildIds: readonly string[],
) => Effect.Effect<unknown, LegacyRepairError>;

/**
 * A loot accepted while a revision handed its hash over may still link the
 * retired revision: it resolved the id before the swap. Acceptance holds its
 * submission lock for at most 30 seconds, so links are moved again until the
 * swap is older than this.
 */
const RETIRE_SETTLE_MILLIS = 60_000;

export interface LegacyRepairConfig {
  readonly invalidateCaches?: LegacyRepairCacheInvalidation;
  readonly retireSettleMillis?: number;
}

/** Organizations whose caches one invocation has invalidated. */
type Touched = Set<string> & { everyOrganization?: boolean };

const fail = (message: string) =>
  Effect.fail(new LegacyRepairError({ message }));

const sha256 = (value: string) =>
  new Bun.CryptoHasher("sha256").update(value).digest("hex");

const initialStatus = (
  entry: LegacyRepairPlanEntry,
): LegacyRepairEntryStatus => {
  if (entry.kind === "record") return "recorded";

  return entry.kind === "defer" ? "deferred" : "pending";
};

const rowTableOf = (domain: "npc" | "item"): LegacyRepairRowTable =>
  domain === "npc" ? "LootNpc" : "LootItem";

const entryRows = (entry: LegacyRepairPlanEntry) => {
  switch (entry.kind) {
    case "npcRelink":
    case "itemRelink":
      return {
        rowTable: entry.rowTable,
        sourceSnapshotId: entry.sourceSnapshotId,
        rowCount: entry.rowIds.length,
        rowIdsSha256: entry.rowIdsSha256,
      };
    case "record":
    case "defer":
      return {
        rowTable: entry.rowTable ?? null,
        sourceSnapshotId: entry.sourceSnapshotId ?? null,
        rowCount: entry.rowCount,
        rowIdsSha256: entry.rowIdsSha256 ?? null,
      };
    // A promotion moves only the links of the revision it retires, found
    // when it runs.
    case "promote":
      return {
        rowTable: rowTableOf(entry.domain),
        sourceSnapshotId: entry.retireSnapshotId,
        targetSnapshotId: entry.snapshotId,
        rowCount: 0,
      };
    case "lootBackfill":
      return { rowTable: null, sourceSnapshotId: null, rowCount: 0 };
    default:
      return { rowTable: null, sourceSnapshotId: null, rowCount: 1 };
  }
};

const entryValues = (
  runId: string,
  entry: LegacyRepairPlanEntry,
  now: Date,
): typeof legacyRepairEntryTable.$inferInsert => {
  const status = initialStatus(entry);

  return {
    runId,
    entryId: entry.entryId,
    domain: entry.domain,
    action: entry.action,
    classification: entry.classification,
    unresolvedReason: entry.unresolvedReason,
    ...entryRows(entry),
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

/** Current snapshot and loot edition of the given links, locked. */
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
    .for("update", { of: link.table })
    .pipe(
      Effect.map((links) =>
        links.map((row) => ({
          id: row.id,
          snapshotId: row.snapshotId,
          gameVersion: row.gameVersion ?? gameVersionOfWorld(row.world),
        })),
      ),
    );
};

/**
 * Some links of a revision, locked. Unordered: ordering by id would make
 * PostgreSQL walk the link table's primary key instead of the snapshot index.
 */
const lockLinksOf = (
  executor: Executor,
  rowTable: LegacyRepairRowTable,
  snapshotId: number,
  limit: number,
) => {
  const link = linkColumns(rowTable);

  return executor
    .select({ id: link.id })
    .from(link.table)
    .where(eq(link.snapshotId, snapshotId))
    .limit(limit)
    .for("update")
    .pipe(Effect.map((rows) => rows.map(({ id }) => id)));
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

const logLinks = (
  executor: Executor,
  values: {
    runId: string;
    entryId: string;
    rowTable: LegacyRepairRowTable;
    ids: readonly number[];
    from: number;
    to: number;
    at: Date;
  },
) =>
  values.ids.length === 0
    ? Effect.void
    : executor
        .insert(legacyRepairLinkTable)
        .values(
          values.ids.map((rowId) => ({
            runId: values.runId,
            rowTable: values.rowTable,
            rowId,
            entryId: values.entryId,
            fromSnapshotId: values.from,
            toSnapshotId: values.to,
            appliedAt: values.at,
          })),
        )
        .pipe(Effect.asVoid);

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

type NpcRevision = Extract<
  LegacyRepairPlanEntry,
  { kind: "npcRelink" }
>["revision"];

type ItemRevision = Extract<
  LegacyRepairPlanEntry,
  { kind: "itemRelink" }
>["revision"];

/** Observed NPC attributes equal, apart from the edition and the level. */
const sameNpcObservation = (row: NpcRow, revision: NpcRevision) =>
  row.npcId === revision.npcId &&
  row.identityNamespace === revision.identityNamespace &&
  row.name === revision.name &&
  sameValue(row.type, revision.type) &&
  sameValue(row.icon, revision.icon) &&
  sameValue(row.prof, revision.prof) &&
  sameValue(row.wt, revision.wt) &&
  sameValue(row.margonemType, revision.margonemType);

const isNpcRevision = (row: NpcRow, revision: NpcRevision) =>
  sameNpcObservation(row, revision) &&
  sameValue(row.lvl, revision.lvl) &&
  row.gameVersion === revision.gameVersion;

const isItemRevision = (row: ItemRow, revision: ItemRevision) =>
  row.itemId === revision.itemId &&
  row.gameVersion === revision.gameVersion &&
  row.name === revision.name &&
  row.icon === revision.icon &&
  sameValue(row.itemType, revision.itemType) &&
  row.statsHash === revision.statsHash;

export const makeLegacyRepair = (
  database: ApiDatabaseValue,
  {
    invalidateCaches = () => Effect.void,
    retireSettleMillis = RETIRE_SETTLE_MILLIS,
  }: LegacyRepairConfig = {},
) => {
  /** Organizations with a loot among the given links. */
  const organizationsOf = (
    rowTable: LegacyRepairRowTable,
    rowIds: readonly number[],
  ) => {
    const link = linkColumns(rowTable);

    return database
      .selectDistinct({ guildId: organizationLootRecordTable.guildId })
      .from(link.table)
      .innerJoin(
        organizationLootRecordTable,
        eq(organizationLootRecordTable.lootId, link.lootId),
      )
      .where(inArray(link.id, [...rowIds]))
      .pipe(Effect.map((rows) => rows.map(({ guildId }) => guildId)));
  };

  /** Every Organization with a loot. */
  const allOrganizations = database
    .selectDistinct({ guildId: organizationLootRecordTable.guildId })
    .from(organizationLootRecordTable)
    .pipe(Effect.map((rows) => rows.map(({ guildId }) => guildId)));

  // Runs after a batch commits, so a cache refilled from the old links is
  // dropped; `touched` collects the Organizations of one invocation.
  const invalidate = (touched: Touched, guildIds: readonly string[]) =>
    Effect.gen(function* () {
      const pending = guildIds.filter((guildId) => !touched.has(guildId));

      if (pending.length === 0) return;

      for (const guildId of pending) touched.add(guildId);
      yield* invalidateCaches(pending);
    });

  // Item stats shown with loots of any Organization changed: every
  // Organization's caches go, once per invocation.
  const invalidateEveryOrganization = (touched: Touched) =>
    Effect.gen(function* () {
      if (touched.everyOrganization) return;

      yield* invalidate(touched, yield* allOrganizations);
      touched.everyOrganization = true;
    });

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

  // ------------------------------------------------------------ loot backfill

  // Fills the edition of the next loots accepted without one from their
  // world, in id order. A declared game version is never overwritten, and a
  // loot accepted without one while the run is open is filled by a later
  // invocation.
  const backfillBatch = Effect.fn("legacyRepair.backfillBatch")(function* (
    runId: string,
    entryId: string,
    batchSize: number,
  ) {
    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entryId);

        if (!row || row.status !== "pending") return null;

        const cursor = row.cursorRowId ?? 0;
        const at = yield* now;

        const next = transaction
          .select({ id: lootTable.id })
          .from(lootTable)
          .where(and(gt(lootTable.id, cursor), isNull(lootTable.gameVersion)))
          .orderBy(asc(lootTable.id))
          .limit(batchSize);

        const filled = yield* transaction
          .update(lootTable)
          .set({ gameVersion: gameVersionOfWorldSql(lootTable.world) })
          .where(
            and(inArray(lootTable.id, next), isNull(lootTable.gameVersion)),
          )
          .returning({ id: lootTable.id });

        if (filled.length === 0) {
          yield* updateEntry(transaction, runId, entryId, {
            status: "applied",
            appliedAt: at,
            updatedAt: at,
          });

          return null;
        }

        yield* updateEntry(transaction, runId, entryId, {
          cursorRowId: Math.max(...filled.map(({ id }) => id)),
          appliedRows: row.appliedRows + filled.length,
          rowCount: row.rowCount + filled.length,
          updatedAt: at,
        });

        return filled.length;
      }),
    );
  });

  // ---------------------------------------------------------- relink targets

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

      if (!source) return yield* fail(`${entry.entryId}: source is missing`);

      if (!sameNpcObservation(source, revision)) {
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
        .select()
        .from(npcSnapshotTable)
        .where(
          and(
            eq(npcSnapshotTable.npcId, revision.npcId),
            eq(npcSnapshotTable.snapshotHash, entry.snapshotHash),
          ),
        );

      if (!existing || !isNpcRevision(existing, revision)) {
        return yield* fail(`${entry.entryId}: target differs from the plan`);
      }

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

      const revision = entry.revision;

      if (
        !source ||
        source.itemId !== revision.itemId ||
        !sameValue(source.itemType, revision.itemType) ||
        source.statsHash !== revision.statsHash ||
        createItemStatsHash(source.statRaw) !== source.statsHash
      ) {
        return yield* fail(`${entry.entryId}: source stats differ`);
      }

      // Another revision of the same edition supplies the name and icon; a
      // name from the other edition is never used.
      const presentationId = entry.nameIconSourceSnapshotId ?? source.id;

      const [presentation] = yield* transaction
        .select()
        .from(itemSnapshotTable)
        .where(eq(itemSnapshotTable.id, presentationId));

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
        .select()
        .from(itemSnapshotTable)
        .where(
          and(
            eq(itemSnapshotTable.itemId, revision.itemId),
            eq(itemSnapshotTable.snapshotHash, snapshotHash),
          ),
        );

      if (!existing || !isItemRevision(existing, revision)) {
        return yield* fail(`${entry.entryId}: target differs from the plan`);
      }

      return { id: existing.id, created: false };
    });

  // Creates the edition revision, or reuses the one that already holds its
  // hash, and records which it was on the entry.
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
    touched: Touched,
  ) {
    const batch = yield* database.transaction((transaction) =>
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

        // A link moves only while it still points at the source and its loot
        // belongs to the target's edition.
        for (const link of current) {
          if (link.snapshotId === targetSnapshotId) {
            alreadyOnTarget += 1;
          } else if (
            link.snapshotId === entry.sourceSnapshotId &&
            link.gameVersion === entry.revision.gameVersion
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

        yield* logLinks(transaction, {
          runId,
          entryId: entry.entryId,
          rowTable: entry.rowTable,
          ids: moved.map(({ id }) => id),
          from: entry.sourceSnapshotId,
          to: targetSnapshotId,
          at,
        });

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

        return { processed: ids.length, moved: moved.map(({ id }) => id) };
      }),
    );

    if (batch === null) return null;

    if (batch.moved.length > 0) {
      yield* invalidate(
        touched,
        yield* organizationsOf(entry.rowTable, batch.moved),
      );
    }

    return batch.processed;
  });

  // --------------------------------------------------------------- promotions

  const lockNpcSnapshots = (transaction: Transaction, ids: number[]) =>
    transaction
      .select()
      .from(npcSnapshotTable)
      .where(inArray(npcSnapshotTable.id, ids))
      .orderBy(asc(npcSnapshotTable.id))
      .for("update");

  const lockItemSnapshots = (transaction: Transaction, ids: number[]) =>
    transaction
      .select()
      .from(itemSnapshotTable)
      .where(inArray(itemSnapshotTable.id, ids))
      .orderBy(asc(itemSnapshotTable.id))
      .for("update");

  const logSnapshot = (
    transaction: Transaction,
    values: Omit<typeof legacyRepairSnapshotTable.$inferInsert, "appliedAt">,
    at: Date,
  ) =>
    transaction
      .insert(legacyRepairSnapshotTable)
      .values({ ...values, appliedAt: at })
      .pipe(Effect.asVoid);

  // The promoted revision must be unchanged since the dry run, and keep every
  // observed attribute: a promotion only names its edition.
  const promoteNpc = (
    transaction: Transaction,
    runId: string,
    entry: Extract<PromotionPlan, { domain: "npc" }>,
    at: Date,
  ) =>
    Effect.gen(function* () {
      const { revision, before, snapshotHash } = entry;

      // The revision that holds the edition hash now: the one the plan named,
      // or one the API wrote since from an identical observation.
      const [holder] = yield* transaction
        .select({ id: npcSnapshotTable.id })
        .from(npcSnapshotTable)
        .where(
          and(
            eq(npcSnapshotTable.npcId, revision.npcId),
            eq(npcSnapshotTable.snapshotHash, snapshotHash),
            ne(npcSnapshotTable.id, entry.snapshotId),
          ),
        );

      const rows = yield* lockNpcSnapshots(transaction, [
        entry.snapshotId,
        ...(holder ? [holder.id] : []),
      ]);

      const source = rows.find(({ id }) => id === entry.snapshotId);
      const retired = rows.find(({ id }) => id === holder?.id);

      if (
        !source ||
        source.snapshotHash !== before.snapshotHash ||
        source.gameVersion !== before.gameVersion ||
        !sameValue(source.world, before.world)
      ) {
        return yield* fail(`${entry.entryId}: revision changed since the plan`);
      }

      if (
        !sameNpcObservation(source, revision) ||
        !sameValue(source.lvl, revision.lvl) ||
        createNpcSnapshotHash(revision) !== snapshotHash
      ) {
        return yield* fail(`${entry.entryId}: promotion differs from the plan`);
      }

      if (retired) {
        if (!isNpcRevision(retired, revision)) {
          return yield* fail(
            `${entry.entryId}: a different revision holds the edition hash`,
          );
        }

        yield* transaction
          .update(npcSnapshotTable)
          .set({ snapshotHash: null })
          .where(eq(npcSnapshotTable.id, retired.id));

        yield* logSnapshot(
          transaction,
          {
            runId,
            snapshotTable: "NpcSnapshot",
            snapshotId: retired.id,
            entryId: entry.entryId,
            change: "retire",
            previousSnapshotHash: retired.snapshotHash,
            previousGameVersion: retired.gameVersion,
            previousWorld: retired.world,
            appliedSnapshotHash: null,
            appliedGameVersion: retired.gameVersion,
          },
          at,
        );
      }

      yield* transaction
        .update(npcSnapshotTable)
        .set({ snapshotHash, gameVersion: revision.gameVersion, world: null })
        .where(eq(npcSnapshotTable.id, source.id));

      yield* logSnapshot(
        transaction,
        {
          runId,
          snapshotTable: "NpcSnapshot",
          snapshotId: source.id,
          entryId: entry.entryId,
          change: "promote",
          previousSnapshotHash: source.snapshotHash,
          previousGameVersion: source.gameVersion,
          previousWorld: source.world,
          appliedSnapshotHash: snapshotHash,
          appliedGameVersion: revision.gameVersion,
        },
        at,
      );

      return { presentationChanged: false, retiredId: retired?.id ?? null };
    });

  // An item promotion also drops the per-instance entries its first writer
  // left in the shared stats, as every edition revision stores them.
  const promoteItem = (
    transaction: Transaction,
    runId: string,
    entry: Extract<PromotionPlan, { domain: "item" }>,
    at: Date,
  ) =>
    Effect.gen(function* () {
      const { revision, before, snapshotHash } = entry;

      const [holder] = yield* transaction
        .select({ id: itemSnapshotTable.id })
        .from(itemSnapshotTable)
        .where(
          and(
            eq(itemSnapshotTable.itemId, revision.itemId),
            eq(itemSnapshotTable.snapshotHash, snapshotHash),
            ne(itemSnapshotTable.id, entry.snapshotId),
          ),
        );

      const rows = yield* lockItemSnapshots(transaction, [
        entry.snapshotId,
        ...(holder ? [holder.id] : []),
      ]);

      const source = rows.find(({ id }) => id === entry.snapshotId);
      const retired = rows.find(({ id }) => id === holder?.id);

      if (
        !source ||
        source.snapshotHash !== before.snapshotHash ||
        source.gameVersion !== before.gameVersion ||
        sha256(source.statRaw) !== before.statRawSha256
      ) {
        return yield* fail(`${entry.entryId}: revision changed since the plan`);
      }

      const stat = splitItemStat(source.statRaw).revision;

      if (
        source.itemId !== revision.itemId ||
        source.name !== revision.name ||
        source.icon !== revision.icon ||
        !sameValue(source.itemType, revision.itemType) ||
        source.statsHash !== revision.statsHash ||
        createItemStatsHash(source.statRaw) !== source.statsHash ||
        createItemSnapshotHash({
          gameVersion: revision.gameVersion,
          itemId: revision.itemId,
          name: revision.name,
          icon: revision.icon,
          itemType: revision.itemType,
          stat,
        }) !== snapshotHash
      ) {
        return yield* fail(`${entry.entryId}: promotion differs from the plan`);
      }

      if (retired) {
        if (!isItemRevision(retired, revision)) {
          return yield* fail(
            `${entry.entryId}: a different revision holds the edition hash`,
          );
        }

        yield* transaction
          .update(itemSnapshotTable)
          .set({ snapshotHash: null })
          .where(eq(itemSnapshotTable.id, retired.id));

        yield* logSnapshot(
          transaction,
          {
            runId,
            snapshotTable: "ItemSnapshot",
            snapshotId: retired.id,
            entryId: entry.entryId,
            change: "retire",
            previousSnapshotHash: retired.snapshotHash,
            previousGameVersion: retired.gameVersion,
            appliedSnapshotHash: null,
            appliedGameVersion: retired.gameVersion,
          },
          at,
        );
      }

      const presentationChanged = stat !== source.statRaw;

      const promotion: Partial<typeof itemSnapshotTable.$inferInsert> = {
        snapshotHash,
        gameVersion: revision.gameVersion,
      };

      if (presentationChanged) {
        promotion.statRaw = stat;
        promotion.statsSnapshot = parseItemStats(stat);
      }

      yield* transaction
        .update(itemSnapshotTable)
        .set(promotion)
        .where(eq(itemSnapshotTable.id, source.id));

      yield* logSnapshot(
        transaction,
        {
          runId,
          snapshotTable: "ItemSnapshot",
          snapshotId: source.id,
          entryId: entry.entryId,
          change: "promote",
          previousSnapshotHash: source.snapshotHash,
          previousGameVersion: source.gameVersion,
          previousStatRaw: presentationChanged ? source.statRaw : null,
          previousStatsSnapshot: presentationChanged
            ? source.statsSnapshot
            : null,
          appliedSnapshotHash: snapshotHash,
          appliedGameVersion: revision.gameVersion,
        },
        at,
      );

      return { presentationChanged, retiredId: retired?.id ?? null };
    });

  /**
   * Gives a revision its edition identity in one transaction. A revision that
   * already holds the hash hands it over first, so the unique key never
   * admits two holders. Returns when the swap happened, or null once the
   * entry is no longer pending.
   */
  const promote = Effect.fn("legacyRepair.promote")(function* (
    runId: string,
    entry: PromotionPlan,
  ) {
    return yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row || row.status !== "pending") return null;

        const logged = yield* transaction
          .select({
            change: legacyRepairSnapshotTable.change,
            snapshotId: legacyRepairSnapshotTable.snapshotId,
            appliedAt: legacyRepairSnapshotTable.appliedAt,
          })
          .from(legacyRepairSnapshotTable)
          .where(
            and(
              eq(legacyRepairSnapshotTable.runId, runId),
              eq(legacyRepairSnapshotTable.entryId, entry.entryId),
            ),
          );

        const promoted = logged.find(({ change }) => change === "promote");

        if (promoted) {
          return {
            at: promoted.appliedAt,
            presentationChanged: false,
            retiredId:
              logged.find(({ change }) => change === "retire")?.snapshotId ??
              null,
          };
        }

        const at = yield* now;

        const result =
          entry.domain === "npc"
            ? yield* promoteNpc(transaction, runId, entry, at)
            : yield* promoteItem(transaction, runId, entry, at);

        yield* updateEntry(transaction, runId, entry.entryId, {
          sourceSnapshotId: result.retiredId,
          updatedAt: at,
        });

        return { at, ...result };
      }),
    );
  });

  // Moves the next links of the retired revision to the promoted one.
  const retireBatch = Effect.fn("legacyRepair.retireBatch")(function* (
    runId: string,
    entry: PromotionPlan,
    retiredId: number,
    batchSize: number,
    touched: Touched,
  ) {
    const rowTable = rowTableOf(entry.domain);

    const moved = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row || row.status !== "pending") return [];

        const ids = yield* lockLinksOf(
          transaction,
          rowTable,
          retiredId,
          batchSize,
        );

        const movedRows = yield* moveLinks(
          transaction,
          rowTable,
          ids,
          retiredId,
          entry.snapshotId,
        );

        const at = yield* now;

        yield* logLinks(transaction, {
          runId,
          entryId: entry.entryId,
          rowTable,
          ids: movedRows.map(({ id }) => id),
          from: retiredId,
          to: entry.snapshotId,
          at,
        });

        yield* updateEntry(transaction, runId, entry.entryId, {
          appliedRows: row.appliedRows + movedRows.length,
          rowCount: row.rowCount + movedRows.length,
          updatedAt: at,
        });

        return movedRows.map(({ id }) => id);
      }),
    );

    if (moved.length > 0) {
      yield* invalidate(touched, yield* organizationsOf(rowTable, moved));
    }

    return moved.length;
  });

  // A promotion completes once its retired revision has no links left and the
  // swap is old enough that no loot accepted before it can still link there.
  const finishPromotion = Effect.fn("legacyRepair.finishPromotion")(function* (
    runId: string,
    entry: PromotionPlan,
    swap: { at: Date; retiredId: number | null },
  ) {
    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entry.entryId);

        if (!row || row.status !== "pending") return;

        const at = yield* now;

        if (swap.retiredId !== null) {
          if (at.getTime() - swap.at.getTime() < retireSettleMillis) return;

          const remaining = yield* lockLinksOf(
            transaction,
            rowTableOf(entry.domain),
            swap.retiredId,
            1,
          );

          if (remaining.length > 0) return;
        }

        yield* updateEntry(transaction, runId, entry.entryId, {
          status: "applied",
          appliedAt: at,
          updatedAt: at,
        });
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

  // Runs batches until one reports nothing left or the budget is spent, and
  // returns the rows processed.
  const drain = <E>(
    budget: number,
    batchSize: number,
    batch: (size: number) => Effect.Effect<number | null, E>,
  ) =>
    Effect.gen(function* () {
      let processed = 0;

      while (processed < budget) {
        const rows = yield* batch(Math.min(batchSize, budget - processed));

        if (!rows) break;
        processed += rows;
      }

      return processed;
    });

  interface Invocation {
    readonly budget: number;
    readonly batchSize: number;
    readonly touched: Touched;
  }

  const applyPromotion = (
    runId: string,
    entry: PromotionPlan,
    { budget, batchSize, touched }: Invocation,
  ) =>
    Effect.gen(function* () {
      const swap = yield* promote(runId, entry);

      if (swap === null) return 0;

      if (swap.presentationChanged) {
        yield* invalidateEveryOrganization(touched);
      }

      const { retiredId } = swap;

      const moved =
        retiredId === null
          ? 0
          : yield* drain(budget, batchSize, (size) =>
              retireBatch(runId, entry, retiredId, size, touched),
            );

      yield* finishPromotion(runId, entry, swap);

      return moved;
    });

  /** Applies one budget-consuming entry; returns the rows it processed. */
  const applyEntry = (
    runId: string,
    entry: LegacyRepairPlanEntry,
    invocation: Invocation,
  ) =>
    Effect.gen(function* () {
      const { budget, batchSize, touched } = invocation;

      switch (entry.kind) {
        case "lootBackfill":
          return yield* drain(budget, batchSize, (size) =>
            backfillBatch(runId, entry.entryId, size),
          );
        case "promote":
          return yield* applyPromotion(runId, entry, invocation);
        case "npcRelink":
        case "itemRelink": {
          const target = yield* ensureTarget(runId, entry);

          return yield* drain(budget, batchSize, (size) =>
            relinkBatch(runId, entry, target, size, touched),
          );
        }

        default:
          return 0;
      }
    });

  const apply = Effect.fn("legacyRepair.apply")(function* (
    manifest: LegacyRepairManifest,
    options: LegacyRepairOptions,
  ) {
    const run = yield* registerRun(manifest);
    const touched: Touched = new Set<string>();

    // Heals an earlier invocation that stopped between a commit and its
    // cache invalidation.
    yield* invalidate(touched, yield* affectedOrganizationIds(manifest.runId));

    const pending = new Set(
      (yield* openEntries(manifest.runId, ["pending"])).map(
        ({ entryId }) => entryId,
      ),
    );

    let processedRows = 0;

    // Entries run in manifest order: the backfill, then promotions, then
    // relinks, so a relink reuses the revision a promotion named instead of
    // creating a second holder of its hash.
    for (const entry of manifest.entries) {
      if (!pending.has(entry.entryId)) continue;

      if (entry.kind === "npcSelection" || entry.kind === "itemSelection") {
        yield* applySelection(manifest.runId, entry);
        continue;
      }

      const budget = options.maxRows - processedRows;

      if (budget <= 0) break;

      processedRows += yield* applyEntry(manifest.runId, entry, {
        budget,
        batchSize: options.batchSize,
        touched,
      });
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
      invalidatedOrganizations: touched.size,
    } satisfies LegacyRepairProgress;
  });

  // Restores one batch of logged rows that still point at the entry's target;
  // a row changed since the repair keeps its current snapshot.
  const restoreBatch = Effect.fn("legacyRepair.restoreBatch")(function* (
    runId: string,
    entryId: string,
    batchSize: number,
    touched: Touched,
  ) {
    const batch = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const row = yield* lockEntry(transaction, runId, entryId);

        if (!row?.rowTable || row.status === "rolledBack") return null;

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

        if (links.length === 0) return null;

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

        return {
          processed: links.length,
          rowTable: row.rowTable,
          restored: [...restoredIds],
        };
      }),
    );

    if (batch === null) return 0;

    if (batch.restored.length > 0) {
      yield* invalidate(
        touched,
        yield* organizationsOf(batch.rowTable, batch.restored),
      );
    }

    return batch.processed;
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

  // The previous identity of a promoted item revision, and its stats when the
  // promotion removed per-instance entries from them.
  const itemRestore = (log: typeof legacyRepairSnapshotTable.$inferSelect) => {
    const values: Partial<typeof itemSnapshotTable.$inferInsert> = {
      snapshotHash: log.previousSnapshotHash,
      gameVersion: log.previousGameVersion,
    };

    if (log.previousStatRaw !== null) {
      values.statRaw = log.previousStatRaw;
      values.statsSnapshot = log.previousStatsSnapshot;
    }

    return values;
  };

  /**
   * Restores the identity of revisions a promotion changed, when they still
   * carry the values this run set. The promoted revision reverts first, so
   * the retired one can take its hash back. Returns whether item stats shown
   * with loots changed.
   */
  const revertSnapshots = (runId: string, entryId: string) =>
    database.transaction((transaction) =>
      Effect.gen(function* () {
        const logs = yield* transaction
          .select()
          .from(legacyRepairSnapshotTable)
          .where(
            and(
              eq(legacyRepairSnapshotTable.runId, runId),
              eq(legacyRepairSnapshotTable.entryId, entryId),
              isNull(legacyRepairSnapshotTable.restoredAt),
            ),
          );

        const promoted = logs.find(({ change }) => change === "promote");
        const retired = logs.find(({ change }) => change === "retire");
        const at = yield* now;
        let presentationChanged = false;
        let hashFreed = false;

        const settle = (
          log: typeof legacyRepairSnapshotTable.$inferSelect,
          outcome: "restored" | "kept",
        ) =>
          transaction
            .update(legacyRepairSnapshotTable)
            .set({ restoredAt: at, restoreOutcome: outcome })
            .where(
              and(
                eq(legacyRepairSnapshotTable.runId, runId),
                eq(legacyRepairSnapshotTable.snapshotTable, log.snapshotTable),
                eq(legacyRepairSnapshotTable.snapshotId, log.snapshotId),
              ),
            );

        if (promoted) {
          const restored =
            promoted.snapshotTable === "NpcSnapshot"
              ? yield* transaction
                  .update(npcSnapshotTable)
                  .set({
                    snapshotHash: promoted.previousSnapshotHash,
                    gameVersion: promoted.previousGameVersion,
                    world: promoted.previousWorld,
                  })
                  .where(
                    and(
                      eq(npcSnapshotTable.id, promoted.snapshotId),
                      eq(
                        npcSnapshotTable.snapshotHash,
                        promoted.appliedSnapshotHash ?? "",
                      ),
                    ),
                  )
                  .returning({ id: npcSnapshotTable.id })
              : yield* transaction
                  .update(itemSnapshotTable)
                  .set(itemRestore(promoted))
                  .where(
                    and(
                      eq(itemSnapshotTable.id, promoted.snapshotId),
                      eq(
                        itemSnapshotTable.snapshotHash,
                        promoted.appliedSnapshotHash ?? "",
                      ),
                    ),
                  )
                  .returning({ id: itemSnapshotTable.id });

          hashFreed = restored.length > 0;
          presentationChanged = hashFreed && promoted.previousStatRaw !== null;
          yield* settle(promoted, hashFreed ? "restored" : "kept");
        }

        if (retired) {
          const table =
            retired.snapshotTable === "NpcSnapshot"
              ? npcSnapshotTable
              : itemSnapshotTable;

          const restored =
            hashFreed || !promoted
              ? yield* transaction
                  .update(table)
                  .set({ snapshotHash: retired.previousSnapshotHash })
                  .where(
                    and(
                      eq(table.id, retired.snapshotId),
                      isNull(table.snapshotHash),
                    ),
                  )
                  .returning({ id: table.id })
              : [];

          yield* settle(retired, restored.length > 0 ? "restored" : "kept");
        }

        return presentationChanged;
      }),
    );

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

    const touched: Touched = new Set<string>();

    yield* invalidate(touched, yield* affectedOrganizationIds(runId));

    // Reverse manifest order: relinks move back before promotions revert.
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
            touched,
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

      if (entry.action === "promoteRevision") {
        if (yield* revertSnapshots(runId, entry.entryId)) {
          yield* invalidateEveryOrganization(touched);
        }
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

      // A filled loot edition is derived from its world and stays: it was
      // unknown before, and the world determines it.
      const rolledBack: Partial<typeof legacyRepairEntryTable.$inferInsert> = {
        status: "rolledBack",
        rolledBackAt: at,
        updatedAt: at,
      };

      if (entry.action === "backfillGameVersion") {
        rolledBack.keptRows = entry.appliedRows;
      }

      yield* updateEntry(database, runId, entry.entryId, rolledBack);
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
      invalidatedOrganizations: touched.size,
    } satisfies LegacyRepairProgress;
  });

  /**
   * Organizations whose loots have links this run moved or restored; every
   * Organization once the run changed item stats shown with loots.
   */
  const affectedOrganizationIds = Effect.fn(
    "legacyRepair.affectedOrganizationIds",
  )(function* (runId: string) {
    const [presentation] = yield* database
      .select({ snapshotId: legacyRepairSnapshotTable.snapshotId })
      .from(legacyRepairSnapshotTable)
      .where(
        and(
          eq(legacyRepairSnapshotTable.runId, runId),
          isNotNull(legacyRepairSnapshotTable.previousStatRaw),
        ),
      )
      .limit(1);

    if (presentation) return yield* allOrganizations;

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

    const revisions = yield* database
      .select({
        snapshotTable: legacyRepairSnapshotTable.snapshotTable,
        change: legacyRepairSnapshotTable.change,
        restoreOutcome: legacyRepairSnapshotTable.restoreOutcome,
        revisions: count(),
        statsNormalized:
          sql<number>`count(*) filter (where ${legacyRepairSnapshotTable.previousStatRaw} is not null)`.mapWith(
            Number,
          ),
      })
      .from(legacyRepairSnapshotTable)
      .where(eq(legacyRepairSnapshotTable.runId, runId))
      .groupBy(
        legacyRepairSnapshotTable.snapshotTable,
        legacyRepairSnapshotTable.change,
        legacyRepairSnapshotTable.restoreOutcome,
      )
      .orderBy(
        legacyRepairSnapshotTable.snapshotTable,
        legacyRepairSnapshotTable.change,
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
      revisions,
      openUnresolvedSelections: selections?.open ?? 0,
    };
  });

  return { apply, rollback, status, affectedOrganizationIds };
};

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

export class LegacyRepair extends Context.Service<
  LegacyRepair,
  ReturnType<typeof makeLegacyRepair>
>()("@lootlog/api/legacy-repair/LegacyRepair") {
  static readonly layer = Layer.effect(
    LegacyRepair,
    Effect.gen(function* () {
      const redis = yield* ApiRedis;

      return makeLegacyRepair(yield* ApiDatabase, {
        invalidateCaches: (guildIds) =>
          invalidateLegacyRepairCaches(redis, guildIds),
      });
    }),
  );
}
