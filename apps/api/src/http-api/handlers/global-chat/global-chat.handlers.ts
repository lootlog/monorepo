import { emptyStatusResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
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
import { LootlogApi } from "../../lootlog-api.js";

export type GlobalChatCaller = {
  readonly userId: string;
  readonly discordId: string;
};

/**
 * The caller is not an active Member of any active Organization, is muted
 * while sending, or is not a global chat admin while moderating.
 */
export class GlobalChatAccessDenied extends TaggedErrorClass<GlobalChatAccessDenied>()(
  "GlobalChatAccessDenied",
  { status: Schema.Literal(403) },
) {}

/** The world has no channel, or the channel no longer keeps the message or mute. */
export class GlobalChatNotFound extends TaggedErrorClass<GlobalChatNotFound>()(
  "GlobalChatNotFound",
  { status: Schema.Literal(404) },
) {}

export class GlobalChatRateLimited extends TaggedErrorClass<GlobalChatRateLimited>()(
  "GlobalChatRateLimited",
  { status: Schema.Literal(429) },
) {}

export class GlobalChatOperationError extends TaggedErrorClass<GlobalChatOperationError>()(
  "GlobalChatOperationError",
  { cause: Schema.Defect() },
) {}

type GlobalChatFailure =
  | GlobalChatAccessDenied
  | GlobalChatNotFound
  | GlobalChatOperationError;

export class GlobalChatIdentity extends Context.Service<
  GlobalChatIdentity,
  { readonly caller: Effect.Effect<GlobalChatCaller> }
>()("@lootlog/api/http-api/global-chat/identity") {}

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

const withCaller = <A, E>(
  operation: (
    data: GlobalChatData["Service"],
    caller: GlobalChatCaller,
  ) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const identity = yield* GlobalChatIdentity;
    const caller = yield* identity.caller;
    const data = yield* GlobalChatData;

    return yield* operation(data, caller);
  });

const declaredHttpFailure = <A, R>(
  effect: Effect.Effect<A, GlobalChatFailure | GlobalChatRateLimited, R>,
) =>
  Effect.catchTags(effect, {
    GlobalChatAccessDenied: emptyStatusResponse,
    GlobalChatNotFound: emptyStatusResponse,
    GlobalChatRateLimited: emptyStatusResponse,
    GlobalChatOperationError: (error) => Effect.die(error.cause),
  });

export const GlobalChatHandlers = HttpApiBuilder.group(
  LootlogApi,
  "globalChat",
  (handlers) =>
    handlers
      .handle("GlobalChatControllerGetWorlds", () =>
        declaredHttpFailure(
          withCaller((data, caller) => data.getWorlds(caller)),
        ),
      )
      .handle("GlobalChatControllerGetMessages", ({ query }) =>
        declaredHttpFailure(
          withCaller((data, caller) =>
            data.getMessages(
              caller,
              query.world,
              query.before === undefined ? undefined : Number(query.before),
            ),
          ),
        ),
      )
      .handle("GlobalChatControllerSendMessage", ({ payload }) =>
        declaredHttpFailure(
          withCaller((data, caller) => data.sendMessage(caller, payload)),
        ),
      )
      .handle("GlobalChatControllerDeleteMessage", ({ params, query }) =>
        declaredHttpFailure(
          withCaller((data, caller) =>
            data.deleteMessage(caller, query.world, params.messageId),
          ),
        ),
      )
      .handle("GlobalChatControllerPinMessage", ({ payload }) =>
        declaredHttpFailure(
          withCaller((data, caller) => data.pinMessage(caller, payload)),
        ),
      )
      .handle("GlobalChatControllerUnpinMessage", ({ query }) =>
        declaredHttpFailure(
          withCaller((data, caller) => data.unpinMessage(caller, query.world)),
        ),
      )
      .handle("GlobalChatControllerGetMutes", () =>
        declaredHttpFailure(
          withCaller((data, caller) => data.getMutes(caller)),
        ),
      )
      .handle("GlobalChatControllerMuteSender", ({ payload }) =>
        declaredHttpFailure(
          withCaller((data, caller) => data.muteSender(caller, payload)),
        ),
      )
      .handle("GlobalChatControllerUnmuteSender", ({ params }) =>
        declaredHttpFailure(
          withCaller((data, caller) =>
            data.unmuteSender(caller, params.muteId),
          ),
        ),
      )
      .handle("GlobalChatControllerUnmuteMessageSender", ({ params, query }) =>
        declaredHttpFailure(
          withCaller((data, caller) =>
            data.unmuteMessageSender(caller, query.world, params.messageId),
          ),
        ),
      ),
);
