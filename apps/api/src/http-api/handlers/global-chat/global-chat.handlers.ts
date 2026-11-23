import type { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  type GlobalChatCaller,
  GlobalChatRateLimited,
  type GlobalChatFailure,
  GlobalChatData,
} from "#src/global-chat/global-chat-data";
import { statusCodeResponse } from "#src/shared/http/handler-response";

import { Context, Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { LootlogApi } from "../../lootlog-api.js";

export class GlobalChatIdentity extends Context.Service<
  GlobalChatIdentity,
  {
    readonly caller: Effect.Effect<
      GlobalChatCaller,
      never,
      ForwardAuthIdentity
    >;
  }
>()("@lootlog/api/http-api/global-chat/identity") {}

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
    GlobalChatAccessDenied: statusCodeResponse,
    GlobalChatNotFound: statusCodeResponse,
    GlobalChatRateLimited: statusCodeResponse,
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
