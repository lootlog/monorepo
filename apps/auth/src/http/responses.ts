import { Effect } from "effect";
import { HttpEffect, HttpServerRequest, HttpServerResponse } from "effect/http";
import {
  type ApplicationError,
  applicationErrorHttpResponse,
} from "@lootlog/protocol/http/errors";

/** Every request header, including the cookie and API key the contract omits. */
export const requestHeaders = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) =>
    new Headers(
      Object.entries(request.headers).flatMap(([name, value]) =>
        value === undefined ? [] : [[name, value]],
      ),
    ),
);

/** Answers an `ApplicationError` with its status and the shared error body. */
export const respond = <A, R>(effect: Effect.Effect<A, ApplicationError, R>) =>
  Effect.catchTag(effect, "ApplicationError", applicationErrorHttpResponse);

/** Keeps credentials and per-user answers out of shared caches. */
export const noStore = HttpEffect.appendPreResponseHandler(
  (_request, response) =>
    Effect.succeed(
      HttpServerResponse.setHeader(response, "cache-control", "no-store"),
    ),
);
