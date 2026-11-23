import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { ChatOperationError, ChatData } from "#src/chat/chat-data";
import {
  pathString,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { applicationErrorResponse } from "#src/http-api/application-error-response";
import {
  applicationErrorStatusOrUndefined,
  type ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import {
  Capability,
  type Capability as PermissionValue,
} from "@lootlog/schema/permissions";
import {
  ChatMessageActionResponse,
  ChatMessageResponse,
  type SendChatMessageRequest,
} from "#src/contracts/chat/schemas";

import { DomainDateTime } from "#src/shared/schema/response-codecs";

import { LootlogApi } from "../../lootlog-api.js";
import type { ChatMessageViewer } from "#src/chat/chat-message-viewer";

type ChatIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type ChatGuildAccess = ChatIdentity &
  ChatMessageViewer & {
    readonly guildId: string;
  };

export class ChatAccessDenied extends TaggedErrorClass<
  ChatAccessDenied,
  { readonly brand: unique symbol }
>()("ChatAccessDenied", {
  status: Schema.Literals([401, 403]),
  code: Schema.String,
}) {}

export class ChatNotFound extends TaggedErrorClass<
  ChatNotFound,
  { readonly brand: unique symbol }
>()("ChatNotFound", { status: Schema.Literal(404), code: Schema.String }) {}

type AccessFailure = ChatAccessDenied | ChatNotFound | ReauthenticationRequired;

export class ChatAuthorization extends Context.Service<
  ChatAuthorization,
  {
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly allOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<ChatGuildAccess, AccessFailure, ForwardAuthIdentity>;
  }
>()("@lootlog/api/http-api/chat/authorization") {}

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
  Schema.decodeUnknownEffect(schema)(value).pipe(
    Effect.mapError((cause) => new ChatOperationError({ cause })),
  );

type ChatFailure =
  | ChatAccessDenied
  | ChatNotFound
  | ChatOperationError
  | ReauthenticationRequired;

const declaredHttpFailure = <A, R>(effect: Effect.Effect<A, ChatFailure, R>) =>
  Effect.catchTags(effect, {
    ChatAccessDenied: (error) =>
      error.status === 403 ? statusCodeResponse(error) : Effect.die(error),
    ReauthenticationRequired: reauthenticationRequiredResponse,
    ChatNotFound: statusCodeResponse,
    ChatOperationError: (error) => {
      const status = applicationErrorStatusOrUndefined(error.cause);

      return status === 403 || status === 404
        ? applicationErrorResponse(error.cause)
        : Effect.die(error.cause);
    },
  });

const ChatMessageDomainResponse = Schema.Struct({
  ...ChatMessageResponse.fields,
  timestamp: DomainDateTime,
});

const ChatMessagesDomainResponse = Schema.Array(ChatMessageDomainResponse);

const readCapabilities = [Capability.LOOTLOG_CHAT_READ] as const;

const writeCapabilities = [
  Capability.LOOTLOG_CHAT_READ,
  Capability.LOOTLOG_CHAT_WRITE,
] as const;

export const getChatMessages = Effect.fn("getChatMessages")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, readCapabilities);

  const value = yield* data((service) =>
    service.getMessages(access, access.guildId),
  );

  return yield* decode(ChatMessagesDomainResponse, value);
});

export const sendChatMessage = Effect.fn("sendChatMessage")(function* (
  guildId: string,
  payload: SendChatMessageRequest,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);

  const value = yield* data((service) =>
    service.sendMessage(access.discordId, access.guildId, payload),
  );

  return yield* decode(ChatMessageDomainResponse, value);
});

const clearChatMessages = Effect.fn("clearChatMessages")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);

  const value = yield* data((service) =>
    service.clearMessages(access, access.guildId),
  );

  return yield* decode(ChatMessageActionResponse, value);
});

export const deleteChatMessage = Effect.fn("deleteChatMessage")(function* (
  guildId: string,
  messageId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);

  const value = yield* data((service) =>
    service.deleteMessage(access, access.guildId, messageId),
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
      ),
);
