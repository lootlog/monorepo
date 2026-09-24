import { asc, eq, inArray, lte } from "drizzle-orm";
import { Clock, Effect, Result } from "effect";
import { chunk } from "es-toolkit";
import type { DrizzleDatabase } from "#src/database/database";
import {
  battles,
  battleObjectDeletions,
  userCharacters,
} from "#src/database/schema";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { ResourceNotFoundError } from "#src/infrastructure/http-error";

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

  const deleteBattle = Effect.fn("BattleDeletion.deleteBattle")(function* (
    battleId: string,
  ) {
    const userId = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const removed = yield* transaction
          .delete(battles)
          .where(eq(battles.id, battleId))
          .returning({ battleId: battles.id, userId: battles.userId });

        if (removed.length === 0) {
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );
        }

        yield* transaction.insert(battleObjectDeletions).values(removed);

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
          const removed = yield* transaction
            .delete(battles)
            .where(eq(battles.userId, userId))
            .returning({ battleId: battles.id, userId: battles.userId });

          for (const batch of chunk(removed, 1_000)) {
            yield* transaction.insert(battleObjectDeletions).values(batch);
          }

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
