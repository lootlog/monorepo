import { and, eq, or } from "drizzle-orm";
import { sortBy, uniqBy } from "es-toolkit";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  itemSnapshotTable,
  npcSnapshotTable,
} from "#src/database/drizzle/schema";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";

type SnapshotDatabase = Pick<typeof ApiDatabase.Service, "insert" | "select">;

type ItemSnapshotInput = Omit<typeof itemSnapshotTable.$inferInsert, "id">;

type NpcSnapshotInput = Omit<typeof npcSnapshotTable.$inferInsert, "id">;

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

const itemKey = (item: { itemId: number; statsHash: string }): SnapshotKey => [
  item.itemId,
  item.statsHash,
];

const npcKey = (npc: { npcId: number; name: string }): SnapshotKey => [
  npc.npcId,
  npc.name,
];

const itemSnapshotColumns = {
  id: itemSnapshotTable.id,
  itemId: itemSnapshotTable.itemId,
  statsHash: itemSnapshotTable.statsHash,
};

const npcSnapshotColumns = {
  id: npcSnapshotTable.id,
  npcId: npcSnapshotTable.npcId,
  name: npcSnapshotTable.name,
};

const toItemKeys = (
  rows: Array<{ id: number; itemId: number; statsHash: string }>,
) => rows.map((row) => ({ id: row.id, key: itemKey(row) }));

const toNpcKeys = (rows: Array<{ id: number; npcId: number; name: string }>) =>
  rows.map((row) => ({ id: row.id, key: npcKey(row) }));

export const resolveItemSnapshotIds = (
  database: SnapshotDatabase,
  items: readonly ItemSnapshotInput[],
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
                eq(itemSnapshotTable.statsHash, item.statsHash),
              ),
            ),
          ),
        )
        .pipe(Effect.map(toItemKeys)),
    insert: (missing) =>
      database
        .insert(itemSnapshotTable)
        .values(
          missing.map((item) => ({
            itemId: item.itemId,
            statsHash: item.statsHash,
            name: item.name,
            icon: item.icon,
            lvl: item.lvl,
            rarity: item.rarity,
            itemType: item.itemType,
            statRaw: item.statRaw,
            statsSnapshot: item.statsSnapshot,
          })),
        )
        .onConflictDoNothing({
          target: [itemSnapshotTable.itemId, itemSnapshotTable.statsHash],
        })
        .returning(itemSnapshotColumns)
        .pipe(Effect.map(toItemKeys)),
    failure: "Failed to resolve item snapshot",
  });

export const resolveNpcSnapshotIds = (
  database: SnapshotDatabase,
  npcs: readonly NpcSnapshotInput[],
) =>
  resolveSnapshotIds(npcs, {
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
                eq(npcSnapshotTable.name, npc.name),
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
          target: [npcSnapshotTable.npcId, npcSnapshotTable.name],
        })
        .returning(npcSnapshotColumns)
        .pipe(Effect.map(toNpcKeys)),
    failure: "Failed to resolve NPC snapshot",
  });
