import {
  PermissionDeniedError,
  ApplicationError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ContextLogger } from "@lootlog/instrumentation";
import { and, eq } from "drizzle-orm";
import { Effect, Predicate } from "effect";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import type { BattleUpdate } from "#src/battles/catalog/update-battle";
import type { PaginationOptions } from "#src/battles/analytics/pagination";
import type { BattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import type { BattlePagination } from "#src/battles/analytics/pagination.service";
import type { DrizzleDatabase } from "#src/database/database";
import { battles } from "#src/database/schema";
import { isBattleId } from "#src/battles/battle-id";

type BattleCatalogDatabase = Pick<DrizzleDatabase, "update"> & {
  query: {
    battles: Pick<DrizzleDatabase["query"]["battles"], "findFirst">;
    battleLegacyIds: Pick<
      DrizzleDatabase["query"]["battleLegacyIds"],
      "findFirst"
    >;
  };
};

const buildPaginationOptions = (query: BattleListQuery): PaginationOptions => {
  return {
    sortOrder: query.sortOrder ?? "desc",
    includeTotal: query.includeTotal ?? false,
    cursor: query.cursor,
    size: query.size,
  };
};

export const makeBattleCatalog = (
  drizzle: BattleCatalogDatabase,
  paginationService: BattlePagination,
  battleListFilterService: BattleListFilter,
) => {
  const logger = new ContextLogger("Battles");

  const getDashboardBattles = (
    query: BattleListQuery,
    requestingUserId: string,
  ) => {
    return Effect.gen(function* () {
      const { userId: _userId, ...filteredQuery } = query;

      const filterBuilder =
        yield* battleListFilterService.buildFilterConditions(
          filteredQuery,
          requestingUserId,
        );

      const paginationOptions = buildPaginationOptions(query);

      const result = yield* paginationService.paginateBattles(
        (table) =>
          and(eq(table.userId, requestingUserId), filterBuilder(table)),
        paginationOptions,
      );

      return {
        battles: result.data,
        pagination: result.pagination,
        meta: {
          performance: result.performance,
        },
      };
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          if (error instanceof ApplicationError) return;

          logger.error("Failed to retrieve dashboard battles:", error);
        }),
      ),
    );
  };

  const resolveBattleId = (battleId: string) => {
    if (isBattleId(battleId)) return Effect.succeed(battleId.toLowerCase());

    return drizzle.query.battleLegacyIds
      .findFirst({
        where: { legacyId: battleId },
        columns: { battleId: true },
      })
      .pipe(
        withAdapterSpan("Battles_resolveLegacyId", "battlelog-infrastructure"),
        Effect.flatMap((legacy) =>
          legacy
            ? Effect.succeed(legacy.battleId)
            : Effect.fail(
                new ResourceNotFoundError(
                  `Battle with ID ${battleId} not found`,
                ),
              ),
        ),
      );
  };

  const checkBattleAccess = (battleId: string, requestingUserId: string) => {
    return drizzle.query.battles
      .findFirst({
        where: { id: battleId },
        columns: { userId: true, public: true },
      })
      .pipe(
        withAdapterSpan("Battles_checkAccess", "battlelog-infrastructure"),
        Effect.flatMap((battle) => {
          if (!battle) {
            return Effect.fail(
              new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
            );
          }

          if (!battle.public && battle.userId !== requestingUserId) {
            return Effect.fail(
              new PermissionDeniedError("Access denied: Battle is private"),
            );
          }

          return Effect.void;
        }),
      );
  };

  const assertBattleOwner = (battleId: string, requestingUserId: string) => {
    return drizzle.query.battles
      .findFirst({
        where: { id: battleId },
        columns: { userId: true },
      })
      .pipe(
        withAdapterSpan("Battles_assertOwner", "battlelog-infrastructure"),
        Effect.flatMap((battle) => {
          if (!battle) {
            return Effect.fail(
              new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
            );
          }

          if (battle.userId !== requestingUserId) {
            return Effect.fail(
              new PermissionDeniedError("You can only modify your own battles"),
            );
          }

          return Effect.void;
        }),
      );
  };

  const getBattleFromDatabase = (
    battleId: string,
    requestingUserId?: string,
  ) => {
    return Effect.gen(function* () {
      if (requestingUserId) {
        yield* checkBattleAccess(battleId, requestingUserId);
      }

      const battle = yield* drizzle.query.battles
        .findFirst({
          where: { id: battleId },
          with: { warriors: true },
        })
        .pipe(
          withAdapterSpan(
            "Battles_getFromDatabase",
            "battlelog-infrastructure",
          ),
        );

      if (!battle)
        return yield* new ResourceNotFoundError(
          `Battle with ID ${battleId} not found`,
        );

      return battle;
    });
  };

  const getPublicBattle = (battleId: string) => {
    return drizzle.query.battles
      .findFirst({
        where: { id: battleId, public: true },
        with: { warriors: true },
      })
      .pipe(
        withAdapterSpan("Battles_getPublic", "battlelog-infrastructure"),
        Effect.filterOrFail(
          Predicate.isNotNullish,
          () =>
            new ResourceNotFoundError(
              `Public battle with ID ${battleId} not found`,
            ),
        ),
      );
  };

  const updateBattle = (battleId: string, updateData: BattleUpdate) => {
    return Effect.gen(function* () {
      const updated = yield* drizzle
        .update(battles)
        .set({
          public: updateData.public,
          updatedAt: new Date(),
        })
        .where(eq(battles.id, battleId))
        .returning()
        .pipe(withAdapterSpan("Battles_update", "battlelog-infrastructure"));

      if (updated.length === 0)
        return yield* new ResourceNotFoundError(
          `Battle with ID ${battleId} not found`,
        );

      const battle = yield* drizzle.query.battles
        .findFirst({
          where: { id: battleId },
          with: { warriors: true },
        })
        .pipe(
          withAdapterSpan("Battles_findUpdated", "battlelog-infrastructure"),
        );

      if (!battle)
        return yield* new ResourceNotFoundError(
          `Battle with ID ${battleId} not found`,
        );

      return battle;
    });
  };

  return {
    assertBattleOwner,
    checkBattleAccess,
    getBattleFromDatabase,
    getDashboardBattles,
    getPublicBattle,
    resolveBattleId,
    updateBattle,
  };
};

export type BattleCatalog = ReturnType<typeof makeBattleCatalog>;
