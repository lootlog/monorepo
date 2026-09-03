import { Effect, Layer } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { BearerSecurityMiddleware } from "../contracts/shared.js";
import {
  ForwardAuthIdentity,
  type ForwardAuthIdentityValue,
} from "./forward-auth-identity.js";

const USER_ID_HEADER = "x-auth-user-id";
const DISCORD_ID_HEADER = "x-auth-discord-id";

export const readForwardAuthIdentity = (
  headers: Readonly<Record<string, string | undefined>>,
): ForwardAuthIdentityValue | undefined => {
  const userId = headers[USER_ID_HEADER]?.trim();
  const discordId = headers[DISCORD_ID_HEADER]?.trim();

  if (!userId || !discordId) return undefined;

  return { userId, discordId };
};

export const forwardAuthMiddleware = BearerSecurityMiddleware.of({
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
