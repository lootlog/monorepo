import { createNpcSnapshotHash } from "@lootlog/database/snapshot-hash";
import { and, eq, inArray, or } from "drizzle-orm";
import { sortBy, uniq, uniqBy } from "es-toolkit";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  npcSnapshotTable,
} from "#src/database/drizzle/schema";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { GameVersion } from "@lootlog/schema/game-version";

type SnapshotDatabase = Pick<typeof ApiDatabase.Service, "insert" | "select">;

type ItemObservationInput = Omit<
  typeof itemSnapshotTable.$inferInsert,
  "id" | "snapshotHash"
> & { readonly snapshotHash: string };

type NpcObservationInput = Omit<
  typeof npcSnapshotTable.$inferInsert,
  "id" | "identityNamespace" | "world" | "gameVersion" | "snapshotHash"
> & { readonly identityNamespace: NpcIdentityNamespace };

/** Unique natural key of a snapshot table: a Margonem id and a variant text. */
type SnapshotKey = readonly [number, string];

type StoredSnapshotKey = { id: number; key: SnapshotKey };

/**
 * Resolves one snapshot id per input, in input order, with at most three
 * statements for the whole batch. Repeated inputs share one snapshot and keep
 * their position, so callers can link every instance.
 */
const resolveSnapshotIds = <Input extends object, E>(
  inputs: readonly Input[],
  snapshots: {
    readonly keyOf: (input: Input) => SnapshotKey;
    readonly select: (
      inputs: readonly Input[],
    ) => Effect.Effect<StoredSnapshotKey[], E>;
    readonly insert: (
      inputs: readonly Input[],
    ) => Effect.Effect<StoredSnapshotKey[], E>;
    readonly failure: string;
  },
) =>
  Effect.gen(function* () {
    if (inputs.length === 0) return [];

    const inputKey = (input: Input) => JSON.stringify(snapshots.keyOf(input));

    // The first submitted variant of a key is stored, as sequential inserts did.
    // Concurrent submissions insert their overlapping keys in the same order.
    const unique = sortBy(uniqBy(inputs, inputKey), [
      (input) => snapshots.keyOf(input)[0],
      (input) => snapshots.keyOf(input)[1],
    ]);

    const ids = new Map<string, number>();

    // Read existing rows, insert the missing ones, then read keys that a
    // concurrent submission committed first: a conflicting insert returns no
    // row, but the next READ COMMITTED statement sees it.
    for (const resolve of [
      snapshots.select,
      snapshots.insert,
      snapshots.select,
    ]) {
      const pending = unique.filter((input) => !ids.has(inputKey(input)));

      if (pending.length === 0) break;

      for (const { id, key } of yield* resolve(pending)) {
        ids.set(JSON.stringify(key), id);
      }
    }

    const resolved: number[] = [];

    for (const input of inputs) {
      const id = ids.get(inputKey(input));

      if (id === undefined) {
        return yield* Effect.fail(
          new DependencyUnavailableError(snapshots.failure),
        );
      }

      resolved.push(id);
    }

    return resolved;
  });

// Legacy rows have no hash and never match an observation lookup.
const itemKey = (item: {
  itemId: number;
  snapshotHash: string | null;
}): SnapshotKey => [item.itemId, item.snapshotHash ?? ""];

const npcKey = (npc: {
  npcId: number;
  snapshotHash: string | null;
}): SnapshotKey => [npc.npcId, npc.snapshotHash ?? ""];

const itemSnapshotColumns = {
  id: itemSnapshotTable.id,
  itemId: itemSnapshotTable.itemId,
  snapshotHash: itemSnapshotTable.snapshotHash,
};

const npcSnapshotColumns = {
  id: npcSnapshotTable.id,
  npcId: npcSnapshotTable.npcId,
  snapshotHash: npcSnapshotTable.snapshotHash,
};

const toItemKeys = (
  rows: Array<{ id: number; itemId: number; snapshotHash: string | null }>,
) => rows.map((row) => ({ id: row.id, key: itemKey(row) }));

const toNpcKeys = (
  rows: Array<{ id: number; npcId: number; snapshotHash: string | null }>,
) => rows.map((row) => ({ id: row.id, key: npcKey(row) }));

/**
 * Resolves the observed revision of each item, in input order. A localized
 * name, rename or icon change is a new revision instead of reusing the first
 * row stored for the same item id and stats.
 */
export const resolveItemSnapshotIds = (
  database: SnapshotDatabase,
  items: readonly ItemObservationInput[],
) =>
  resolveSnapshotIds(items, {
    keyOf: itemKey,
    select: (pending) =>
      database
        .select(itemSnapshotColumns)
        .from(itemSnapshotTable)
        .where(
          or(
            ...pending.map((item) =>
              and(
                eq(itemSnapshotTable.itemId, item.itemId),
                eq(itemSnapshotTable.snapshotHash, item.snapshotHash),
              ),
            ),
          ),
        )
        .pipe(Effect.map(toItemKeys)),
    insert: (missing) =>
      database
        .insert(itemSnapshotTable)
        .values([...missing])
        .onConflictDoNothing({
          target: [itemSnapshotTable.itemId, itemSnapshotTable.snapshotHash],
        })
        .returning(itemSnapshotColumns)
        .pipe(Effect.map(toItemKeys)),
    failure: "Failed to resolve item snapshot",
  });

/**
 * Resolves the immutable observation revision of each NPC, in input order.
 * Any observed attribute change produces a new revision instead of reusing the
 * first row stored for the same id and name.
 */
export const resolveNpcSnapshots = (
  database: SnapshotDatabase,
  provenance: { world: string; gameVersion: GameVersion | null },
  npcs: readonly NpcObservationInput[],
) =>
  Effect.gen(function* () {
    const observations = npcs.map((npc) => {
      const observation = { ...npc, ...provenance };

      return {
        ...observation,
        snapshotHash: createNpcSnapshotHash(observation),
      };
    });

    const ids = yield* resolveSnapshotIds(observations, {
      keyOf: npcKey,
      select: (pending) =>
        database
          .select(npcSnapshotColumns)
          .from(npcSnapshotTable)
          .where(
            or(
              ...pending.map((npc) =>
                and(
                  eq(npcSnapshotTable.npcId, npc.npcId),
                  eq(npcSnapshotTable.snapshotHash, npc.snapshotHash),
                ),
              ),
            ),
          )
          .pipe(Effect.map(toNpcKeys)),
      insert: (missing) =>
        database
          .insert(npcSnapshotTable)
          .values([...missing])
          .onConflictDoNothing({
            target: [npcSnapshotTable.npcId, npcSnapshotTable.snapshotHash],
          })
          .returning(npcSnapshotColumns)
          .pipe(Effect.map(toNpcKeys)),
      failure: "Failed to resolve NPC snapshot",
    });

    if (ids.length === 0) return [];

    // Publications describe the persisted revisions, not the request payload.
    const rows = yield* database
      .select()
      .from(npcSnapshotTable)
      .where(inArray(npcSnapshotTable.id, uniq(ids)));

    const snapshotById = new Map(rows.map((row) => [row.id, row]));
    const snapshots: Array<typeof npcSnapshotTable.$inferSelect> = [];

    for (const id of ids) {
      const snapshot = snapshotById.get(id);

      if (!snapshot) {
        return yield* Effect.fail(
          new DependencyUnavailableError("Failed to resolve NPC snapshot"),
        );
      }

      snapshots.push(snapshot);
    }

    return snapshots;
  });
