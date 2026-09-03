import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, eq, gte, ilike, inArray, lte, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userKillStatsBucketTable,
  userKillStatsTable,
} from "#src/database/drizzle/schema";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import {
  KillsControllerGetUserKillStats200,
  type KillsControllerGetUserKillStatsQuery as GetUserKillStatsDto,
  KillsControllerGetUserNpcKills200,
  type KillsControllerGetUserNpcKillsQuery as GetUserNpcKillsDto,
} from "#src/http-api/lootlog-api";
import { getKillStatsPeriodStart } from "./utils/kill-stats-period.js";

const CACHE_TTL_SECONDS = 30;
const CACHE_PREFIX = "kill-stats";

export class UserKillQueriesError extends TaggedErrorClass<UserKillQueriesError>()(
  "UserKillQueriesError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface UserKillQueriesCache {
  readonly get: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, unknown>;
  readonly set: <A>(
    key: string,
    value: A,
    ttlSeconds: number,
  ) => Effect.Effect<void, unknown>;
}

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const cacheKey = (
  scope: string,
  userId: string,
  params: Record<string, unknown>,
) =>
  `${CACHE_PREFIX}:${scope}:${userId}:${Buffer.from(stableSerialize(params)).toString("base64url")}`;

type UserStat =
  | typeof userKillStatsTable.$inferSelect
  | typeof userKillStatsBucketTable.$inferSelect;

export const makeUserKillQueries = (
  database: typeof ApiDatabase.Service,
  cache: UserKillQueriesCache,
  logger: ApplicationLogger,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new UserKillQueriesError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "kills.drizzle", retryCount: 0 },
      }),
    );

  const readStats = (
    userId: string,
    options: {
      readonly world?: string;
      readonly npcTypes?: ReadonlyArray<UserStat["npcType"]>;
      readonly search?: string;
      readonly minLvl?: number;
      readonly maxLvl?: number;
      readonly periodStart?: Date;
    },
  ) => {
    const conditions = (
      table: {
        userId: AnyPgColumn;
        world: AnyPgColumn;
        npcType: AnyPgColumn;
        npcName: AnyPgColumn;
        npcLvl: AnyPgColumn;
      },
      periodCondition?: SQL,
    ) =>
      and(
        eq(table.userId, userId),
        options.world ? eq(table.world, options.world) : undefined,
        options.npcTypes && options.npcTypes.length > 0
          ? inArray(table.npcType, [...options.npcTypes])
          : undefined,
        options.search
          ? ilike(table.npcName, `%${options.search}%`)
          : undefined,
        options.minLvl !== undefined && options.minLvl > 0
          ? gte(table.npcLvl, options.minLvl)
          : undefined,
        options.maxLvl !== undefined && options.maxLvl > 0
          ? lte(table.npcLvl, options.maxLvl)
          : undefined,
        periodCondition,
      );

    if (options.periodStart) {
      return database
        .select()
        .from(userKillStatsBucketTable)
        .where(
          conditions(
            userKillStatsBucketTable,
            gte(userKillStatsBucketTable.periodStart, options.periodStart),
          ),
        ) as Effect.Effect<ReadonlyArray<UserStat>, unknown>;
    }

    return database
      .select()
      .from(userKillStatsTable)
      .where(conditions(userKillStatsTable)) as Effect.Effect<
      ReadonlyArray<UserStat>,
      unknown
    >;
  };

  const cached = <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    label: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
  ) =>
    protect(
      `kills.cache.${label}`,
      Effect.gen(function* () {
        const existing = yield* cache.get(key, schema);
        if (existing !== null) {
          logger.log({
            level: "debug",
            message: `Cache hit for ${label}`,
            cacheKey: key,
          });
          return existing;
        }

        logger.log({
          level: "debug",
          message: `Cache miss for ${label}`,
          cacheKey: key,
        });
        const value = yield* load;
        yield* cache.set(key, value, CACHE_TTL_SECONDS);
        return value;
      }),
    );

  const getUserKillStats = (userId: string, query: GetUserKillStatsDto) => {
    const npcTypes = query.npcType
      ? [query.npcType, ...(query.npcTypes ?? [])]
      : query.npcTypes;
    const periodStart = getKillStatsPeriodStart(query.period);

    return cached(
      cacheKey("user-overview", userId, { query: { ...query, npcTypes } }),
      "user kill stats",
      KillsControllerGetUserKillStats200,
      protect(
        "kills.user-overview.query",
        Effect.suspend(() =>
          readStats(userId, { world: query.world, npcTypes, periodStart }),
        ).pipe(
          Effect.map((stats) => {
            const killsByType: Record<string, number> = {};
            const killsByWorld: Record<string, number> = {};
            let totalKills = 0;
            const npcMap = new Map<
              string,
              {
                npcId: number;
                npcName: string;
                npcType: string;
                npcLvl: number;
                npcProf: string | null;
                npcIcon: string | null;
                totalKills: number;
              }
            >();

            for (const stat of stats) {
              killsByType[stat.npcType] =
                (killsByType[stat.npcType] ?? 0) + stat.totalKills;
              killsByWorld[stat.world] =
                (killsByWorld[stat.world] ?? 0) + stat.totalKills;
              totalKills += stat.totalKills;

              const key = `${stat.world}:${stat.npcId}`;
              const existing = npcMap.get(key);
              if (existing) {
                existing.totalKills += stat.totalKills;
              } else {
                npcMap.set(key, {
                  npcId: stat.npcId,
                  npcName: stat.npcName,
                  npcType: stat.npcType,
                  npcLvl: stat.npcLvl,
                  npcProf: stat.npcProf,
                  npcIcon: stat.npcIcon,
                  totalKills: stat.totalKills,
                });
              }
            }

            return {
              overview: { totalKills, killsByType, killsByWorld },
              topNpcs: Array.from(npcMap.values())
                .sort((left, right) => right.totalKills - left.totalKills)
                .slice(0, query.topNpcsLimit ?? 5),
            };
          }),
        ),
      ),
    );
  };

  const getUserNpcKills = (userId: string, query: GetUserNpcKillsDto) => {
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);

    return cached(
      cacheKey("user-npcs", userId, { query }),
      "user npc kills",
      KillsControllerGetUserNpcKills200,
      protect(
        "kills.user-npcs.query",
        Effect.suspend(() =>
          readStats(userId, {
            world: query.world,
            npcTypes: query.npcTypes,
            search: query.search,
            minLvl: query.minLvl,
            maxLvl: query.maxLvl,
            periodStart,
          }),
        ).pipe(
          Effect.map((stats) => {
            const npcMap = new Map<
              number,
              {
                npcId: number;
                npcName: string;
                npcType: string;
                npcLvl: number;
                npcProf: string | null;
                npcIcon: string | null;
                totalKills: number;
              }
            >();

            for (const stat of stats) {
              const existing = npcMap.get(stat.npcId);
              if (existing) {
                existing.totalKills += stat.totalKills;
                if (stat.npcLvl > existing.npcLvl) {
                  existing.npcLvl = stat.npcLvl;
                  existing.npcName = stat.npcName;
                  existing.npcProf = stat.npcProf;
                  existing.npcIcon = stat.npcIcon;
                }
              } else {
                npcMap.set(stat.npcId, {
                  npcId: stat.npcId,
                  npcName: stat.npcName,
                  npcType: stat.npcType,
                  npcLvl: stat.npcLvl,
                  npcProf: stat.npcProf,
                  npcIcon: stat.npcIcon,
                  totalKills: stat.totalKills,
                });
              }
            }

            const sortBy = query.sortBy ?? "kills";
            const sortAscending = query.sortOrder === "asc";
            const allNpcs = Array.from(npcMap.values()).sort((left, right) => {
              const difference =
                sortBy === "level"
                  ? left.npcLvl - right.npcLvl
                  : left.totalKills - right.totalKills;
              return sortAscending ? difference : -difference;
            });
            const total = allNpcs.length;

            return {
              npcs: allNpcs.slice(cursor, cursor + limit),
              pagination: {
                total,
                cursor,
                limit,
                hasNext: cursor + limit < total,
              },
            };
          }),
        ),
      ),
    );
  };

  return { getUserKillStats, getUserNpcKills } as const;
};

export type UserKillQueries = ReturnType<typeof makeUserKillQueries>;
