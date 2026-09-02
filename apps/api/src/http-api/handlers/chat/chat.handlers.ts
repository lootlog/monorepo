import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import {
  ChatControllerClearChatMessages200,
  ChatControllerDeleteChatMessage200,
  ChatControllerGetChatMessages200,
  ChatControllerSendChatMessage201,
  ChatControllerUpdateChatMessage200,
  LootlogApi,
  type SendMessageDto,
} from "../../lootlog-api.generated.js";

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
      payload: SendMessageDto,
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

const toWire = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toWire);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, toWire(nested)]),
  );
};

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(toWire(value)).pipe(
    Effect.mapError((cause) => new ChatOperationError({ cause })),
  );

const defectCause = (error: unknown) =>
  error instanceof ChatOperationError ? error.cause : error;

const errorStatus = (error: unknown): number | undefined => {
  if (error instanceof ChatAccessDenied || error instanceof ChatNotFound) {
    return error.status;
  }
  const cause = defectCause(error);
  if (
    typeof cause === "object" &&
    cause !== null &&
    "getStatus" in cause &&
    typeof cause.getStatus === "function"
  ) {
    return cause.getStatus();
  }
  return undefined;
};

const declaredForbidden = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) =>
    errorStatus(error) === 403
      ? Effect.fail(undefined)
      : Effect.die(defectCause(error)),
  );

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
  return yield* decode(ChatControllerGetChatMessages200, value);
});

export const sendChatMessage = Effect.fn("sendChatMessage")(function* (
  guildId: string,
  payload: SendMessageDto,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.sendMessage(access.discordId, access.guildId, payload),
  );
  return yield* decode(ChatControllerSendChatMessage201, value);
});

export const clearChatMessages = Effect.fn("clearChatMessages")(function* (
  guildId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.clearMessages(access.discordId, access.guildId),
  );
  return yield* decode(ChatControllerClearChatMessages200, value);
});

export const deleteChatMessage = Effect.fn("deleteChatMessage")(function* (
  guildId: string,
  messageId: string,
) {
  const access = yield* requireGuild(guildId, writeCapabilities);
  const value = yield* data((service) =>
    service.deleteMessage(access.discordId, access.guildId, messageId),
  );
  return yield* decode(ChatControllerDeleteChatMessage200, value);
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
  return yield* decode(ChatControllerUpdateChatMessage200, value);
});

export const ChatHandlers = HttpApiBuilder.group(
  LootlogApi,
  "chat",
  (handlers) =>
    handlers
      .handle("ChatControllerGetChatMessages", ({ params }) =>
        declaredForbidden(
          Effect.flatMap(
            pathString(params.guildId, "guildId"),
            getChatMessages,
          ),
        ),
      )
      .handle("ChatControllerSendChatMessage", ({ params, payload }) =>
        declaredForbidden(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            sendChatMessage(guildId, payload),
          ),
        ),
      )
      .handle("ChatControllerClearChatMessages", ({ params }) =>
        declaredForbidden(
          Effect.flatMap(
            pathString(params.guildId, "guildId"),
            clearChatMessages,
          ),
        ),
      )
      .handle("ChatControllerDeleteChatMessage", ({ params }) =>
        declaredForbidden(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            deleteChatMessage(guildId, params.messageId),
          ),
        ),
      )
      .handle("ChatControllerUpdateChatMessage", ({ params, payload }) =>
        declaredForbidden(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            updateChatMessage(guildId, params.messageId, payload.message),
          ),
        ),
      ),
);
