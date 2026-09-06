import { and, asc, eq, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { playerSnapshotTable } from "#src/database/drizzle/schema";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";

type PlayerSnapshot = typeof playerSnapshotTable.$inferSelect;
export type PlayerSnapshotInput = Pick<
  PlayerSnapshot,
  | "world"
  | "accountId"
  | "characterId"
  | "snapshotHash"
  | "name"
  | "prof"
  | "icon"
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

const identityKey = (snapshot: PlayerSnapshotInput): string =>
  JSON.stringify([
    snapshot.world,
    snapshot.accountId,
    snapshot.characterId,
    snapshot.snapshotHash,
  ]);

const matchesIdentity = (snapshot: PlayerSnapshotInput) =>
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
  const byIdentity = new Map<string, PlayerSnapshot>();
  if (missing.length > 0) {
    const inserts = [
      ...new Map(
        missing.map((snapshot) => [identityKey(snapshot), snapshot]),
      ).values(),
    ].sort((left, right) =>
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
    for (const snapshot of inserted) {
      byIdentity.set(identityKey(snapshot), snapshot);
      byContent.set(contentKey(snapshot), snapshot);
    }
    const conflicts = inserts.filter(
      (snapshot) => !byIdentity.has(identityKey(snapshot)),
    );
    if (conflicts.length > 0) {
      const concurrent = yield* database
        .select()
        .from(playerSnapshotTable)
        .where(or(...conflicts.map(matchesIdentity)));
      for (const snapshot of concurrent) {
        byIdentity.set(identityKey(snapshot), snapshot);
        byContent.set(contentKey(snapshot), snapshot);
      }
    }
  }
  const resolved: PlayerSnapshot[] = [];
  for (const input of snapshots) {
    const snapshot =
      byContent.get(contentKey(input)) ?? byIdentity.get(identityKey(input));
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
