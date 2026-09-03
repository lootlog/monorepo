import { v6 } from "uuid";
import { and, eq, isNotNull } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  canDeleteChatMessage,
  canEditChatMessage,
} from "#src/chat/chat-message-permissions";
import { MessageType } from "#src/chat/chat-message";
import type { ChatStoredMessage } from "#src/chat/types/chat-stored-message.type";
import { SendMessageDto } from "#src/http-api/contracts/chat/schemas";
import type { ChatMessageViewer } from "#src/chat/types/chat-message-viewer.type";
import { canViewChatMessage } from "#src/shared/utils/can-view-chat-message";
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

export interface ChatEvents {
  readonly publish: (
    routingKey: RabbitRoutingKeyName,
    payload: unknown,
  ) => Effect.Effect<void, unknown>;
}

const messageKey = (guildId: string) => `guild:${guildId}:messages`;

const ChatStoredMessageJson = Schema.fromJsonString(
  Schema.Struct({
    ...SendMessageDto.fields,
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

export const makeChatOperations = (redis: ChatRedis, events: ChatEvents) =>
  Effect.map(ApiDatabase, (database) => {
    const viewer = (discordId: string, guildId: string) =>
      Effect.gen(function* () {
        const guilds = yield* database
          .select()
          .from(guildTable)
          .where(and(eq(guildTable.id, guildId), eq(guildTable.active, true)))
          .limit(1);
        const guild = guilds[0];
        if (!guild) return null;
        const roles = yield* database
          .select({ role: roleTable })
          .from(memberTable)
          .innerJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
          .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
          .where(
            and(
              eq(memberTable.guildId, guildId),
              eq(memberTable.userId, discordId),
              eq(memberTable.active, true),
              isNotNull(memberTable.globalUserId),
            ),
          )
          .pipe(Effect.map((rows) => rows.map(({ role }) => role)));
        const permissions =
          guild.ownerId === discordId
            ? Object.values(Permission)
            : roles.flatMap(({ permissions }) => permissions);
        const mayRead =
          createAccessPolicy({ capabilities: permissions }).allows(
            Capability.ADMIN,
          ) ||
          roles.some(({ permissions }) =>
            permissions.includes(Permission.LOOTLOG_CHAT_READ),
          );
        return mayRead
          ? ({ discordId, permissions, roles } satisfies ChatMessageViewer)
          : null;
      });

    const rawMessages = (guildId: string) =>
      redis.lrange(messageKey(guildId), 0, -1).pipe(
        Effect.catch((error) => {
          if (error instanceof Error && error.message.includes("WRONGTYPE")) {
            return redis.del(messageKey(guildId)).pipe(Effect.as([]));
          }
          return Effect.fail(error);
        }),
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
                  if (
                    message.partyGathering?.notificationId !== notificationId
                  ) {
                    return Effect.void;
                  }
                  const updated = {
                    ...message,
                    message: `${message.characterData.nick} zakonczyl zbieranie grupy`,
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
        { discard: true },
      );

    return {
      endPartyGatheringMessages,
      service: ChatData.of({
        sendMessage: (discordId, guildId, payload) => {
          const data = payload;
          const message: ChatStoredMessage = {
            ...data,
            id: v6(),
            senderId: discordId,
            timestamp: new Date().toISOString(),
            guildId,
          };
          return redis.rpush(messageKey(guildId), JSON.stringify(message)).pipe(
            Effect.flatMap(() =>
              redis.ltrim(messageKey(guildId), -CHAT_MESSAGE_LIMIT, -1),
            ),
            Effect.flatMap(() =>
              events
                .publish(RabbitRoutingKey.GUILDS_SEND_MESSAGE, message)
                .pipe(Effect.ignore),
            ),
            Effect.as({
              ...message,
              canEdit: true,
              canDelete: true,
            }),
            Effect.mapError((cause) => new ChatOperationError({ cause })),
          );
        },
        getMessages: (discordId, guildId) =>
          Effect.gen(function* () {
            const messages = yield* rawMessages(guildId);
            if (messages.length === 0) return [];
            const currentViewer = yield* viewer(discordId, guildId);
            if (!currentViewer) return [];
            const visible = createAccessPolicy({
              capabilities: currentViewer.permissions,
            }).allows(Capability.ADMIN)
              ? messages
              : messages.filter((message) =>
                  canViewChatMessage(message, currentViewer.roles),
                );
            return visible.map((message) => ({
              ...message,
              canEdit: canEditChatMessage(currentViewer, message),
              canDelete: canDeleteChatMessage(currentViewer, message),
            }));
          }).pipe(
            Effect.mapError((cause) => new ChatOperationError({ cause })),
          ),
        clearMessages: (discordId, guildId) =>
          Effect.gen(function* () {
            const currentViewer = yield* viewer(discordId, guildId);
            if (
              !currentViewer ||
              !createAccessPolicy({
                capabilities: currentViewer.permissions,
              }).allows(Capability.ADMIN)
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
          }).pipe(
            Effect.mapError((cause) => new ChatOperationError({ cause })),
          ),
        updateMessage: (discordId, guildId, messageId, newMessage) =>
          Effect.gen(function* () {
            const elements = yield* redis.lrange(messageKey(guildId), 0, -1);
            const index = elements.findIndex(
              (element) => parseStored(element).id === messageId,
            );
            if (index < 0) {
              return yield* Effect.fail(
                new ResourceNotFoundError("Message not found"),
              );
            }
            const element = elements.at(index);
            if (!element) {
              return yield* Effect.fail(
                new ResourceNotFoundError("Message not found"),
              );
            }
            const message = parseStored(element);
            const currentViewer = yield* viewer(discordId, guildId);
            if (!currentViewer || !canEditChatMessage(currentViewer, message)) {
              return yield* Effect.fail(
                new PermissionDeniedError("Not allowed to manage this message"),
              );
            }
            yield* redis.lset(
              messageKey(guildId),
              index,
              JSON.stringify({
                ...message,
                message: newMessage,
                partyGathering: undefined,
              }),
            );
            yield* events
              .publish(RabbitRoutingKey.GUILDS_UPDATE_MESSAGE, {
                guildId,
                messageId,
                message: newMessage,
                routing: routingFor(message),
              })
              .pipe(Effect.ignore);
            return { success: true };
          }).pipe(
            Effect.mapError((cause) => new ChatOperationError({ cause })),
          ),
        deleteMessage: (discordId, guildId, messageId) =>
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
            const currentViewer = yield* viewer(discordId, guildId);
            if (
              !currentViewer ||
              !canDeleteChatMessage(currentViewer, message)
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
          }).pipe(
            Effect.mapError((cause) => new ChatOperationError({ cause })),
          ),
      }),
    };
  });

export const makeChatDataLayer = (redis: ChatRedis, events: ChatEvents) =>
  Layer.effect(
    ChatData,
    makeChatOperations(redis, events).pipe(
      Effect.map(({ service }) => service),
    ),
  );
