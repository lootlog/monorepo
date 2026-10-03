import { makeUserKillAnalytics } from "./user-kill-analytics.js";
import type {
  UserKillAnalyticsQuery,
  UserKillActivityQuery,
} from "#src/contracts/kills/analytics-schemas";
import { readNpcKillPage } from "./npc-kill-page.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import type { userKillBucketTable } from "#src/database/drizzle/schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  UserKillStatsResponse,
  UserNpcKillsResponse,
  type UserKillStatsQuery as GetUserKillStatsDto,
  type UserNpcKillsQuery as GetUserNpcKillsDto,
} from "#src/contracts/kills/schemas";

import {
  buildKillQueryCacheKey,
  type KillQueryCache,
} from "./kill-query-support.js";
import { getKillStatsPeriodStart } from "./kill-stats-period.js";
import { userKillSource, type UserKillSource } from "./kill-source.js";

const CACHE_TTL_SECONDS = 30;

export class UserKillQueriesError extends TaggedErrorClass<UserKillQueriesError>()(
  "UserKillQueriesError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type NpcType = (typeof userKillBucketTable.npcType.enumValues)[number];

export const makeUserKillQueries = (
  database: typeof ApiDatabase.Service,
  cache: KillQueryCache,
  _logger: ApplicationLogger,
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

  const statsCondition = (
    source: UserKillSource,
    userId: string,
    options: {
      readonly world?: string;
      readonly npcTypes?: ReadonlyArray<NpcType>;
      readonly search?: string;
      readonly minLvl?: number;
      readonly maxLvl?: number;
    },
  ) =>
    and(
      eq(source.discordUserId, userId),
      options.world ? eq(source.world, options.world) : undefined,
      options.npcTypes && options.npcTypes.length > 0
        ? inArray(source.npcType, [...options.npcTypes])
        : undefined,
      options.search ? ilike(source.npcName, `%${options.search}%`) : undefined,
      options.minLvl !== undefined && options.minLvl > 0
        ? gte(source.npcLvl, options.minLvl)
        : undefined,
      options.maxLvl !== undefined && options.maxLvl > 0
        ? lte(source.npcLvl, options.maxLvl)
        : undefined,
    );

  /** One row per world and NPC, described by its latest kill. */
  const readStats = (
    userId: string,
    options: Parameters<typeof statsCondition>[2] & {
      readonly periodStart?: Date;
    },
  ) => {
    const source = userKillSource(options.periodStart);

    return database
      .selectDistinctOn([source.world, source.npcId], {
        world: source.world,
        npcId: source.npcId,
        npcName: source.npcName,
        npcType: source.npcType,
        npcLvl: source.npcLvl,
        npcProf: source.npcProf,
        npcIcon: source.npcIcon,
        totalKills:
          sql<number>`sum(${source.kills}) over (partition by ${source.world}, ${source.npcId})`.mapWith(
            Number,
          ),
      })
      .from(source)
      .where(statsCondition(source, userId, options))
      .orderBy(source.world, source.npcId, desc(source.lastKilledAt));
  };

  const cached = <S extends Schema.ConstraintDecoder<unknown>>(
    userId: string,
    key: string,
    label: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
  ) =>
    protect(
      `kills.cache.${label}`,
      cache.getOrSet(key, schema, load, CACHE_TTL_SECONDS, [
        `kill-stats:user:${userId}`,
      ]),
    );

  const getUserKillStats = (userId: string, query: GetUserKillStatsDto) => {
    const npcTypes = query.npcType
      ? [query.npcType, ...(query.npcTypes ?? [])]
      : query.npcTypes;

    const periodStart = getKillStatsPeriodStart(query.period);

    return cached(
      userId,
      buildKillQueryCacheKey("user-overview", userId, {
        query: { ...query, npcTypes },
      }),
      "user kill stats",
      UserKillStatsResponse,
      protect(
        "kills.user-overview.query",
        Effect.suspend(() =>
          readStats(userId, { world: query.world, npcTypes, periodStart }),
        ).pipe(
          Effect.map((stats) => {
            const killsByType: Record<string, number> = {};
            const killsByWorld: Record<string, number> = {};
            let totalKills = 0;

            for (const stat of stats) {
              killsByType[stat.npcType] =
                (killsByType[stat.npcType] ?? 0) + stat.totalKills;
              killsByWorld[stat.world] =
                (killsByWorld[stat.world] ?? 0) + stat.totalKills;
              totalKills += stat.totalKills;
            }

            return {
              overview: { totalKills, killsByType, killsByWorld },
              topNpcs: stats
                .map(({ world: _world, ...npc }) => npc)
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
      userId,
      buildKillQueryCacheKey("user-npcs", userId, { query }),
      "user npc kills",
      UserNpcKillsResponse,
      protect(
        "kills.user-npcs.query",
        Effect.suspend(() => {
          const source = userKillSource(periodStart);

          return readNpcKillPage(
            database,
            source,
            statsCondition(source, userId, {
              world: query.world,
              npcTypes: query.npcTypes,
              search: query.search,
              minLvl: query.minLvl,
              maxLvl: query.maxLvl,
            }),
            { limit, cursor, sortBy: query.sortBy, sortOrder: query.sortOrder },
          );
        }).pipe(
          Effect.map(({ npcs, total }) => ({
            npcs,
            pagination: {
              total,
              cursor,
              limit,
              hasNext: cursor + limit < total,
            },
          })),
        ),
      ),
    );
  };

  const analytics = makeUserKillAnalytics(database, cache);

  return {
    getUserKillStats,
    getUserNpcKills,
    getUserKillAnalytics: (userId: string, query: UserKillAnalyticsQuery) =>
      protect(
        "kills.user-analytics",
        analytics.getUserKillAnalytics(userId, query),
      ),
    getUserKillActivity: (userId: string, query: UserKillActivityQuery) =>
      protect(
        "kills.user-activity",
        analytics.getUserKillActivity(userId, query),
      ),
  } as const;
};

export type UserKillQueries = ReturnType<typeof makeUserKillQueries>;
