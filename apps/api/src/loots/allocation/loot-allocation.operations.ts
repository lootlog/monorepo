import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { getLootListCacheScope } from "#src/shared/cache";
import { createHash } from "node:crypto";
import { joinItemStat } from "@lootlog/domain/item-stat";
import { Clock, Effect, Schema } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import type { GuildLootEventNpc } from "@lootlog/schema/loot-events";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  matchLootShareItems,
  matchLootShares,
} from "#src/loots/loot-share-message";
import { ErrorKey } from "#src/loots/error-key";
import {
  ApplicationError,
  InvalidRequestError,
  ResourceConflictError,
  PermissionDeniedError,
  DependencyUnavailableError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type { LootShare } from "#src/loots/loot-response.schema";
import type { LootAllocationPersistence } from "#src/loots/allocation/loot-allocation.repository";

const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

export type LootAllocationCache = Pick<RedisService, "invalidateScopes">;

export interface LootAllocationPublisher {
  readonly publish: (
    event: CanonicalRabbitEvent<
      typeof RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE
    >,
  ) => Effect.Effect<void, unknown>;
}

const parseChatAllocation = (message: string) => {
  const allocation: Record<string, string[]> = {};

  for (const { player, items: itemList } of matchLootShares(message)) {
    const nickname = player.trim();

    for (const { hid } of matchLootShareItems(itemList)) {
      const items = allocation[nickname];

      if (items) items.push(hid);
      else allocation[nickname] = [hid];
    }
  }

  return allocation;
};

const resolveChatAllocation = (
  parsed: Record<string, string[]>,
  players: ReadonlyArray<{ readonly id: string; readonly name: string }>,
  items: ReadonlyArray<{ readonly hid: string }>,
): LootShare => {
  const allocation: LootShare = {};

  for (const [nickname, hids] of Object.entries(parsed)) {
    const playerId = players.find((player) => player.name === nickname)?.id;

    if (!playerId) continue;

    const itemIds = hids.filter((hid) =>
      items.some((item) => item.hid === hid),
    );

    if (itemIds.length > 0) allocation[playerId] = itemIds;
  }

  return allocation;
};

const socketNpcs = (
  npcs: ReadonlyArray<{
    readonly npcSnapshot: {
      readonly lvl: number | null;
      readonly prof: string | null;
      readonly type: NpcType | null;
      readonly wt: number | null;
    };
  }>,
): GuildLootEventNpc[] =>
  npcs.map(({ npcSnapshot }) => ({
    lvl: npcSnapshot.lvl,
    prof: npcSnapshot.prof,
    type: npcSnapshot.type,
    wt: npcSnapshot.wt,
  }));

export const makeLootAllocationOperations = (options: {
  readonly persistence: LootAllocationPersistence;
  readonly cache: LootAllocationCache;
  readonly publisher: LootAllocationPublisher;
}) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) =>
        Schema.is(ApplicationError)(cause)
          ? cause
          : new OperationError({ operation, cause }),
      ),
      withAdapterSpan(operation, "loot-allocation"),
    );

  const assertMatching = <Persisted>(
    lootId: number,
    persisted: Persisted,
    submitted: LootShare,
  ) => {
    const persistedValue = stableJsonStringify(persisted);
    const submittedValue = stableJsonStringify(submitted);

    if (persistedValue === submittedValue) return Effect.void;

    return Effect.logWarning("Conflicting chat loot share rejected", {
      lootId,
      persistedHash: createHash("sha256").update(persistedValue).digest("hex"),
      submittedHash: createHash("sha256").update(submittedValue).digest("hex"),
    }).pipe(
      Effect.andThen(
        Effect.fail(new ResourceConflictError("Conflicting loot share")),
      ),
    );
  };

  const deniedOrHidden = (input: {
    readonly actorDiscordId: string;
    readonly lootId: number;
  }) =>
    options.persistence
      .isLootVisible(input)
      .pipe(
        Effect.flatMap((visible) =>
          Effect.fail(
            visible
              ? new PermissionDeniedError({ code: ErrorKey.CANT_UPDATE_LOOT })
              : new ResourceNotFoundError(),
          ),
        ),
      );

  const confirmFromChat = (input: {
    readonly actorDiscordId: string;
    readonly lootId: number;
    readonly message: string;
  }) =>
    protect(
      "loot-allocation.confirm-from-chat",
      Effect.gen(function* () {
        const submissionCutoff = new Date(
          (yield* Clock.currentTimeMillis) - SUBMISSION_WINDOW_MS,
        );

        const authorized = yield* options.persistence.findAuthorizedLoot({
          actorDiscordId: input.actorDiscordId,
          lootId: input.lootId,
          submissionCutoff,
        });

        if (!authorized) return yield* deniedOrHidden(input);

        const parsed = parseChatAllocation(input.message);

        if (Object.keys(parsed).length === 0) {
          return yield* new InvalidRequestError({
            code: ErrorKey.MISSING_LOOT_SHARE,
          });
        }

        const players = authorized.lootPlayers.map(
          ({ lvl, playerSnapshot }) => ({
            id: `${playerSnapshot.characterId}${playerSnapshot.accountId}`,
            name: playerSnapshot.name,
            lvl: lvl ?? 0,
            prof: playerSnapshot.prof,
            icon: playerSnapshot.icon ?? "",
            characterId: String(playerSnapshot.characterId),
            accountId: String(playerSnapshot.accountId),
          }),
        );

        const items = authorized.lootItems.map(
          ({ hid, instanceStat, itemSnapshot }) => ({
            id: String(itemSnapshot.itemId),
            hid,
            name: itemSnapshot.name,
            icon: itemSnapshot.icon,
            stat: joinItemStat(itemSnapshot.statRaw, instanceStat),
            lvl: itemSnapshot.lvl ?? 0,
            rarity: itemSnapshot.rarity,
            prof: [],
            type: itemSnapshot.itemType ?? "",
          }),
        );

        const allocation = resolveChatAllocation(parsed, players, items);

        const sharedItemsCount = new Set(Object.values(allocation).flat()).size;

        if (sharedItemsCount === 0) {
          yield* Effect.logInfo({
            message: "Chat loot share matched no loot items; allocation kept",
            lootId: input.lootId,
            totalItemsCount: items.length,
          });

          return {};
        }

        if (authorized.lootShareSource === LootShareSource.CHAT_MESSAGE) {
          yield* assertMatching(input.lootId, authorized.lootShare, allocation);

          return allocation;
        }

        if (sharedItemsCount < items.length) {
          yield* Effect.logInfo({
            message: "Chat loot share covers part of the loot items",
            lootId: input.lootId,
            sharedItemsCount,
            totalItemsCount: items.length,
          });
        }

        const updated = yield* options.persistence.compareAndSetChatAllocation({
          actorDiscordId: input.actorDiscordId,
          lootId: input.lootId,
          submissionCutoff,
          lootShare: allocation,
        });

        if (!updated) {
          const state =
            yield* options.persistence.findAuthorizedAllocationState({
              actorDiscordId: input.actorDiscordId,
              lootId: input.lootId,
              submissionCutoff,
            });

          if (!state) return yield* deniedOrHidden(input);

          if (state.lootShareSource !== LootShareSource.CHAT_MESSAGE) {
            return yield* new DependencyUnavailableError(
              "Failed to persist loot share",
            );
          }

          yield* assertMatching(input.lootId, state.lootShare, allocation);

          return allocation;
        }

        const organizationIds = [
          ...new Set(
            authorized.organizationLootRecords.map((record) => record.guildId),
          ),
        ];

        yield* Effect.forEach(
          organizationIds,
          (guildId) =>
            options.cache.invalidateScopes(getLootListCacheScope(guildId)).pipe(
              Effect.catch((error) =>
                Effect.logWarning("Failed to invalidate loots list cache", {
                  error,
                  guildId,
                }),
              ),
            ),
          { concurrency: "unbounded", discard: true },
        );
        yield* Effect.forEach(
          organizationIds,
          (guildId) =>
            options.publisher.publish({
              version: 2,
              guildId,
              lootId: input.lootId,
              lootShare: allocation,
              npcs: socketNpcs(authorized.lootNpcs),
            }),
          { concurrency: "unbounded", discard: true },
        );

        return allocation;
      }),
    );

  return { confirmFromChat } as const;
};

export type LootAllocationOperations = ReturnType<
  typeof makeLootAllocationOperations
>;
