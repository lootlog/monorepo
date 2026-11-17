import { Effect, Layer } from "effect";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";

const forwardAuthMiddleware = BearerSecurityMiddleware.of({
  bearer: (httpEffect) =>
    Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
      const identity = readForwardAuthIdentity(request.headers);

      if (identity === undefined) {
        return Effect.succeed(HttpServerResponse.empty({ status: 401 }));
      }

      return Effect.provideService(httpEffect, ForwardAuthIdentity, identity);
    }),
});

export const ForwardAuthMiddlewareLive = Layer.succeed(
  BearerSecurityMiddleware,
  forwardAuthMiddleware,
);
