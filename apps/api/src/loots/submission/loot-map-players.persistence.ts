import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { Effect } from "effect";
import type { MapPlayersSnapshot } from "#src/contracts/loots/map-players-snapshot";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  lootMapPlayerTable,
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/schema";
import { resolvePlayerSnapshots } from "#src/shared/margonem/player-snapshot.persistence";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";

export function mapPlayersToSnapshotInputs(
  world: string,
  players: MapPlayersSnapshot,
) {
  const seen = new Set<string>();
  const uniquePlayers = players.filter(({ accountId, characterId }) => {
    const identity = `${accountId}:${characterId}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
  return uniquePlayers.map((player) => ({
    ...player,
    world,
  }));
}

// The caller must keep the locks and the entire capture in one transaction.
export const captureLootMapPlayers = Effect.fnUntraced(function* (
  transaction: Pick<
    typeof ApiDatabase.Service,
    "select" | "selectDistinct" | "insert" | "update"
  >,
  lootId: number,
  guildIds: readonly string[],
  players: MapPlayersSnapshot,
  now: Date,
) {
  if (guildIds.length === 0 || players.length === 0) return [];

  const records = yield* transaction
    .select({
      id: organizationLootRecordTable.id,
      guildId: organizationLootRecordTable.guildId,
    })
    .from(organizationLootRecordTable)
    .where(
      and(
        eq(organizationLootRecordTable.lootId, lootId),
        inArray(organizationLootRecordTable.guildId, [...guildIds]),
        isNull(organizationLootRecordTable.archivedAt),
      ),
    )
    .orderBy(asc(organizationLootRecordTable.id))
    .for("update");
  if (records.length === 0) return [];

  const captured = yield* transaction
    .selectDistinct({ recordId: lootMapPlayerTable.organizationLootRecordId })
    .from(lootMapPlayerTable)
    .where(
      inArray(
        lootMapPlayerTable.organizationLootRecordId,
        records.map(({ id }) => id),
      ),
    );
  const capturedIds = new Set(captured.map(({ recordId }) => recordId));
  const missing = records.filter(({ id }) => !capturedIds.has(id));
  if (missing.length === 0) return [];

  const [loot] = yield* transaction
    .select({ world: lootTable.world })
    .from(lootTable)
    .where(eq(lootTable.id, lootId));
  if (!loot)
    return yield* Effect.fail(
      new DependencyUnavailableError("Failed to resolve loot world"),
    );

  const snapshots = yield* resolvePlayerSnapshots(
    transaction,
    mapPlayersToSnapshotInputs(loot.world, players),
  );
  yield* transaction.insert(lootMapPlayerTable).values(
    missing.flatMap(({ id }) =>
      snapshots.map((snapshot) => ({
        organizationLootRecordId: id,
        playerSnapshotId: snapshot.id,
      })),
    ),
  );
  yield* transaction
    .update(organizationLootRecordTable)
    .set({ updatedAt: now })
    .where(
      inArray(
        organizationLootRecordTable.id,
        missing.map(({ id }) => id),
      ),
    );
  return missing.map(({ guildId }) => guildId);
});
