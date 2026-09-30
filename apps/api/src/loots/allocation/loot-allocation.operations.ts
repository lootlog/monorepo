import { getLootListCacheScope } from "#src/shared/cache";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { createHash } from "node:crypto";
import { joinItemStat } from "@lootlog/database/item-stat";
import { Clock, Effect, Schema } from "effect";
import type {
  GuildLootEventNpc,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/schema/loot-events";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { stableJsonStringify } from "@lootlog/schema/stable-json";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitExchangeName,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from "#src/loots/loot-share-message";
import { ErrorKey } from "#src/loots/error-key";
import {
  ApplicationError,
  InvalidRequestError,
  ResourceConflictError,
  PermissionDeniedError,
  DependencyUnavailableError,
} from "#src/shared/http/http-errors";
import type { LootShare } from "#src/loots/loot-response.schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import type { LootAllocationPersistence } from "#src/loots/allocation/loot-allocation-persistence";

const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

export interface LootAllocationCache {
  readonly invalidateScopes: (
    ...scopes: string[]
  ) => Effect.Effect<unknown, unknown>;
}

export interface LootAllocationPublisher {
  readonly publish: (
    exchange: RabbitExchangeName,
    routingKey: RabbitRoutingKeyName,
    event: GuildLootShareUpdatedEventV2,
  ) => Effect.Effect<void, unknown>;
}

export class LootAllocationOperationError extends TaggedErrorClass<LootAllocationOperationError>()(
  "LootAllocationOperationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const parseChatAllocation = (message: string) => {
  const allocation: Record<string, string[]> = {};
  let match: RegExpExecArray | null;

  while ((match = LOOT_SHARE_MSG_REGEX.exec(message)) !== null) {
    const nickname = match[1].trim();
    let itemMatch: RegExpExecArray | null;

    while ((itemMatch = LOOT_SHARE_ITEM_REGEX.exec(match[2])) !== null) {
      const items = allocation[nickname];

      if (items) items.push(itemMatch[1]);
      else allocation[nickname] = [itemMatch[1]];
    }

    LOOT_SHARE_ITEM_REGEX.lastIndex = 0;
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
  readonly logger: ApplicationLogger;
}) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      // Declared business failures keep their HTTP status; only unexpected
      // causes become an internal operation error.
      Effect.mapError((cause) =>
        Schema.is(ApplicationError)(cause)
          ? cause
          : new LootAllocationOperationError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-allocation", retryCount: 0 },
      }),
    );

  const assertMatching = <Persisted>(
    lootId: number,
    persisted: Persisted,
    submitted: LootShare,
  ) => {
    const persistedValue = stableJsonStringify(persisted);
    const submittedValue = stableJsonStringify(submitted);

    if (persistedValue === submittedValue) return Effect.void;

    return Effect.sync(() =>
      options.logger.warn("Conflicting chat loot share rejected", {
        lootId,
        persistedHash: createHash("sha256")
          .update(persistedValue)
          .digest("hex"),
        submittedHash: createHash("sha256")
          .update(submittedValue)
          .digest("hex"),
      }),
    ).pipe(
      Effect.andThen(
        Effect.fail(new ResourceConflictError("Conflicting loot share")),
      ),
    );
  };

  const confirmFromChat = (input: {
    readonly actorUserId: string;
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
          actorUserId: input.actorUserId,
          lootId: input.lootId,
          submissionCutoff,
        });

        if (!authorized) {
          return yield* Effect.fail(
            new PermissionDeniedError(ErrorKey.CANT_UPDATE_LOOT),
          );
        }

        const parsed = parseChatAllocation(input.message);

        if (Object.keys(parsed).length === 0) {
          return yield* Effect.fail(
            new InvalidRequestError(ErrorKey.MISSING_LOOT_SHARE),
          );
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

        // Margonem omits items every player rejected, so a chat share may cover
        // only some loot items, or none. With nothing to record, keep the
        // current allocation instead of erasing it. The empty response tells
        // the game client this message did not confirm the loot; it may belong
        // to an older one.
        if (sharedItemsCount === 0) {
          options.logger.log({
            level: "info",
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
          options.logger.log({
            level: "info",
            message: "Chat loot share covers part of the loot items",
            lootId: input.lootId,
            sharedItemsCount,
            totalItemsCount: items.length,
          });
        }

        const updated = yield* options.persistence.compareAndSetChatAllocation({
          actorUserId: input.actorUserId,
          lootId: input.lootId,
          submissionCutoff,
          lootShare: allocation,
        });

        if (!updated) {
          const state =
            yield* options.persistence.findAuthorizedAllocationState({
              actorUserId: input.actorUserId,
              lootId: input.lootId,
              submissionCutoff,
            });

          if (!state) {
            return yield* Effect.fail(
              new PermissionDeniedError(ErrorKey.CANT_UPDATE_LOOT),
            );
          }

          if (state.lootShareSource !== LootShareSource.CHAT_MESSAGE) {
            return yield* Effect.fail(
              new DependencyUnavailableError("Failed to persist loot share"),
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

        yield* Effect.all(
          organizationIds.map((guildId) =>
            options.cache.invalidateScopes(getLootListCacheScope(guildId)).pipe(
              Effect.catch((error) =>
                Effect.sync(() =>
                  options.logger.warn("Failed to invalidate loots list cache", {
                    error,
                    guildId,
                  }),
                ),
              ),
            ),
          ),
          { concurrency: "unbounded", discard: true },
        );
        yield* Effect.all(
          organizationIds.map((guildId) =>
            options.publisher.publish(
              RabbitExchange.DEFAULT,
              RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
              {
                version: 2,
                guildId,
                lootId: input.lootId,
                lootShare: allocation,
                npcs: socketNpcs(authorized.lootNpcs),
              },
            ),
          ),
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
