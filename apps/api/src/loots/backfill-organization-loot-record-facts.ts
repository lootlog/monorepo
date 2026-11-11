import { BunRuntime } from "@effect/platform-bun";
import { and, between, eq, isNull, max, min, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  lootTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";

/**
 * Fills `lootWorld` and `lootCreatedAt` on the organization loot records that
 * existed before the columns did. Both are immutable facts of the loot, so a
 * filled row never needs revisiting and the `lootWorld IS NULL` guard makes a
 * re-run resume where the last one stopped.
 *
 * The work is windowed by `lootId` rather than by row count: the
 * `OrganizationLootRecord_lootId_idx` range scan gives each window a bounded,
 * contiguous slice instead of scattering writes across the table.
 * Each window is its own transaction, so this can be interrupted at any point
 * and nothing is left half-written.
 */
const WINDOW = 50_000;

// The same condition the NOT NULL migration validates.
const missingFacts = or(
  isNull(organizationLootRecordTable.lootWorld),
  isNull(organizationLootRecordTable.lootCreatedAt),
);

export const backfillOrganizationLootRecordFacts = Effect.gen(function* () {
  const database = yield* ApiDatabase;

  const [bounds] = yield* database
    .select({
      lowest: min(organizationLootRecordTable.lootId),
      highest: max(organizationLootRecordTable.lootId),
    })
    .from(organizationLootRecordTable)
    .where(missingFacts);

  if (!bounds?.lowest || !bounds.highest) {
    yield* Effect.logInfo("Organization loot record facts already complete");

    return 0;
  }

  const { lowest, highest } = bounds;

  let updated = 0;

  // Newest first: the loot list reads recent pages, so the pages players
  // actually open get the fast path before the backfill finishes.
  for (let upper = highest; upper >= lowest; upper -= WINDOW) {
    const lower = Math.max(lowest, upper - WINDOW + 1);

    const result = yield* database
      .update(organizationLootRecordTable)
      .set({
        lootWorld: sql`${lootTable.world}`,
        lootCreatedAt: sql`${lootTable.createdAt}`,
      })
      .from(lootTable)
      .where(
        and(
          eq(lootTable.id, organizationLootRecordTable.lootId),
          between(organizationLootRecordTable.lootId, lower, upper),
          missingFacts,
        ),
      );

    updated += result.rowCount ?? 0;

    yield* Effect.logInfo("Organization loot record facts window complete", {
      lower,
      upper,
      updated,
    });
  }

  return updated;
});

if (import.meta.main) {
  BunRuntime.runMain(
    backfillOrganizationLootRecordFacts.pipe(
      Effect.tap((updated) =>
        Effect.logInfo("Organization loot record facts backfilled", {
          updated,
        }),
      ),
      Effect.scoped,
      Effect.provide(ApiDatabaseLive),
    ),
  );
}
