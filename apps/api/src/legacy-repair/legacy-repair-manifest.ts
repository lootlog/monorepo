import { dirname, join } from "node:path";
import { sortBy, uniq } from "es-toolkit";
import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import type { LegacyRepairRowTable } from "#src/database/drizzle/legacy-repair.schema";
import type { notificationRuleUnresolvedSelectionTable } from "#src/database/drizzle/schema";

/**
 * Reads a LOO-38 repair manifest: one JSON decision per line, written outside
 * the repository, with the loot link ids of each entry in side files. Every
 * entry is decoded and every row-id checksum verified before anything is
 * written, so a truncated or edited manifest cannot be partly applied.
 */

export const LEGACY_REPAIR_MANIFEST_VERSION = 1;

export class LegacyRepairManifestError extends TaggedErrorClass<LegacyRepairManifestError>()(
  "LegacyRepairManifestError",
  { message: Schema.String },
) {}

const Int = Schema.Number.check(Schema.isInt());

const RowTable = Schema.Literals(["LootNpc", "LootItem"]);

const Source = Schema.Struct({
  snapshotId: Schema.optionalKey(Int),
  rowTable: Schema.optionalKey(RowTable),
  rowCount: Schema.optionalKey(Int),
  rowIdsFile: Schema.optionalKey(Schema.String),
  rowIdsSha256: Schema.optionalKey(Schema.String),
  selector: Schema.optionalKey(
    Schema.Struct({ worlds: Schema.optionalKey(Schema.Array(Schema.String)) }),
  ),
  itemId: Schema.optionalKey(Int),
  itemType: Schema.optionalKey(Schema.NullOr(Schema.String)),
  statsHash: Schema.optionalKey(Schema.String),
  npcId: Schema.optionalKey(Int),
  ruleId: Schema.optionalKey(Int),
  names: Schema.optionalKey(Schema.Array(Schema.String)),
  watchedItemId: Schema.optionalKey(Int),
  itemName: Schema.optionalKey(Schema.String),
});

const NpcRevision = Schema.Struct({
  identityNamespace: Schema.String,
  gameVersion: GameVersionSchema,
  world: Schema.String,
  npcId: Int,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  lvl: Int,
  icon: Schema.NullOr(Schema.String),
  prof: Schema.NullOr(Schema.String),
  wt: Schema.NullOr(Int),
  margonemType: Schema.NullOr(Int),
});

export type LegacyRepairNpcRevision = typeof NpcRevision.Type;

const ItemRevision = Schema.Struct({
  gameVersion: GameVersionSchema,
  itemId: Int,
  name: Schema.String,
  icon: Schema.String,
  itemType: Schema.NullOr(Schema.String),
  statsHash: Schema.String,
});

export type LegacyRepairItemRevision = typeof ItemRevision.Type;

const Target = Schema.Struct({
  proposedRevision: Schema.optionalKey(Schema.Unknown),
  proposedSnapshotHash: Schema.optionalKey(Schema.String),
  nameIconSourceSnapshotId: Schema.optionalKey(Int),
  npcId: Schema.optionalKey(Int),
  name: Schema.optionalKey(Schema.String),
});

const ManifestLine = Schema.Struct({
  manifestVersion: Int,
  runId: Schema.String,
  entryId: Schema.String,
  domain: Schema.Literals(["item", "npc", "timerRule", "watchedItem"]),
  action: Schema.Literals([
    "createRevisionAndRelink",
    "markUnresolved",
    "noop",
    "proposeForReview",
    "remapFilter",
  ]),
  classification: Schema.Literals(["confirmed", "suspected", "unrecoverable"]),
  unresolvedReason: Schema.optionalKey(Schema.NullOr(Schema.String)),
  source: Source,
  target: Schema.optionalKey(Schema.NullOr(Target)),
});

type ManifestLine = typeof ManifestLine.Type;

const RowsLine = Schema.Struct({
  entryId: Schema.String,
  table: RowTable,
  ids: Schema.Array(Int),
});

export interface LegacyRepairEntryMeta {
  readonly entryId: string;
  readonly domain: ManifestLine["domain"];
  readonly action: ManifestLine["action"];
  readonly classification: ManifestLine["classification"];
  readonly unresolvedReason: string | null;
}

interface RowSet {
  readonly rowTable: LegacyRepairRowTable;
  readonly sourceSnapshotId: number;
  readonly rowIds: readonly number[];
  readonly rowIdsSha256: string;
}

/** Reasons shown to members for a saved selection the repair could not map. */
type NotificationSelectionReason =
  typeof notificationRuleUnresolvedSelectionTable.$inferInsert.reason;

export type LegacyRepairPlanEntry = LegacyRepairEntryMeta &
  (
    | ({
        readonly kind: "npcRelink";
        readonly worlds: readonly string[];
        readonly revision: LegacyRepairNpcRevision;
        readonly snapshotHash: string;
      } & RowSet)
    | ({
        readonly kind: "itemRelink";
        readonly worlds: readonly string[];
        readonly revision: LegacyRepairItemRevision;
        readonly nameIconSourceSnapshotId: number;
        readonly snapshotHash: string;
      } & RowSet)
    | {
        readonly kind: "npcSelection";
        readonly ruleId: number;
        readonly npcId: number;
        readonly selectedName: string | null;
        readonly reason: NotificationSelectionReason;
        readonly suggestedId: number | null;
        readonly suggestedName: string | null;
      }
    | {
        readonly kind: "itemSelection";
        readonly watchedItemId: number;
        readonly itemId: number;
        readonly itemName: string;
        readonly reason: NotificationSelectionReason;
      }
    // noop and markUnresolved loot entries, and item proposals left for review:
    // the run records them with their row counts and changes no link.
    | ({ readonly kind: "record" | "defer" } & Partial<RowSet> & {
          readonly rowCount: number;
        })
  );

export interface LegacyRepairManifest {
  readonly runId: string;
  readonly manifestVersion: number;
  readonly manifestSha256: string;
  readonly entries: readonly LegacyRepairPlanEntry[];
}

const sha256 = (value: string | Uint8Array) =>
  new Bun.CryptoHasher("sha256").update(value).digest("hex");

/** Checksum format of the dry run: ascending ids joined by "\n". */
export const rowIdsChecksum = (ids: readonly number[]) =>
  sha256(ids.toSorted((left, right) => left - right).join("\n"));

const fail = (message: string) =>
  Effect.fail(new LegacyRepairManifestError({ message }));

const decodeLines = <S extends Schema.Top>(
  schema: S,
  text: string,
  file: string,
) =>
  Effect.forEach(
    text.split("\n").filter((line) => line.trim().length > 0),
    (line, index) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(line).pipe(
        Effect.mapError(
          (issue) =>
            new LegacyRepairManifestError({
              message: `${file}:${index + 1}: ${issue.message}`,
            }),
        ),
      ),
  );

// Manifest reasons for a saved selection, as members see them. A remapped
// timer selection is a legacy catalog id with a suspected successor.
const SELECTION_REASONS = new Map<string, NotificationSelectionReason>([
  ["noRuntimeSuccessor", "legacyCatalogId"],
  ["unknownId", "unknownId"],
  ["nameFromOtherEditionNoSameEditionName", "nameFromOtherEdition"],
  ["nameHasNoSnapshot", "nameWithoutSnapshot"],
]);

const selectionReason = (line: ManifestLine) =>
  line.action === "remapFilter"
    ? "legacyCatalogId"
    : SELECTION_REASONS.get(line.unresolvedReason ?? "");

const entryMeta = (line: ManifestLine): LegacyRepairEntryMeta => ({
  entryId: line.entryId,
  domain: line.domain,
  action: line.action,
  classification: line.classification,
  unresolvedReason: line.unresolvedReason ?? null,
});

const decodeRevision = <S extends Schema.Top>(schema: S, line: ManifestLine) =>
  Schema.decodeUnknownEffect(schema)(line.target?.proposedRevision).pipe(
    Effect.mapError(
      (issue) =>
        new LegacyRepairManifestError({
          message: `entry ${line.entryId}: ${issue.message}`,
        }),
    ),
  );

// The entry's row ids, verified against the manifest's count and checksum.
const verifiedRows = Effect.fnUntraced(function* (
  line: ManifestLine,
  rows: ReadonlyMap<string, typeof RowsLine.Type>,
) {
  const row = rows.get(line.entryId);
  const { snapshotId, rowTable, rowIdsSha256, rowCount } = line.source;
  const where = `entry ${line.entryId}`;

  if (
    !row ||
    snapshotId === undefined ||
    rowTable === undefined ||
    rowIdsSha256 === undefined
  ) {
    return yield* fail(`${where}: missing source rows`);
  }

  if (row.table !== rowTable) {
    return yield* fail(`${where}: row table differs from the manifest`);
  }

  // Snapshot and link ids of the two domains are independent sequences, so
  // an NPC entry must never move item links, or the reverse.
  if (rowTable !== (line.domain === "npc" ? "LootNpc" : "LootItem")) {
    return yield* fail(`${where}: ${rowTable} rows in an ${line.domain} entry`);
  }

  const rowIds = uniq(row.ids).toSorted((left, right) => left - right);

  if (rowIds.length !== row.ids.length || rowIds.length !== rowCount) {
    return yield* fail(`${where}: row count differs from the manifest`);
  }

  if (rowIdsChecksum(rowIds) !== rowIdsSha256) {
    return yield* fail(`${where}: rowIdsSha256 does not match its rows`);
  }

  return {
    rowTable,
    sourceSnapshotId: snapshotId,
    rowIds,
    rowIdsSha256,
  } satisfies RowSet;
});

const relinkEntry = Effect.fnUntraced(function* (
  line: ManifestLine,
  rows: ReadonlyMap<string, typeof RowsLine.Type>,
) {
  const target = line.target;
  const where = `entry ${line.entryId}`;

  if (!target?.proposedSnapshotHash) {
    return yield* fail(`${where}: missing proposed revision`);
  }

  const set = yield* verifiedRows(line, rows);
  const worlds = line.source.selector?.worlds ?? [];

  if (worlds.length === 0) return yield* fail(`${where}: missing worlds`);

  if (line.domain === "npc") {
    const revision = yield* decodeRevision(NpcRevision, line);

    if (worlds.length !== 1 || worlds[0] !== revision.world) {
      return yield* fail(`${where}: an NPC revision covers one world`);
    }

    return {
      ...entryMeta(line),
      ...set,
      kind: "npcRelink",
      worlds,
      revision,
      snapshotHash: target.proposedSnapshotHash,
    } satisfies LegacyRepairPlanEntry;
  }

  if (target.nameIconSourceSnapshotId === undefined) {
    return yield* fail(`${where}: missing name and icon source`);
  }

  return {
    ...entryMeta(line),
    ...set,
    kind: "itemRelink",
    worlds,
    revision: yield* decodeRevision(ItemRevision, line),
    nameIconSourceSnapshotId: target.nameIconSourceSnapshotId,
    snapshotHash: target.proposedSnapshotHash,
  } satisfies LegacyRepairPlanEntry;
});

// noop and markUnresolved loot entries are recorded with their row counts;
// proposals stay deferred for review. Neither changes a link.
const lootRecordEntry = Effect.fnUntraced(function* (
  line: ManifestLine,
  rows: ReadonlyMap<string, typeof RowsLine.Type>,
) {
  if (line.action === "proposeForReview") {
    const set = yield* verifiedRows(line, rows);

    return {
      ...entryMeta(line),
      ...set,
      kind: "defer",
      rowCount: set.rowIds.length,
    } satisfies LegacyRepairPlanEntry;
  }

  // Switch-pair entries aggregate runtime-side snapshots without row ids.
  const set = rows.has(line.entryId) ? yield* verifiedRows(line, rows) : {};

  return {
    ...entryMeta(line),
    ...set,
    kind: "record",
    rowCount: line.source.rowCount ?? 0,
  } satisfies LegacyRepairPlanEntry;
});

const selectionEntry = Effect.fnUntraced(function* (line: ManifestLine) {
  const reason = selectionReason(line);
  const { source } = line;
  const where = `entry ${line.entryId}`;

  if (!reason) return yield* fail(`${where}: unknown unresolved reason`);

  if (line.domain === "watchedItem") {
    if (
      source.watchedItemId === undefined ||
      source.itemId === undefined ||
      source.itemName === undefined
    ) {
      return yield* fail(`${where}: missing watched item`);
    }

    return {
      ...entryMeta(line),
      kind: "itemSelection",
      watchedItemId: source.watchedItemId,
      itemId: source.itemId,
      itemName: source.itemName,
      reason,
    } satisfies LegacyRepairPlanEntry;
  }

  if (source.ruleId === undefined || source.npcId === undefined) {
    return yield* fail(`${where}: missing rule selection`);
  }

  const successor = line.action === "remapFilter" ? line.target : null;

  if (line.action === "remapFilter" && successor?.npcId === undefined) {
    return yield* fail(`${where}: remapFilter without a successor`);
  }

  return {
    ...entryMeta(line),
    kind: "npcSelection",
    ruleId: source.ruleId,
    npcId: source.npcId,
    selectedName: source.names?.length ? source.names.join(" / ") : null,
    reason,
    suggestedId: successor?.npcId ?? null,
    suggestedName: successor?.name ?? null,
  } satisfies LegacyRepairPlanEntry;
});

const toPlanEntry = Effect.fnUntraced(function* (
  line: ManifestLine,
  rows: ReadonlyMap<string, typeof RowsLine.Type>,
): Effect.fn.Return<LegacyRepairPlanEntry, LegacyRepairManifestError> {
  if (line.domain === "timerRule" || line.domain === "watchedItem") {
    return yield* selectionEntry(line);
  }

  if (line.action === "createRevisionAndRelink") {
    return yield* relinkEntry(line, rows);
  }

  if (line.action === "remapFilter") {
    return yield* fail(
      `entry ${line.entryId}: remapFilter is not a loot action`,
    );
  }

  return yield* lootRecordEntry(line, rows);
});

/**
 * Loads and verifies a manifest. `expectedRunId` must equal the manifest's own
 * run id, so an operator names the run they intend to apply.
 */
export const readLegacyRepairManifest = Effect.fn("legacyRepair.readManifest")(
  function* (manifestPath: string, expectedRunId: string) {
    const bytes = yield* Effect.tryPromise({
      try: () => Bun.file(manifestPath).bytes(),
      catch: () =>
        new LegacyRepairManifestError({ message: "manifest is not readable" }),
    });

    const lines = yield* decodeLines(
      ManifestLine,
      new TextDecoder().decode(bytes),
      "manifest",
    );

    if (lines.length === 0) return yield* fail("manifest is empty");

    for (const line of lines) {
      if (line.manifestVersion !== LEGACY_REPAIR_MANIFEST_VERSION) {
        return yield* fail(
          `entry ${line.entryId}: unsupported manifestVersion`,
        );
      }

      if (line.runId !== expectedRunId) {
        return yield* fail(
          `entry ${line.entryId}: runId differs from --run-id`,
        );
      }
    }

    if (new Set(lines.map(({ entryId }) => entryId)).size !== lines.length) {
      return yield* fail("manifest repeats an entryId");
    }

    const rowFiles = [
      ...new Set(lines.flatMap(({ source }) => source.rowIdsFile ?? [])),
    ];

    const rows = new Map<string, typeof RowsLine.Type>();

    for (const file of rowFiles) {
      const text = yield* Effect.tryPromise({
        try: () => Bun.file(join(dirname(manifestPath), file)).text(),
        catch: () =>
          new LegacyRepairManifestError({
            message: `${file} is not readable`,
          }),
      });

      for (const row of yield* decodeLines(RowsLine, text, file)) {
        if (rows.has(row.entryId)) {
          return yield* fail(`${file}: repeats entry ${row.entryId}`);
        }

        rows.set(row.entryId, row);
      }
    }

    const entries = yield* Effect.forEach(lines, (line) =>
      toPlanEntry(line, rows),
    );

    const relinked = new Map<string, string>();

    for (const entry of entries) {
      if (entry.kind !== "npcRelink" && entry.kind !== "itemRelink") continue;

      for (const rowId of entry.rowIds) {
        const key = `${entry.rowTable}:${rowId}`;
        const previous = relinked.get(key);

        if (previous) {
          return yield* fail(
            `entries ${previous} and ${entry.entryId} relink the same row`,
          );
        }

        relinked.set(key, entry.entryId);
      }
    }

    return {
      runId: expectedRunId,
      manifestVersion: LEGACY_REPAIR_MANIFEST_VERSION,
      manifestSha256: sha256(bytes),
      entries: sortBy(entries, [(entry) => entry.entryId]),
    } satisfies LegacyRepairManifest;
  },
);
