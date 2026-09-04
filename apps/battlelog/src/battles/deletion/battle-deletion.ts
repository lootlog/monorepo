import { asc, eq, lte } from "drizzle-orm";
import { Clock, Effect } from "effect";
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
  database: DrizzleDatabase,
  objects: Pick<BattleObjectStorage, "deleteBattleData">,
  analytics: Pick<BattleAnalytics, "invalidateAnalyticsCache">,
) => {
  const drain = Effect.gen(function* () {
    const now = new Date(yield* Clock.currentTimeMillis);
    const pending = yield* database
      .select()
      .from(battleObjectDeletions)
      .where(lte(battleObjectDeletions.retryAt, now))
      .orderBy(asc(battleObjectDeletions.retryAt))
      .limit(100);
    yield* Effect.forEach(
      pending,
      (item) =>
        Effect.gen(function* () {
          yield* analytics.invalidateAnalyticsCache(item.userId);
          yield* Effect.tryPromise(() =>
            objects.deleteBattleData(item.battleId),
          );
          yield* database
            .delete(battleObjectDeletions)
            .where(eq(battleObjectDeletions.battleId, item.battleId));
        }).pipe(
          Effect.catch((cause) =>
            Effect.gen(function* () {
              yield* database
                .update(battleObjectDeletions)
                .set({
                  retryAt: new Date((yield* Clock.currentTimeMillis) + 60_000),
                })
                .where(eq(battleObjectDeletions.battleId, item.battleId));
              yield* Effect.logWarning(
                "Battle object deletion remains pending",
                cause,
              ).pipe(Effect.annotateLogs({ battleId: item.battleId }));
            }),
          ),
        ),
      { concurrency: 4, discard: true },
    );
  }).pipe(Effect.withSpan("BattleDeletion.drain"));

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
        Effect.catch((cause) =>
          Effect.logWarning("Battle analytics cleanup remains pending", cause),
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
          for (let offset = 0; offset < removed.length; offset += 1_000) {
            yield* transaction
              .insert(battleObjectDeletions)
              .values(removed.slice(offset, offset + 1_000));
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
          Effect.catch((cause) =>
            Effect.logWarning(
              "Battle analytics cleanup remains pending",
              cause,
            ),
          ),
        );
      return { deletedCount: removed.length };
    },
  );

  return { deleteBattle, deleteUserBattles, drain };
};
