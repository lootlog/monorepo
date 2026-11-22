import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  GlobalChatMessageResponse,
  GlobalChatMessagesResponse,
  GlobalChatMuteResponse,
  GlobalChatMutesResponse,
  GlobalChatWorldsResponse,
  MuteGlobalChatSenderRequest,
  PinGlobalChatMessageRequest,
  SendGlobalChatMessageRequest,
} from "#src/contracts/global-chat/schemas";

export type GlobalChatCaller = {
  readonly userId: string;
  readonly discordId: string;
};

/**
 * The caller is not an active Member of any active Organization, is muted
 * while sending, or is not a global chat admin while moderating or sending to
 * every channel.
 */
export class GlobalChatAccessDenied extends TaggedErrorClass<
  GlobalChatAccessDenied,
  { readonly brand: unique symbol }
>()("GlobalChatAccessDenied", { status: Schema.Literal(403) }) {}

/** The world has no channel, or the channel no longer keeps the message or mute. */
export class GlobalChatNotFound extends TaggedErrorClass<
  GlobalChatNotFound,
  { readonly brand: unique symbol }
>()("GlobalChatNotFound", { status: Schema.Literal(404) }) {}

export class GlobalChatRateLimited extends TaggedErrorClass<
  GlobalChatRateLimited,
  { readonly brand: unique symbol }
>()("GlobalChatRateLimited", {
  status: Schema.Literal(429),
  retryAfterMs: Schema.Finite,
}) {}

export class GlobalChatOperationError extends TaggedErrorClass<
  GlobalChatOperationError,
  { readonly brand: unique symbol }
>()("GlobalChatOperationError", { cause: Schema.Defect() }) {}

export type GlobalChatFailure =
  | GlobalChatAccessDenied
  | GlobalChatNotFound
  | GlobalChatOperationError;

/** `world` is undefined for the channel every world shares. */
export class GlobalChatData extends Context.Service<
  GlobalChatData,
  {
    readonly getWorlds: (
      caller: GlobalChatCaller,
    ) => Effect.Effect<
      GlobalChatWorldsResponse,
      GlobalChatAccessDenied | GlobalChatOperationError
    >;
    readonly getMessages: (
      caller: GlobalChatCaller,
      world: string | undefined,
      before: number | undefined,
    ) => Effect.Effect<GlobalChatMessagesResponse, GlobalChatFailure>;
    readonly sendMessage: (
      caller: GlobalChatCaller,
      payload: SendGlobalChatMessageRequest,
    ) => Effect.Effect<
      GlobalChatMessageResponse,
      GlobalChatFailure | GlobalChatRateLimited
    >;
    readonly deleteMessage: (
      caller: GlobalChatCaller,
      world: string | undefined,
      messageId: string,
    ) => Effect.Effect<void, GlobalChatFailure>;
    readonly pinMessage: (
      caller: GlobalChatCaller,
      payload: PinGlobalChatMessageRequest,
    ) => Effect.Effect<GlobalChatMessageResponse, GlobalChatFailure>;
    readonly unpinMessage: (
      caller: GlobalChatCaller,
      world: string | undefined,
    ) => Effect.Effect<void, GlobalChatFailure>;
    readonly getMutes: (
      caller: GlobalChatCaller,
    ) => Effect.Effect<
      GlobalChatMutesResponse,
      GlobalChatAccessDenied | GlobalChatOperationError
    >;
    readonly muteSender: (
      caller: GlobalChatCaller,
      payload: MuteGlobalChatSenderRequest,
    ) => Effect.Effect<GlobalChatMuteResponse, GlobalChatFailure>;
    readonly unmuteSender: (
      caller: GlobalChatCaller,
      muteId: string,
    ) => Effect.Effect<void, GlobalChatFailure>;
    readonly unmuteMessageSender: (
      caller: GlobalChatCaller,
      world: string | undefined,
      messageId: string,
    ) => Effect.Effect<void, GlobalChatFailure>;
  }
>()("@lootlog/api/http-api/global-chat/data") {}
