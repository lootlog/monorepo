import { emptyStatusResponse } from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import type {
  GlobalChatMessageResponse,
  GlobalChatMessagesResponse,
  SendGlobalChatMessageRequest,
} from "#src/contracts/global-chat/schemas";
import { LootlogApi } from "../../lootlog-api.js";

export type GlobalChatCaller = {
  readonly userId: string;
  readonly discordId: string;
};

/** The caller is not an active Member of any active Organization. */
export class GlobalChatAccessDenied extends TaggedErrorClass<GlobalChatAccessDenied>()(
  "GlobalChatAccessDenied",
  { status: Schema.Literal(403) },
) {}

export class GlobalChatRateLimited extends TaggedErrorClass<GlobalChatRateLimited>()(
  "GlobalChatRateLimited",
  { status: Schema.Literal(429) },
) {}

export class GlobalChatOperationError extends TaggedErrorClass<GlobalChatOperationError>()(
  "GlobalChatOperationError",
  { cause: Schema.Defect() },
) {}

export class GlobalChatIdentity extends Context.Service<
  GlobalChatIdentity,
  { readonly caller: Effect.Effect<GlobalChatCaller> }
>()("@lootlog/api/http-api/global-chat/identity") {}

export class GlobalChatData extends Context.Service<
  GlobalChatData,
  {
    readonly getMessages: (
      caller: GlobalChatCaller,
      before: number | undefined,
    ) => Effect.Effect<
      GlobalChatMessagesResponse,
      GlobalChatAccessDenied | GlobalChatOperationError
    >;
    readonly sendMessage: (
      caller: GlobalChatCaller,
      payload: SendGlobalChatMessageRequest,
    ) => Effect.Effect<
      GlobalChatMessageResponse,
      GlobalChatAccessDenied | GlobalChatRateLimited | GlobalChatOperationError
    >;
  }
>()("@lootlog/api/http-api/global-chat/data") {}

const caller = Effect.flatMap(
  GlobalChatIdentity,
  (identity) => identity.caller,
);

export const getGlobalChatMessages = Effect.fn("getGlobalChatMessages")(
  function* (before: string | undefined) {
    const authenticated = yield* caller;
    const data = yield* GlobalChatData;

    return yield* data.getMessages(
      authenticated,
      before === undefined ? undefined : Number(before),
    );
  },
);

export const sendGlobalChatMessage = Effect.fn("sendGlobalChatMessage")(
  function* (payload: SendGlobalChatMessageRequest) {
    const authenticated = yield* caller;
    const data = yield* GlobalChatData;

    return yield* data.sendMessage(authenticated, payload);
  },
);

const declaredHttpFailure = <A, R>(
  effect: Effect.Effect<
    A,
    GlobalChatAccessDenied | GlobalChatRateLimited | GlobalChatOperationError,
    R
  >,
) =>
  Effect.catchTags(effect, {
    GlobalChatAccessDenied: emptyStatusResponse,
    GlobalChatRateLimited: emptyStatusResponse,
    GlobalChatOperationError: (error) => Effect.die(error.cause),
  });

export const GlobalChatHandlers = HttpApiBuilder.group(
  LootlogApi,
  "globalChat",
  (handlers) =>
    handlers
      .handle("GlobalChatControllerGetMessages", ({ query }) =>
        declaredHttpFailure(getGlobalChatMessages(query.before)),
      )
      .handle("GlobalChatControllerSendMessage", ({ payload }) =>
        declaredHttpFailure(sendGlobalChatMessage(payload)),
      ),
);
