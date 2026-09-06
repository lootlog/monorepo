import { createHash } from "node:crypto";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { playerSnapshotTable } from "#src/database/drizzle/schema";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";

type PlayerSnapshot = typeof playerSnapshotTable.$inferSelect;
export type PlayerSnapshotInput = Pick<
  PlayerSnapshot,
  "world" | "accountId" | "characterId" | "name" | "prof" | "icon"
>;

const contentKey = (snapshot: PlayerSnapshotInput): string =>
  JSON.stringify([
    snapshot.world,
    snapshot.accountId,
    snapshot.characterId,
    snapshot.name,
    snapshot.prof,
    snapshot.icon,
  ]);

const identityKey = (
  snapshot: PlayerSnapshotInput & { snapshotHash: string },
): string =>
  JSON.stringify([
    snapshot.world,
    snapshot.accountId,
    snapshot.characterId,
    snapshot.snapshotHash,
  ]);

const matchesIdentity = (
  snapshot: PlayerSnapshotInput & { snapshotHash: string },
) =>
  and(
    eq(playerSnapshotTable.world, snapshot.world),
    eq(playerSnapshotTable.accountId, snapshot.accountId),
    eq(playerSnapshotTable.characterId, snapshot.characterId),
    eq(playerSnapshotTable.snapshotHash, snapshot.snapshotHash),
  );

export const resolvePlayerSnapshots = Effect.fnUntraced(function* (
  database: Pick<typeof ApiDatabase.Service, "insert" | "select">,
  snapshots: readonly PlayerSnapshotInput[],
) {
  if (snapshots.length === 0) return [];
  const unique = [
    ...new Map(
      snapshots.map((snapshot) => [contentKey(snapshot), snapshot]),
    ).values(),
  ];
  // Older writers used different hash inputs for the same stored character data.
  const existing = yield* database
    .select()
    .from(playerSnapshotTable)
    .where(
      or(
        ...unique.map((snapshot) =>
          and(
            eq(playerSnapshotTable.world, snapshot.world),
            eq(playerSnapshotTable.accountId, snapshot.accountId),
            eq(playerSnapshotTable.characterId, snapshot.characterId),
            eq(playerSnapshotTable.name, snapshot.name),
            snapshot.prof === null
              ? isNull(playerSnapshotTable.prof)
              : eq(playerSnapshotTable.prof, snapshot.prof),
            snapshot.icon === null
              ? isNull(playerSnapshotTable.icon)
              : eq(playerSnapshotTable.icon, snapshot.icon),
          ),
        ),
      ),
    )
    .orderBy(asc(playerSnapshotTable.id));
  const byContent = new Map<string, PlayerSnapshot>();
  for (const snapshot of existing) {
    const key = contentKey(snapshot);
    if (!byContent.has(key)) byContent.set(key, snapshot);
  }
  const missing = unique.filter(
    (snapshot) => !byContent.has(contentKey(snapshot)),
  );
  if (missing.length > 0) {
    // Versioned structured hashes cannot collide with legacy concatenated fields.
    // Keep one ordered insert batch so overlapping callers acquire keys consistently.
    const inserts = missing
      .map((snapshot) => ({
        ...snapshot,
        snapshotHash: `v2:${createHash("sha256")
          .update(JSON.stringify([snapshot.name, snapshot.prof, snapshot.icon]))
          .digest("hex")}`,
      }))
      .sort((left, right) =>
        identityKey(left).localeCompare(identityKey(right)),
      );
    const inserted = yield* database
      .insert(playerSnapshotTable)
      .values(inserts)
      .onConflictDoNothing({
        target: [
          playerSnapshotTable.world,
          playerSnapshotTable.accountId,
          playerSnapshotTable.characterId,
          playerSnapshotTable.snapshotHash,
        ],
      })
      .returning();
    const insertedIdentities = new Set(inserted.map(identityKey));
    for (const snapshot of inserted) {
      byContent.set(contentKey(snapshot), snapshot);
    }
    const conflicts = inserts.filter(
      (snapshot) => !insertedIdentities.has(identityKey(snapshot)),
    );
    if (conflicts.length > 0) {
      const concurrent = yield* database
        .select()
        .from(playerSnapshotTable)
        .where(or(...conflicts.map(matchesIdentity)));
      for (const snapshot of concurrent) {
        byContent.set(contentKey(snapshot), snapshot);
      }
    }
  }
  const resolved: PlayerSnapshot[] = [];
  for (const input of snapshots) {
    const snapshot = byContent.get(contentKey(input));
    if (
      !snapshot ||
      snapshot.name !== input.name ||
      snapshot.prof !== input.prof ||
      (snapshot.icon ?? "") !== (input.icon ?? "")
    ) {
      return yield* Effect.fail(
        new DependencyUnavailableError("Failed to resolve player snapshot"),
      );
    }
    resolved.push(snapshot);
  }
  return resolved;
});
