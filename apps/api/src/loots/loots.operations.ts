import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { Clock, Effect, Schema } from "effect";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  type CreateCommentDto,
  LootsControllerFetchLootsByGuildId200,
  type LootsControllerFetchLootsByGuildIdQuery as FetchLootsParamsDto,
} from "#src/http-api/contracts/loots/schemas";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";
import { ErrorKey } from "#src/loots/error-key";
import type {
  LootPersistence,
  LootPersistenceError,
} from "#src/loots/loot-persistence";
import type {
  LootQueryError,
  LootQueryOperations,
} from "#src/loots/query/loot-query.operations";
import type { LootStatsService } from "#src/loots/query/loot-stats.service";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type CachedLootQueryResult = Omit<
  LootQueryResult,
  "createdAt" | "updatedAt"
> & {
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
};
type LootCount = Effect.Success<
  ReturnType<LootQueryOperations["countLootsByGuildId"]>
>;
type ResolvedLootItem = Effect.Success<
  ReturnType<LootQueryOperations["resolveLootItemByHid"]>
>;
type FetchedLoot = Effect.Success<
  ReturnType<LootQueryOperations["fetchLootById"]>
>;
type LootComments = Effect.Success<ReturnType<LootPersistence["listComments"]>>;
type LootComment = Effect.Success<ReturnType<LootPersistence["createComment"]>>;

export class LootsOperationError extends TaggedErrorClass<LootsOperationError>()(
  "LootsOperationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type LootsFailure =
  | PermissionDeniedError
  | LootPersistenceError
  | LootQueryError
  | LootsOperationError
  | ResourceNotFoundError;
type LootsEffect<A> = Effect.Effect<A, LootsFailure>;

export interface LootsOperations {
  readonly getComments: (options: {
    readonly guild: Guild;
    readonly lootId: number;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootComments>;
  readonly archiveLoot: (options: {
    readonly discordId: string;
    readonly guild: Guild;
    readonly lootId: number;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<void>;
  readonly createComment: (options: {
    readonly discordId: string;
    readonly guild: Guild;
    readonly lootId: number;
    readonly body: CreateCommentDto;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootComment>;
  readonly fetchLootsByGuildId: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    params: FetchLootsParamsDto,
  ) => LootsEffect<LootQueryResult[]>;
  readonly countLootsByGuildId: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    params: FetchLootsParamsDto,
  ) => LootsEffect<LootCount>;
  readonly fetchLootById: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    lootId: number,
  ) => LootsEffect<FetchedLoot>;
  readonly resolveLootItemByHid: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    options: { readonly hid: string; readonly world?: string },
  ) => LootsEffect<ResolvedLootItem>;
}

interface LootsDependencies {
  readonly persistence: LootPersistence;
  readonly query: LootQueryOperations;
  readonly stats: LootStatsService;
  readonly redis: RedisService;
  readonly logger: ApplicationLogger;
}

const CACHE_TTL_SECONDS = 10;

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
  return JSON.stringify(value) ?? "undefined";
};

const cacheKey = (
  guild: Guild,
  permissions: Permission[],
  roles: Role[],
  params: FetchLootsParamsDto,
) => {
  const visibilityScope = {
    permissions: [...permissions].sort(),
    roles: roles
      .map((role) => ({
        id: role.id,
        lvlRangeFrom: role.lvlRangeFrom,
        lvlRangeTo: role.lvlRangeTo,
        permissions: [...role.permissions].sort(),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  return [
    "loots",
    "list",
    guild.id,
    Buffer.from(
      stableSerialize({ params: { ...params, cursor: 0 }, visibilityScope }),
    ).toString("base64url"),
  ].join(":");
};

const normalizeCachedLoots = (
  loots: CachedLootQueryResult[],
): LootQueryResult[] =>
  loots.map((loot) => ({
    ...loot,
    createdAt:
      loot.createdAt instanceof Date
        ? loot.createdAt
        : new Date(loot.createdAt),
    updatedAt:
      loot.updatedAt instanceof Date
        ? loot.updatedAt
        : new Date(loot.updatedAt),
  }));

export const makeLootsOperations = ({
  persistence,
  query,
  stats,
  redis,
  logger,
}: LootsDependencies): LootsOperations => {
  const attempt = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) =>
        cause instanceof ResourceNotFoundError
          ? cause
          : new LootsOperationError({ operation, cause }),
    }).pipe(
      Effect.withSpan(operation, {
        attributes: { adapter: "loots", retryCount: 0 },
      }),
    );

  const invalidateList = (guildIds: ReadonlyArray<string>) =>
    Effect.forEach(
      [...new Set(guildIds)],
      (guildId) =>
        attempt("loots.cache.invalidateList", () =>
          redis.deleteByPattern(`loots:list:${guildId}:*`),
        ).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              logger.warn("Failed to invalidate loots list cache", {
                error,
                guildId,
              }),
            ),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );

  const visibleLoot = (
    operation: string,
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    lootId: number,
  ) =>
    query.fetchLootById(
      guild,
      getEffectiveCapabilities(accessPolicy),
      roles,
      lootId,
    );

  return {
    getComments: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          "loots.comments.visibility",
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );
        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());
        return yield* persistence.listComments(
          options.guild.id,
          options.lootId,
        );
      }),

    archiveLoot: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          "loots.archive.visibility",
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );
        if (!loot) {
          return yield* Effect.fail(
            new ResourceNotFoundError(ErrorKey.CANT_DELETE_LOOT),
          );
        }
        const archived = yield* persistence.archive({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          archivedAt: new Date(yield* Clock.currentTimeMillis),
        });
        if (!archived) {
          return yield* Effect.fail(
            new ResourceNotFoundError(ErrorKey.CANT_DELETE_LOOT),
          );
        }
        yield* Effect.all(
          [
            invalidateList([options.guild.id]),
            stats.invalidateCache([options.guild.id]),
          ],
          { concurrency: "unbounded", discard: true },
        );
      }),

    createComment: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          "loots.comment.visibility",
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );
        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());
        const comment = yield* persistence.createComment({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          body: options.body,
        });
        yield* invalidateList([options.guild.id]);
        return comment;
      }),

    fetchLootsByGuildId: (guild, accessPolicy, roles, params) => {
      const permissions = getEffectiveCapabilities(accessPolicy);
      const firstPage =
        params.cursor === undefined ||
        params.cursor === null ||
        params.cursor <= 0;
      if (!firstPage) {
        return query.fetchLootsByGuildId(guild, permissions, roles, params);
      }
      const key = cacheKey(guild, permissions, roles, params);
      return Effect.gen(function* () {
        const cached = yield* attempt("loots.query.listCacheRead", () =>
          redis.getJson(
            key,
            makeJsonCodec(LootsControllerFetchLootsByGuildId200),
          ),
        ).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              logger.warn("Loots list cache unavailable", { error });
              return null;
            }),
          ),
        );
        if (cached !== null) return normalizeCachedLoots(cached);
        const result = yield* query.fetchLootsByGuildId(
          guild,
          permissions,
          roles,
          params,
        );
        yield* attempt("loots.query.listCacheWrite", () =>
          redis.setJson(key, result, CACHE_TTL_SECONDS),
        ).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              logger.warn("Loots list cache unavailable", { error }),
            ),
          ),
        );
        return result;
      });
    },

    countLootsByGuildId: (guild, accessPolicy, roles, params) =>
      query.countLootsByGuildId(
        guild,
        getEffectiveCapabilities(accessPolicy),
        roles,
        params,
      ),

    fetchLootById: (guild, accessPolicy, roles, lootId) =>
      visibleLoot("loots.query.byId", guild, accessPolicy, roles, lootId),

    resolveLootItemByHid: (guild, accessPolicy, roles, options) =>
      query.resolveLootItemByHid(
        guild,
        getEffectiveCapabilities(accessPolicy),
        roles,
        options,
      ),
  };
};
