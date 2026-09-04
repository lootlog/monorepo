import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import { encodeDomainJson } from "../../domain-json.schema.js";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import {
  ChatMessageActionResponse,
  ChatMessagesResponse,
  ChatMessageResponse,
  type SendChatMessageRequest,
} from "#src/contracts/chat/schemas";

import { LootlogApi } from "../../lootlog-api.js";

export type ChatIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type ChatGuildAccess = ChatIdentity & {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

export class ChatAccessDenied extends TaggedErrorClass<ChatAccessDenied>()(
  "ChatAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class ChatNotFound extends TaggedErrorClass<ChatNotFound>()(
  "ChatNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export class ChatOperationError extends TaggedErrorClass<ChatOperationError>()(
  "ChatOperationError",
  { cause: Schema.Defect() },
) {}

type AccessFailure = ChatAccessDenied | ChatNotFound;

export class ChatAuthorization extends Context.Service<
  ChatAuthorization,
  {
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly allOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<ChatGuildAccess, AccessFailure>;
  }
>()("@lootlog/api/http-api/chat/authorization") {}

type DataEffect = Effect.Effect<unknown, ChatOperationError>;

export class ChatData extends Context.Service<
  ChatData,
  {
    readonly getMessages: (discordId: string, guildId: string) => DataEffect;
    readonly sendMessage: (
      discordId: string,
      guildId: string,
      payload: SendChatMessageRequest,
    ) => DataEffect;
    readonly clearMessages: (discordId: string, guildId: string) => DataEffect;
    readonly deleteMessage: (
      discordId: string,
      guildId: string,
      messageId: string,
    ) => DataEffect;
    readonly updateMessage: (
      discordId: string,
      guildId: string,
      messageId: string,
      message: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/chat/data") {}

const requireGuild = (guildId: string, allOf: ReadonlyArray<PermissionValue>) =>
  Effect.flatMap(ChatAuthorization, (authorization) =>
    authorization.requireGuild({ guildId, allOf }),
  );

const data = <A>(
  operation: (
    service: ChatData["Service"],
  ) => Effect.Effect<A, ChatOperationError>,
) => Effect.flatMap(ChatData, operation);

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  encodeDomainJson(value).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.mapError((cause) => new ChatOperationError({ cause })),
  );

type ChatFailure = ChatAccessDenied | ChatNotFound | ChatOperationError;

const declaredHttpFailure = <A, R>(effect: Effect.Effect<A, ChatFailure, R>) =>
  Effect.catchTags(effect, {
    ChatAccessDenied: (error) =>
      error.status === 403
        ? Effect.succeed(HttpServerResponse.empty({ status: error.status }))
        : Effect.die(error),
    ChatNotFound: (error) =>
      Effect.succeed(HttpServerResponse.empty({ status: error.status })),
    ChatOperationError: (error) => {
      const status = applicationErrorStatusOrUndefined(error.cause);
      return status === 403 || status === 404
        ? Effect.succeed(HttpServerResponse.empty({ status }))
        : Effect.die(error.cause);
    },
  });

const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

const readCapabilities = [Permission.LOOTLOG_CHAT_READ] as const;
const writeCapabilities = [
  Permission.LOOTLOG_CHAT_READ,
  Permission.LOOTLOG_CHAT_WRITE,
] as const;

export const getChatMessages = Effect.fn("getChatMessages")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, readCapabilities);
  const value = yield* data((service) =>
    service.getMessages(access.discordId, access.guildId),
  );
  return yield* decode(ChatMessagesResponse, value);
});

export const sendChatMessage = Effect.fn("sendChatMessage")(function* (
  guildId: string,
  payload: SendChatMessageRequest,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.sendMessage(access.discordId, access.guildId, payload),
  );
  return yield* decode(ChatMessageResponse, value);
});

export const clearChatMessages = Effect.fn("clearChatMessages")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.clearMessages(access.discordId, access.guildId),
  );
  return yield* decode(ChatMessageActionResponse, value);
});

export const deleteChatMessage = Effect.fn("deleteChatMessage")(function* (
  guildId: string,
  messageId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.deleteMessage(access.discordId, access.guildId, messageId),
  );
  return yield* decode(ChatMessageActionResponse, value);
});

export const updateChatMessage = Effect.fn("updateChatMessage")(function* (
  guildId: string,
  messageId: string,
  message: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.updateMessage(access.discordId, access.guildId, messageId, message),
  );
  return yield* decode(ChatMessageActionResponse, value);
});

export const ChatHandlers = HttpApiBuilder.group(
  LootlogApi,
  "chat",
  (handlers) =>
    handlers
      .handle("ChatControllerGetChatMessages", ({ params }) =>
        declaredHttpFailure(
          Effect.flatMap(
            pathString(params.guildId, "guildId"),
            getChatMessages,
          ),
        ),
      )
      .handle("ChatControllerSendChatMessage", ({ params, payload }) =>
        declaredHttpFailure(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            sendChatMessage(guildId, payload),
          ),
        ),
      )
      .handle("ChatControllerClearChatMessages", ({ params }) =>
        declaredHttpFailure(
          Effect.flatMap(
            pathString(params.guildId, "guildId"),
            clearChatMessages,
          ),
        ),
      )
      .handle("ChatControllerDeleteChatMessage", ({ params }) =>
        declaredHttpFailure(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            deleteChatMessage(guildId, params.messageId),
          ),
        ),
      )
      .handle("ChatControllerUpdateChatMessage", ({ params, payload }) =>
        declaredHttpFailure(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            updateChatMessage(guildId, params.messageId, payload.message),
          ),
        ),
      ),
);
