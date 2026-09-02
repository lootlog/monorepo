import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { createHash } from "node:crypto";
import { Effect, Schema } from "effect";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type {
  GuildLootEventNpc,
  GuildLootShareUpdatedEventV2,
} from "@lootlog/schema/loot-events";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from "#src/loots/constants/loot-share-msg-regex";
import { ErrorKey } from "#src/loots/enum/error-key.enum";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from "#src/shared/http/http-errors";
import type { LootShare } from "#src/shared/dto/loot-response.dto";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { LootAllocationPersistence } from "./loot-allocation-persistence.js";

const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

export interface LootAllocationCache {
  readonly deleteByPattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
}
export interface LootAllocationPublisher {
  readonly publish: (
    exchange: string,
    routingKey: string,
    event: GuildLootShareUpdatedEventV2,
  ) => Effect.Effect<void, unknown>;
}

export class LootAllocationOperationError extends TaggedErrorClass<LootAllocationOperationError>()(
  "LootAllocationOperationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
};

const parseChatAllocation = (message: string): Record<string, string[]> => {
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
    type:
      npcSnapshot.type ??
      getNpcTypeByWt(
        NpcType,
        npcSnapshot.wt ?? 0,
        npcSnapshot.prof ?? undefined,
      ),
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
      Effect.mapError(
        (cause) => new LootAllocationOperationError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-allocation", retryCount: 0 },
      }),
    );

  const assertMatching = (
    lootId: number,
    persisted: unknown,
    submitted: LootShare,
  ) => {
    const persistedValue = stableSerialize(persisted);
    const submittedValue = stableSerialize(submitted);
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
        Effect.fail(new ConflictException("Conflicting loot share")),
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
        const submissionCutoff = new Date(Date.now() - SUBMISSION_WINDOW_MS);
        const authorized = yield* options.persistence.findAuthorizedLoot({
          actorUserId: input.actorUserId,
          lootId: input.lootId,
          submissionCutoff,
        });
        if (!authorized) {
          return yield* Effect.fail(
            new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT),
          );
        }
        const parsed = parseChatAllocation(input.message);
        if (Object.keys(parsed).length === 0) {
          return yield* Effect.fail(
            new BadRequestException(ErrorKey.MISSING_LOOT_SHARE),
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
        const items = authorized.lootItems.map(({ hid, itemSnapshot }) => ({
          id: String(itemSnapshot.itemId),
          hid,
          name: itemSnapshot.name,
          icon: itemSnapshot.icon,
          stat: itemSnapshot.statRaw,
          lvl: itemSnapshot.lvl ?? 0,
          rarity: itemSnapshot.rarity,
          prof: [],
          type: itemSnapshot.itemType ?? "",
        }));
        const allocation = resolveChatAllocation(parsed, players, items);
        if (Object.keys(allocation).length === 0) {
          return yield* Effect.fail(
            new BadRequestException(ErrorKey.MISSING_LOOT_SHARE_ITEM_OR_PLAYER),
          );
        }
        if (authorized.lootShareSource === LootShareSource.CHAT_MESSAGE) {
          yield* assertMatching(input.lootId, authorized.lootShare, allocation);
          return {};
        }
        if (Object.keys(allocation).length < items.length) {
          options.logger.log({
            level: "warn",
            message:
              "Loot share does not include all items, some items may not be shared",
            lootId: input.lootId,
            mappedItemsCount: Object.keys(allocation).length,
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
              new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT),
            );
          }
          if (state.lootShareSource !== LootShareSource.CHAT_MESSAGE) {
            return yield* Effect.fail(
              new ServiceUnavailableException("Failed to persist loot share"),
            );
          }
          yield* assertMatching(input.lootId, state.lootShare, allocation);
          return {};
        }

        const organizationIds = [
          ...new Set(
            authorized.organizationLootRecords.map((record) => record.guildId),
          ),
        ];
        yield* Effect.all(
          organizationIds.map((guildId) =>
            options.cache.deleteByPattern(`loots:list:${guildId}:*`).pipe(
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
              DEFAULT_EXCHANGE_NAME,
              RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
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
        return {};
      }),
    );

  return { confirmFromChat } as const;
};

export type LootAllocationOperations = ReturnType<
  typeof makeLootAllocationOperations
>;
