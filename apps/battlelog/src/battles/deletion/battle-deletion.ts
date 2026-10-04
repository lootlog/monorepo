import { asc, eq, inArray, lte, type SQL } from "drizzle-orm";
import { Clock, Effect, Result } from "effect";
import { chunk } from "es-toolkit";
import type { DrizzleDatabase } from "#src/database/database";
import {
  battleLegacyIds,
  battles,
  battleObjectDeletions,
  userCharacters,
} from "#src/database/schema";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { ResourceNotFoundError } from "#src/infrastructure/http-error";

type DeletionTransaction = Parameters<
  Parameters<DrizzleDatabase["transaction"]>[0]
>[0];

/** SQL removal and its object cleanup intent commit together; retries need no battle row. */
export const makeBattleDeletion = (
  database: Pick<
    DrizzleDatabase,
    "select" | "delete" | "update" | "transaction"
  >,
  objects: Pick<BattleObjectStorage, "deleteBattlesData">,
  analytics: Pick<BattleAnalytics, "invalidateAnalyticsCache">,
) => {
  const drain = database
    .transaction((transaction) =>
      Effect.gen(function* () {
        const now = new Date(yield* Clock.currentTimeMillis);

        const pending = yield* transaction
          .select()
          .from(battleObjectDeletions)
          .where(lte(battleObjectDeletions.retryAt, now))
          .orderBy(asc(battleObjectDeletions.retryAt))
          .limit(1_000)
          .for("update", { skipLocked: true });

        if (pending.length === 0) return;

        const ids = pending.map((item) => item.battleId);

        for (const userId of new Set(pending.map((item) => item.userId))) {
          yield* analytics.invalidateAnalyticsCache(userId);
        }

        const deleted = yield* Effect.result(
          Effect.tryPromise(() => objects.deleteBattlesData(ids)),
        );

        const retry = Result.isFailure(deleted) ? ids : deleted.success;

        if (Result.isFailure(deleted)) {
          yield* Effect.logWarning(
            "Battle object deletion remains pending",
            deleted.failure,
          );
        } else {
          const failed = new Set(retry);
          const completed = ids.filter((id) => !failed.has(id));

          if (completed.length > 0) {
            yield* transaction
              .delete(battleObjectDeletions)
              .where(inArray(battleObjectDeletions.battleId, completed));
          }
        }

        if (retry.length > 0) {
          yield* transaction
            .update(battleObjectDeletions)
            .set({
              retryAt: new Date((yield* Clock.currentTimeMillis) + 60_000),
            })
            .where(inArray(battleObjectDeletions.battleId, retry));
        }
      }),
    )
    .pipe(Effect.withSpan("BattleDeletion.drain"));

  // Battles saved before UUIDv7 IDs keep their R2 object under the legacy ID.
  // Their legacy rows cascade with the battle, so read them first.
  const removeBattles = (transaction: DeletionTransaction, where: SQL) =>
    Effect.gen(function* () {
      const legacy = yield* transaction
        .select({
          battleId: battleLegacyIds.battleId,
          legacyId: battleLegacyIds.legacyId,
        })
        .from(battleLegacyIds)
        .innerJoin(battles, eq(battles.id, battleLegacyIds.battleId))
        .where(where);

      const legacyIds = new Map(
        legacy.map((row) => [row.battleId, row.legacyId]),
      );

      const removed = yield* transaction
        .delete(battles)
        .where(where)
        .returning({ battleId: battles.id, userId: battles.userId });

      const deletions = removed.map(({ battleId, userId }) => ({
        battleId: legacyIds.get(battleId) ?? battleId,
        userId,
      }));

      for (const batch of chunk(deletions, 1_000)) {
        yield* transaction.insert(battleObjectDeletions).values(batch);
      }

      return removed;
    });

  const deleteBattle = Effect.fn("BattleDeletion.deleteBattle")(function* (
    battleId: string,
  ) {
    const userId = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const removed = yield* removeBattles(
          transaction,
          eq(battles.id, battleId),
        );

        if (removed.length === 0) {
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );
        }

        return removed[0].userId;
      }),
    );

    yield* analytics
      .invalidateAnalyticsCache(userId)
      .pipe(
        Effect.catch((error) =>
          Effect.logWarning("Battle analytics cleanup remains pending", error),
        ),
      );

    return { message: "Battle deleted successfully" };
  });

  const deleteUserBattles = Effect.fn("BattleDeletion.deleteUserBattles")(
    function* (userId: string) {
      const removed = yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          const removed = yield* removeBattles(
            transaction,
            eq(battles.userId, userId),
          );

          yield* transaction
            .delete(userCharacters)
            .where(eq(userCharacters.userId, userId));

          return removed;
        }),
      );

      yield* analytics
        .invalidateAnalyticsCache(userId)
        .pipe(
          Effect.catch((error) =>
            Effect.logWarning(
              "Battle analytics cleanup remains pending",
              error,
            ),
          ),
        );

      return { deletedCount: removed.length };
    },
  );

  return { deleteBattle, deleteUserBattles, drain };
};
