import { Effect, Layer, Schema } from "effect";
import {
  AccessRequirement,
  createAccessPolicy,
} from "@lootlog/domain/access-policy";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import { canDeleteChatMessage } from "@lootlog/domain/chat-message-permissions";
import { MessageType } from "#src/chat/chat-message";
import type { ChatStoredMessage } from "#src/chat/chat-stored-message";
import { SendChatMessageRequest } from "#src/contracts/chat/schemas";
import { canViewerReadChatMessage } from "#src/chat/chat-message-visibility";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { ChatData, ChatOperationError } from "./chat.handlers.js";

export interface ChatRedis {
  readonly rpush: (
    key: string,
    value: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly ltrim: (
    key: string,
    start: number,
    stop: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly lrange: (
    key: string,
    start: number,
    stop: number,
  ) => Effect.Effect<ReadonlyArray<string>, unknown>;
  readonly lset: (
    key: string,
    index: number,
    value: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly lrem: (
    key: string,
    count: number,
    value: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly del: (key: string) => Effect.Effect<unknown, unknown>;
}

type ChatEventPayloads = {
  [RabbitRoutingKey.GUILDS_SEND_MESSAGE]: ChatStoredMessage;
  [RabbitRoutingKey.GUILDS_CLEAR_MESSAGES]: { readonly guildId: string };
  [RabbitRoutingKey.GUILDS_DELETE_MESSAGE]: {
    readonly guildId: string;
    readonly messageId: string;
    readonly routing: ReturnType<typeof routingFor>;
  };
  [RabbitRoutingKey.GUILDS_UPDATE_MESSAGE]: {
    readonly guildId: string;
    readonly messageId: string;
    readonly message: string;
    readonly routing: ReturnType<typeof routingFor>;
  };
};

export interface ChatEvents {
  readonly publish: <Key extends keyof ChatEventPayloads>(
    routingKey: Key,
    payload: ChatEventPayloads[Key],
  ) => Effect.Effect<void, unknown>;
}

const messageKey = (guildId: string) => `guild:${guildId}:messages`;

const ChatStoredMessageJson = Schema.fromJsonString(
  Schema.Struct({
    ...SendChatMessageRequest.fields,
    id: Schema.String,
    senderId: Schema.String,
    timestamp: Schema.String,
    guildId: Schema.String,
  }),
);

const parseStored = Schema.decodeUnknownSync(ChatStoredMessageJson);

const routingFor = (message: Pick<ChatStoredMessage, "type" | "npc">) => {
  const hasNpcRouting =
    message.type === MessageType.NPC ||
    (message.type === MessageType.PARTY_GATHERING && message.npc);

  return !hasNpcRouting || !message.npc
    ? { tier: "base" as const }
    : { tier: getNpcRoutingTier(message.npc), npcLevel: message.npc.lvl };
};

export const makeChatOperations = (redis: ChatRedis, events: ChatEvents) => {
  const rawMessages = (guildId: string) =>
    redis.lrange(messageKey(guildId), 0, -1).pipe(
      Effect.catchIf(
        (error) =>
          error instanceof Error && error.message.includes("WRONGTYPE"),
        () => redis.del(messageKey(guildId)).pipe(Effect.as([])),
      ),
      Effect.map((elements) =>
        elements.flatMap((element) => {
          try {
            return [parseStored(element)];
          } catch {
            return [];
          }
        }),
      ),
    );

  const endPartyGatheringMessages = (
    notificationId: string,
    guildIds: ReadonlyArray<string>,
  ) =>
    Effect.forEach(
      guildIds,
      (guildId) =>
        rawMessages(guildId).pipe(
          Effect.flatMap((messages) =>
            Effect.forEach(
              messages.entries(),
              ([messageIndex, message]) => {
                if (message.partyGathering?.notificationId !== notificationId) {
                  return Effect.void;
                }

                const updated = {
                  ...message,
                  message: `${message.characterData.nick} zakończył zbieranie grupy`,
                  partyGathering: undefined,
                };

                return redis
                  .lset(
                    messageKey(guildId),
                    messageIndex,
                    JSON.stringify(updated),
                  )
                  .pipe(
                    Effect.flatMap(() =>
                      events
                        .publish(RabbitRoutingKey.GUILDS_UPDATE_MESSAGE, {
                          guildId,
                          messageId: message.id,
                          message: updated.message,
                          routing: routingFor(message),
                        })
                        .pipe(Effect.ignore),
                    ),
                  );
              },
              { discard: true },
            ),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );

  return {
    endPartyGatheringMessages,
    service: ChatData.of({
      sendMessage: (discordId, guildId, payload) => {
        const data = payload;

        const message: ChatStoredMessage = {
          ...data,
          id: Bun.randomUUIDv7(),
          senderId: discordId,
          timestamp: new Date().toISOString(),
          guildId,
        };

        return redis.rpush(messageKey(guildId), JSON.stringify(message)).pipe(
          Effect.flatMap(() =>
            Effect.all(
              [
                redis.ltrim(messageKey(guildId), -CHAT_MESSAGE_LIMIT, -1),
                events
                  .publish(RabbitRoutingKey.GUILDS_SEND_MESSAGE, message)
                  .pipe(Effect.ignore),
              ],
              { concurrency: "unbounded", discard: true },
            ),
          ),
          Effect.as({
            ...message,
            canDelete: true,
          }),
          Effect.mapError((cause) => new ChatOperationError({ cause })),
        );
      },
      getMessages: (viewer, guildId) =>
        Effect.gen(function* () {
          const messages = yield* rawMessages(guildId);

          const visible = messages.filter((message) =>
            canViewerReadChatMessage(viewer, message),
          );

          return visible.map((message) => ({
            ...message,
            canDelete: canDeleteChatMessage(viewer, message),
          }));
        }).pipe(Effect.mapError((cause) => new ChatOperationError({ cause }))),
      clearMessages: (viewer, guildId) =>
        Effect.gen(function* () {
          if (
            !createAccessPolicy({
              capabilities: viewer.permissions,
            }).allowsAny(AccessRequirement.ADMINISTER)
          ) {
            return yield* Effect.fail(
              new PermissionDeniedError("Only OWNER or ADMIN can clear chat"),
            );
          }

          yield* redis.del(messageKey(guildId));
          yield* events
            .publish(RabbitRoutingKey.GUILDS_CLEAR_MESSAGES, { guildId })
            .pipe(Effect.ignore);

          return { success: true };
        }).pipe(Effect.mapError((cause) => new ChatOperationError({ cause }))),
      deleteMessage: (viewer, guildId, messageId) =>
        Effect.gen(function* () {
          const elements = yield* redis.lrange(messageKey(guildId), 0, -1);

          const target = elements.find(
            (element) => parseStored(element).id === messageId,
          );

          if (!target) {
            return yield* Effect.fail(
              new ResourceNotFoundError("Message not found"),
            );
          }

          const message = parseStored(target);

          if (
            !canViewerReadChatMessage(viewer, message) ||
            !canDeleteChatMessage(viewer, message)
          ) {
            return yield* Effect.fail(
              new PermissionDeniedError("Not allowed to manage this message"),
            );
          }

          yield* redis.lrem(messageKey(guildId), 1, target);
          yield* events
            .publish(RabbitRoutingKey.GUILDS_DELETE_MESSAGE, {
              guildId,
              messageId,
              routing: routingFor(message),
            })
            .pipe(Effect.ignore);

          return { success: true };
        }).pipe(Effect.mapError((cause) => new ChatOperationError({ cause }))),
    }),
  };
};

export const makeChatDataLayer = (redis: ChatRedis, events: ChatEvents) =>
  Layer.succeed(ChatData, makeChatOperations(redis, events).service);
