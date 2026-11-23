import { and, eq, inArray, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { DrizzleDatabase } from "#src/database/database";
import {
  battleLegacyIds,
  battles,
  battleSubmissions,
  battleTimelines,
  battleWarriorFilters,
  battleWarriors,
  userCharacters,
  weaponKills,
} from "#src/database/schema";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";

type DeletionTransaction = Parameters<
  Parameters<DrizzleDatabase["transaction"]>[0]
>[0];

export const makeBattleDeletion = (
  database: Pick<DrizzleDatabase, "select" | "delete" | "transaction">,
  analytics: Pick<BattleAnalytics, "invalidateAnalyticsCache">,
) => {
  const removeBattles = (
    transaction: DeletionTransaction,
    owner: { userId: string; battleId?: string },
  ) =>
    Effect.gen(function* () {
      const owned = (table: { userId: AnyPgColumn }, battleId: AnyPgColumn) =>
        and(
          eq(table.userId, owner.userId),
          owner.battleId ? eq(battleId, owner.battleId) : undefined,
        );

      yield* transaction.execute(
        sql`SELECT set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true)`,
      );

      const removed = yield* transaction
        .delete(battles)
        .where(owned(battles, battles.id))
        .returning({ battleId: battles.id, userId: battles.userId });

      for (const batch of chunk(removed, 1_000)) {
        const battleIds = batch.map((row) => row.battleId);

        yield* transaction
          .delete(battleWarriors)
          .where(inArray(battleWarriors.battleId, battleIds));
        yield* transaction
          .delete(battleLegacyIds)
          .where(inArray(battleLegacyIds.battleId, battleIds));
      }

      yield* transaction
        .delete(battleWarriorFilters)
        .where(owned(battleWarriorFilters, battleWarriorFilters.battleId));
      yield* transaction
        .delete(battleTimelines)
        .where(owned(battleTimelines, battleTimelines.battleId));
      yield* transaction
        .delete(battleSubmissions)
        .where(owned(battleSubmissions, battleSubmissions.battleId));

      return removed;
    });

  const deleteBattle = Effect.fn("BattleDeletion.deleteBattle")(function* (
    battleId: string,
  ) {
    const userId = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const [battle] = yield* transaction
          .select({ userId: battles.userId })
          .from(battles)
          .where(eq(battles.id, battleId));

        const removed = battle
          ? yield* removeBattles(transaction, {
              userId: battle.userId,
              battleId,
            })
          : [];

        const [removedBattle] = removed;

        if (!removedBattle) {
          return yield* new ResourceNotFoundError(
            `Battle with ID ${battleId} not found`,
          );
        }

        return removedBattle.userId;
      }),
    );

    yield* analytics.invalidateAnalyticsCache(userId);

    return { message: "Battle deleted successfully" };
  });

  const deleteUserBattles = Effect.fn("BattleDeletion.deleteUserBattles")(
    function* (userId: string) {
      const removed = yield* database.transaction((transaction) =>
        Effect.gen(function* () {
          const removed = yield* removeBattles(transaction, { userId });

          yield* transaction
            .delete(userCharacters)
            .where(eq(userCharacters.userId, userId));

          yield* transaction
            .delete(weaponKills)
            .where(eq(weaponKills.userId, userId));

          return removed;
        }),
      );

      yield* analytics.invalidateAnalyticsCache(userId);

      return { deletedCount: removed.length };
    },
  );

  return { deleteBattle, deleteUserBattles };
};
