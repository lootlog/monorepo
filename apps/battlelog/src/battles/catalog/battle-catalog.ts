import {
  PermissionDeniedError,
  ApplicationError,
  ResourceNotFoundError,
} from "#src/infrastructure/http-error";
import { adapter } from "#src/infrastructure/infrastructure-adapter";
import { ContextLogger } from "@lootlog/instrumentation";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
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

/** Lists, finds and updates stored battles, and decides who may see or change one. */
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
      Effect.mapError((error) => {
        if (error instanceof ApplicationError) return error;

        logger.error("Failed to retrieve dashboard battles:", error);

        return new Error(
          `Failed to retrieve dashboard battles: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }),
    );
  };

  /** Accepts a battle ID or an ID from before UUIDv7 IDs, which old links use. */
  const resolveBattleId = (battleId: string) => {
    if (isBattleId(battleId)) return Effect.succeed(battleId.toLowerCase());

    return adapter("Battles_resolveLegacyId", () =>
      drizzle.query.battleLegacyIds.findFirst({
        where: { legacyId: battleId },
        columns: { battleId: true },
      }),
    ).pipe(
      Effect.flatMap((legacy) =>
        legacy
          ? Effect.succeed(legacy.battleId)
          : Effect.fail(
              new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
            ),
      ),
    );
  };

  const checkBattleAccess = (battleId: string, requestingUserId: string) => {
    return adapter("Battles_checkAccess", () =>
      drizzle.query.battles.findFirst({
        where: { id: battleId },
        columns: { userId: true, public: true },
      }),
    ).pipe(
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
    return adapter("Battles_assertOwner", () =>
      drizzle.query.battles.findFirst({
        where: { id: battleId },
        columns: { userId: true },
      }),
    ).pipe(
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

      const battle = yield* adapter("Battles_getFromDatabase", () =>
        drizzle.query.battles.findFirst({
          where: { id: battleId },
          with: { warriors: true },
        }),
      );

      if (!battle)
        return yield* Effect.fail(
          new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
        );

      return battle;
    });
  };

  const getPublicBattle = (battleId: string) => {
    return adapter("Battles_getPublic", () =>
      drizzle.query.battles.findFirst({
        where: { id: battleId, public: true },
        with: { warriors: true },
      }),
    ).pipe(
      Effect.flatMap((battle) => {
        if (!battle) {
          return Effect.fail(
            new ResourceNotFoundError(
              `Public battle with ID ${battleId} not found`,
            ),
          );
        }

        return Effect.succeed(battle);
      }),
    );
  };

  const updateBattle = (battleId: string, updateData: BattleUpdate) => {
    return Effect.gen(function* () {
      const updated = yield* adapter("Battles_update", () =>
        drizzle
          .update(battles)
          .set({
            public: updateData.public,
            updatedAt: new Date(),
          })
          .where(eq(battles.id, battleId))
          .returning(),
      );

      if (updated.length === 0)
        return yield* Effect.fail(
          new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
        );

      const battle = yield* adapter("Battles_findUpdated", () =>
        drizzle.query.battles.findFirst({
          where: { id: battleId },
          with: { warriors: true },
        }),
      );

      if (!battle)
        return yield* Effect.fail(
          new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
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
