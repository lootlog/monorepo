import { makeUserKillAnalytics } from "./user-kill-analytics.js";
import {
  UserKillCharactersResponse,
  type UserKillAnalyticsQuery,
  type UserKillActivityQuery,
} from "#src/contracts/kills/analytics-schemas";
import {
  decodeNpcKillPageCursor,
  readNpcKillPage,
  toNpcKillPage,
} from "./npc-kill-page.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userKillCharacterTable,
  type userKillBucketTable,
} from "#src/database/drizzle/kill-statistics.schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  USER_TOP_NPCS_DEFAULT_LIMIT,
  UserKillStatsResponse,
  UserNpcKillsResponse,
  type UserKillStatsQuery as GetUserKillStatsDto,
  type UserNpcKillsQuery as GetUserNpcKillsDto,
} from "#src/contracts/kills/schemas";
import { DEFAULT_PAGE_SIZE } from "#src/shared/keyset-page";
import { containsPattern } from "#src/shared/sql-like";

import {
  buildKillQueryCacheKey,
  type KillQueryCache,
} from "./kill-query-support.js";
import {
  currentStatsPeriodStart,
  resolveKillStatsPeriod,
} from "./kill-stats-period.js";
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
      readonly npcLevelMin?: number;
      readonly npcLevelMax?: number;
    },
  ) =>
    and(
      eq(source.discordUserId, userId),
      options.world ? eq(source.world, options.world) : undefined,
      options.npcTypes && options.npcTypes.length > 0
        ? inArray(source.npcType, [...options.npcTypes])
        : undefined,
      options.search
        ? ilike(source.npcName, containsPattern(options.search))
        : undefined,
      options.npcLevelMin !== undefined && options.npcLevelMin > 0
        ? gte(source.npcLvl, options.npcLevelMin)
        : undefined,
      options.npcLevelMax !== undefined && options.npcLevelMax > 0
        ? lte(source.npcLvl, options.npcLevelMax)
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

  const getUserKillStats = (userId: string, query: GetUserKillStatsDto) =>
    Effect.gen(function* () {
      const npcTypes = query.npcType
        ? [query.npcType, ...(query.npcTypes ?? [])]
        : query.npcTypes;

      const period = resolveKillStatsPeriod(query.period);
      const periodStart = yield* currentStatsPeriodStart(period);

      return yield* cached(
        userId,
        buildKillQueryCacheKey("user-overview", userId, {
          query: { ...query, npcTypes, period },
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
                  .slice(0, query.topNpcsLimit ?? USER_TOP_NPCS_DEFAULT_LIMIT),
              };
            }),
          ),
        ),
      );
    });

  const getUserNpcKills = (userId: string, query: GetUserNpcKillsDto) =>
    Effect.gen(function* () {
      const limit = query.limit ?? DEFAULT_PAGE_SIZE;
      const period = resolveKillStatsPeriod(query.period);
      const periodStart = yield* currentStatsPeriodStart(period);
      const { cursor, limit: _limit, ...filters } = { ...query, period };

      return yield* decodeNpcKillPageCursor(cursor, filters).pipe(
        Effect.flatMap((after) =>
          cached(
            userId,
            buildKillQueryCacheKey("user-npcs", userId, {
              filters,
              after,
              limit,
            }),
            "user npc kills",
            UserNpcKillsResponse,
            protect(
              "kills.user-npcs.query",
              Effect.suspend(() => {
                const source = userKillSource(periodStart);

                return readNpcKillPage(
                  database,
                  source,
                  statsCondition(source, userId, query),
                  {
                    limit: limit + 1,
                    after,
                    sortBy: query.sortBy,
                    sortOrder: query.sortOrder,
                  },
                );
              }).pipe(
                Effect.map(({ npcs, total }) => ({
                  ...toNpcKillPage(npcs, limit, filters, query.sortBy),
                  total,
                })),
              ),
            ),
          ),
        ),
      );
    });

  const getUserKillCharacters = (userId: string) =>
    cached(
      userId,
      buildKillQueryCacheKey("user-characters", userId, {}),
      "user kill characters",
      UserKillCharactersResponse,
      protect(
        "kills.user-characters.query",
        database
          .select({
            characterId: userKillCharacterTable.characterId,
            world: userKillCharacterTable.world,
            name: userKillCharacterTable.name,
            level: userKillCharacterTable.level,
            profession: userKillCharacterTable.profession,
            icon: userKillCharacterTable.icon,
            kills: userKillCharacterTable.kills,
            firstKilledAt: userKillCharacterTable.firstKilledAt,
            lastKilledAt: userKillCharacterTable.lastKilledAt,
          })
          .from(userKillCharacterTable)
          .where(eq(userKillCharacterTable.discordUserId, userId))
          .orderBy(
            desc(userKillCharacterTable.lastKilledAt),
            userKillCharacterTable.world,
            userKillCharacterTable.characterId,
          )
          .pipe(
            Effect.map((characters) => ({
              characters: characters.map((character) => ({
                ...character,
                firstKilledAt: character.firstKilledAt.toISOString(),
                lastKilledAt: character.lastKilledAt.toISOString(),
              })),
            })),
          ),
      ),
    );

  const analytics = makeUserKillAnalytics(database, cache);

  return {
    getUserKillStats,
    getUserNpcKills,
    getUserKillCharacters,
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
