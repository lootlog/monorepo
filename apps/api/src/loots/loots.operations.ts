import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import { getLootListCacheScope } from "#src/shared/cache";
import { buildLootVisibilityCacheScope } from "#src/loots/loot-visibility-cache";
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
import { type RedisService } from "#src/redis/redis.service";
import { randomInt } from "node:crypto";
import {
  InvalidRequestError,
  PermissionDeniedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { buildLootDrawEntrants } from "#src/loots/loot-draw-entrants";
import {
  DEFAULT_PAGE_SIZE,
  decodePageCursor,
  toPage,
} from "#src/shared/keyset-page";
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
import { compareNpcsStrongestFirst } from "@lootlog/domain/npc-type";
import {
  LootDrawOutcome,
  type LootDrawResolvedNotificationEvent,
} from "@lootlog/schema/notifications";
import type { LootPersistence } from "#src/loots/loot.repository";
import type {
  LootListParams,
  LootNpcNameSummary,
  LootQueryOperations,
} from "#src/loots/query/loot-query.operations";
import type { LootQueryFilters } from "#src/loots/query/loot-query-filter";

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

type LootPage = {
  readonly items: LootQueryResult[];
  readonly nextCursor: string | null;
};

type LootsFailure =
  | InvalidRequestError
  | PermissionDeniedError
  | ResourceConflictError
  | OperationError
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
  readonly redis: Pick<RedisService, "invalidateScopes" | "getOrSetJson">;
  /** Hands a run or voided draw to the Organization's notification rules. */
  readonly publishDrawResolved: (
    event: LootDrawResolvedNotificationEvent,
  ) => Effect.Effect<void, unknown>;
}

/** What a draw's notification shows, from the loot as its drawer saw it. */
const drawResolvedEvent = (
  guildId: string,
  loot: LootQueryResult,
  draw: LootDrawResponse,
  outcome: LootDrawOutcome,
): LootDrawResolvedNotificationEvent | null => {
  const item = loot.items.find(({ hid }) => hid === draw.itemHid);

  if (!item) return null;

  const [npc] = loot.npcs.toSorted((left, right) =>
    compareNpcsStrongestFirst(
      { ...left, npcId: left.id },
      { ...right, npcId: right.id },
    ),
  );

  return {
    guildId,
    world: loot.world,
    lootId: loot.id,
    outcome,
    item: { hid: item.hid, name: item.name, icon: item.icon, lvl: item.lvl },
    npcName: npc?.name ?? null,
    draw: {
      id: draw.id,
      entrants: draw.entrants.map(({ name, prof, lvl, tickets }) => ({
        name,
        prof,
        lvl,
        tickets,
      })),
      winnerIndex: draw.winnerIndex,
      drawnBy: draw.createdBy.name,
      voided: draw.voided && {
        by: draw.voided.by.name,
        reason: draw.voided.reason,
      },
    },
  };
};

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
    standingDraws: [...loot.standingDraws],
  })),
});

export const makeLootsOperations = ({
  persistence,
  query,
  redis,
  publishDrawResolved,
}: LootsDependencies): LootsOperations => {
  const pendingDetails = new Map<string, FetchedLootRead>();

  const invalidateList = (guildIds: ReadonlyArray<string>) =>
    Effect.forEach(
      [...new Set(guildIds)],
      (guildId) =>
        redis.invalidateScopes(getLootListCacheScope(guildId)).pipe(
          Effect.mapError(
            (cause) =>
              new OperationError({
                operation: "loots.cache.invalidateList",
                cause,
              }),
          ),
          withAdapterSpan("loots.cache.invalidateList", "loots"),
          Effect.catch((error) =>
            Effect.logWarning("Failed to invalidate loots list cache", {
              error,
              guildId,
            }),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );

  // The draw is committed: a lost announcement must not fail the request.
  const announceDraw = (
    guildId: string,
    loot: LootQueryResult,
    draw: LootDrawResponse,
    outcome: LootDrawOutcome,
  ) => {
    const event = drawResolvedEvent(guildId, loot, draw, outcome);

    return event
      ? publishDrawResolved(event).pipe(
          withAdapterSpan("loots.draws.announce", "loots"),
          Effect.catch((error) =>
            Effect.logWarning("Failed to announce a loot draw", {
              error,
              guildId,
              drawId: draw.id,
            }),
          ),
        )
      : Effect.void;
  };

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

        yield* invalidateList([options.guild.id]);
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

        const draw = yield* persistence.createDraw({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          itemHid: options.body.itemHid,
          entrants: built.entrants,
          ticketOrder,
          roll,
          winnerIndex: ticketOrder[roll] ?? 0,
        });

        // The list shows each item's standing winner.
        yield* invalidateList([options.guild.id]);
        yield* announceDraw(
          options.guild.id,
          loot,
          draw,
          LootDrawOutcome.DRAWN,
        );

        return draw;
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

        const draw = yield* persistence.voidDraw({
          discordId: options.discordId,
          guildId: options.guild.id,
          lootId: options.lootId,
          drawId: options.drawId,
          reason: options.body.reason,
        });

        yield* invalidateList([options.guild.id]);
        yield* announceDraw(
          options.guild.id,
          loot,
          draw,
          LootDrawOutcome.VOIDED,
        );

        return draw;
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

        return yield* redis.getOrSetJson({
          key: cacheKey(guild, permissions, roles, filters),
          scopes: [getLootListCacheScope(guild.id)],
          codec: {
            stringify: wireCodec.stringify,
            parse: (text) => normalizeCachedPage(wireCodec.parse(text)),
          },
          ttlSeconds: CACHE_TTL_SECONDS,
          factory: read,
          onError: (error) =>
            Effect.logWarning("Loots list cache unavailable", { error }),
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
