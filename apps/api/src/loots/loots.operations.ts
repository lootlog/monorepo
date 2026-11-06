import { getLootListCacheScope } from "#src/shared/cache";
import { buildLootVisibilityCacheScope } from "#src/loots/loot-visibility-cache";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import { Clock, Effect, Schema } from "effect";
import type {
  guildTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { randomInt } from "node:crypto";
import {
  InvalidRequestError,
  PermissionDeniedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { buildLootDrawEntrants } from "#src/loots/loot-draw-entrants";
import {
  DEFAULT_PAGE_SIZE,
  decodePageCursor,
  toPage,
} from "#src/shared/keyset-page";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  type CreateLootCommentRequest,
  type CreateLootDrawRequest,
  type LootDrawResponse,
  type LootsQuery,
  type VoidLootDrawRequest,
  LootListResponse,
} from "#src/contracts/loots/schemas";
import { PositiveSafeInteger } from "@lootlog/schema/http-scalars";

import type { LootQueryResult } from "#src/loots/query/loot-query-result";
import { ErrorKey } from "#src/loots/error-key";
import type {
  LootPersistence,
  LootPersistenceError,
} from "#src/loots/loot-persistence";
import type {
  LootListParams,
  LootNpcNameSummary,
  LootQueryError,
  LootQueryOperations,
} from "#src/loots/query/loot-query.operations";
import type { LootQueryFilters } from "#src/loots/query/loot-query-filter";
import type { LootStatsService } from "#src/loots/query/loot-stats.service";

type Guild = typeof guildTable.$inferSelect;

type Role = typeof roleTable.$inferSelect;

type ResolvedLootItem = Effect.Success<
  ReturnType<LootQueryOperations["resolveLootItemByHid"]>
>;

type FetchedLootRead = ReturnType<LootQueryOperations["fetchLootById"]>;

type FetchedLoot = Effect.Success<FetchedLootRead>;

type LootComments = Effect.Success<ReturnType<LootPersistence["listComments"]>>;

type LootComment = Effect.Success<ReturnType<LootPersistence["createComment"]>>;

type LootLikes = NonNullable<
  Effect.Success<ReturnType<LootPersistence["setLike"]>>
>;

class LootsOperationError extends TaggedErrorClass<LootsOperationError>()(
  "LootsOperationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

type LootPage = {
  readonly items: LootQueryResult[];
  readonly nextCursor: string | null;
};

type LootsFailure =
  | InvalidRequestError
  | PermissionDeniedError
  | ResourceConflictError
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
    readonly body: CreateLootCommentRequest;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootComment>;
  readonly getDraws: (options: {
    readonly guild: Guild;
    readonly lootId: number;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<ReadonlyArray<LootDrawResponse>>;
  readonly createDraw: (options: {
    readonly discordId: string;
    readonly guild: Guild;
    readonly lootId: number;
    readonly body: CreateLootDrawRequest;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootDrawResponse>;
  readonly voidDraw: (options: {
    readonly discordId: string;
    readonly guild: Guild;
    readonly lootId: number;
    readonly drawId: number;
    readonly body: VoidLootDrawRequest;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootDrawResponse>;
  readonly setLike: (options: {
    readonly discordId: string;
    readonly guild: Guild;
    readonly lootId: number;
    readonly liked: boolean;
    readonly accessPolicy: AccessPolicy;
    readonly roles: Role[];
  }) => LootsEffect<LootLikes>;
  readonly fetchLootsByGuildId: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    params: LootsQuery,
  ) => LootsEffect<LootPage>;
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
  readonly summarizeLootsByNpcName: (
    guild: Guild,
    accessPolicy: AccessPolicy,
    roles: Role[],
    filters: LootQueryFilters,
  ) => LootsEffect<LootNpcNameSummary>;
}

interface LootsDependencies {
  readonly persistence: LootPersistence;
  readonly query: LootQueryOperations;
  readonly stats: Pick<LootStatsService, "invalidateCache">;
  readonly redis: Pick<RedisService, "invalidateScopes" | "getOrSetJsonEffect">;
  readonly logger: ApplicationLogger;
}

const CACHE_TTL_SECONDS = 10;

const MAX_PENDING_DETAIL_READS = 1_024;

/**
 * Keyset of the loot list, newest first: the last returned loot ID, and a
 * fingerprint of the filters the page was read with, so a cursor replayed
 * with other filters is rejected instead of skipping or repeating rows.
 */
const LootListCursor = Schema.Struct({
  id: PositiveSafeInteger,
  filters: Schema.String,
});

const filtersFingerprint = (filters: Omit<LootListParams, "cursor">) =>
  new Bun.CryptoHasher("sha256")
    .update(stableJsonStringify(filters))
    .digest("base64url")
    .slice(0, 16);

const cacheKey = (
  guild: Guild,
  permissions: Permission[],
  roles: Role[],
  params: Omit<LootListParams, "cursor">,
) => {
  return [
    "loots",
    "list",
    guild.id,
    Buffer.from(
      stableJsonStringify({
        params,
        visibilityScope: buildLootVisibilityCacheScope(permissions, roles),
      }),
    ).toString("base64url"),
  ].join(":");
};

const normalizeCachedPage = (page: typeof LootListResponse.Type): LootPage => ({
  nextCursor: page.nextCursor,
  items: page.items.map((loot) => ({
    ...loot,
    createdAt: new Date(loot.createdAt),
    updatedAt: new Date(loot.updatedAt),
    items: loot.items.map((item) => ({ ...item, prof: [...item.prof] })),
    players: loot.players.map((player) => ({
      ...player,
      id: String(player.id),
    })),
    npcs: [...loot.npcs],
    lootShare: Object.fromEntries(
      Object.entries(loot.lootShare).map(([key, players]) => [
        key,
        [...players],
      ]),
    ),
    submissions: (loot.submissions ?? []).map((submission) => ({
      ...submission,
      member: { ...submission.member },
    })),
    likes: [...loot.likes],
  })),
});

export const makeLootsOperations = ({
  persistence,
  query,
  stats,
  redis,
  logger,
}: LootsDependencies): LootsOperations => {
  const pendingDetails = new Map<string, FetchedLootRead>();

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
          redis.invalidateScopes(getLootListCacheScope(guildId)),
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
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );

        if (!loot) {
          return yield* Effect.fail(
            new ResourceNotFoundError({ code: ErrorKey.CANT_DELETE_LOOT }),
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
            new ResourceNotFoundError({ code: ErrorKey.CANT_DELETE_LOOT }),
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

    getDraws: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );

        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());

        return yield* persistence.listDraws(options.guild.id, options.lootId);
      }),

    createDraw: (options) =>
      Effect.gen(function* () {
        // The entrants come from the loot as the caller may see it, so a
        // draw never reveals players or items outside their visibility.
        const loot = yield* visibleLoot(
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );

        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());

        const built = buildLootDrawEntrants(loot, options.body);

        if ("error" in built) {
          return yield* Effect.fail(
            new InvalidRequestError({ code: built.error }),
          );
        }

        const { ticketOrder } = options.body;
        const roll = yield* Effect.sync(() => randomInt(ticketOrder.length));

        return yield* persistence.createDraw({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          itemHid: options.body.itemHid,
          entrants: built.entrants,
          ticketOrder,
          roll,
          winnerIndex: ticketOrder[roll] ?? 0,
        });
      }),

    voidDraw: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );

        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());

        return yield* persistence.voidDraw({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          drawId: options.drawId,
          reason: options.body.reason,
        });
      }),

    setLike: (options) =>
      Effect.gen(function* () {
        const loot = yield* visibleLoot(
          options.guild,
          options.accessPolicy,
          options.roles,
          options.lootId,
        );

        if (!loot) return yield* Effect.fail(new ResourceNotFoundError());

        const likes = yield* persistence.setLike({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          liked: options.liked,
        });

        if (!likes) return yield* Effect.fail(new ResourceNotFoundError());

        yield* invalidateList([options.guild.id]);

        return likes;
      }),

    fetchLootsByGuildId: (guild, accessPolicy, roles, params) =>
      Effect.gen(function* () {
        const permissions = getEffectiveCapabilities(accessPolicy);
        const { cursor, limit = DEFAULT_PAGE_SIZE, ...rest } = params;
        const filters = { ...rest, limit };
        const fingerprint = filtersFingerprint(filters);

        const after =
          cursor === undefined
            ? undefined
            : yield* decodePageCursor(LootListCursor, cursor);

        if (after && after.filters !== fingerprint) {
          return yield* Effect.fail(
            new InvalidRequestError({ code: "INVALID_CURSOR" }),
          );
        }

        const read = query
          .fetchLootsByGuildId(guild, permissions, roles, {
            ...filters,
            cursor: after?.id,
            limit: limit + 1,
          })
          .pipe(
            Effect.map((loots): LootPage =>
              toPage(loots, limit, LootListCursor, (loot) => ({
                id: loot.id,
                filters: fingerprint,
              })),
            ),
          );

        // Only the first page is cached: it is the one live views reread.
        if (after) return yield* read;

        const wireCodec = makeJsonCodec(LootListResponse);

        return yield* redis.getOrSetJsonEffect({
          key: cacheKey(guild, permissions, roles, filters),
          scopes: [getLootListCacheScope(guild.id)],
          codec: {
            stringify: wireCodec.stringify,
            parse: (text) => normalizeCachedPage(wireCodec.parse(text)),
          },
          ttlSeconds: CACHE_TTL_SECONDS,
          factory: read,
          onError: (error) =>
            logger.warn("Loots list cache unavailable", { error }),
        });
      }),

    fetchLootById: (guild, accessPolicy, roles, lootId) =>
      Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          const permissions = getEffectiveCapabilities(accessPolicy);

          const key = stableJsonStringify({
            guildId: guild.id,
            lootId,
            visibilityScope: buildLootVisibilityCacheScope(permissions, roles),
          });

          const pending = pendingDetails.get(key);

          if (pending) {
            const loot = yield* restore(pending);

            // Another replica may have archived the record after this flight began.
            if (!loot) return null;

            const visible = yield* restore(
              query.isLootVisible(guild, permissions, roles, lootId),
            );

            return visible ? loot : null;
          }

          const read = query.fetchLootById(guild, permissions, roles, lootId);

          // Bound retained flights; completed results are never cached.
          if (pendingDetails.size >= MAX_PENDING_DETAIL_READS)
            return yield* restore(read);

          // Effect.cached starts a new run after every caller abandons the last
          // one, so only the newest run, or no run at all, may release the key.
          let runs = 0;

          const release = (run: number) =>
            Effect.sync(() => {
              if (runs === run) pendingDetails.delete(key);
            });

          // The flight outlives a disconnected initiator while others still wait.
          const shared = yield* Effect.cached(
            Effect.suspend(() => {
              const run = ++runs;

              return read.pipe(Effect.ensuring(release(run)));
            }),
          );

          pendingDetails.set(key, shared);

          return yield* restore(shared).pipe(Effect.ensuring(release(0)));
        }),
      ),

    resolveLootItemByHid: (guild, accessPolicy, roles, options) =>
      query.resolveLootItemByHid(
        guild,
        getEffectiveCapabilities(accessPolicy),
        roles,
        options,
      ),

    summarizeLootsByNpcName: (guild, accessPolicy, roles, filters) =>
      query.summarizeLootsByNpcName(
        guild,
        getEffectiveCapabilities(accessPolicy),
        roles,
        filters,
      ),
  };
};
