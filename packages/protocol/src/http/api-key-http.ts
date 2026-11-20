import { API_KEY_ACCESS_HEADER } from "@lootlog/schema/api-key-access";
import {
  apiKeyAllowsOperation,
  readForwardAuthIdentity,
} from "@lootlog/schema/api-key-policy";
import { Context, Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
import { HttpApiMiddleware, HttpApiSchema, OpenApi } from "effect/http-api";
import { HttpErrorResponse, HttpStatus, httpErrorResponse } from "./errors.js";

// 429 documents the key's rate limit, which forward authentication enforces
// before the request reaches the service.
const ApiKeyHttpErrors = [
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.TOO_MANY_REQUESTS,
].map((status) => HttpErrorResponse.pipe(HttpApiSchema.status(status)));

/** Additional credential restrictions; ordinary session authorization remains with each service. */
export class ApiKeyEndpointPolicy extends HttpApiMiddleware.Service<ApiKeyEndpointPolicy>()(
  "@lootlog/protocol/ApiKeyEndpointPolicy",
  { error: ApiKeyHttpErrors },
) {}

export const apiKeyEndpointPolicyLayer = (service: string) =>
  Layer.succeed(
    ApiKeyEndpointPolicy,
    ApiKeyEndpointPolicy.of((httpEffect, { endpoint }) =>
      Effect.flatMap(HttpServerRequest.HttpServerRequest, ({ headers }) => {
        // Without an API key assertion this is a session; services authorize it.
        if (!headers[API_KEY_ACCESS_HEADER]) return httpEffect;
        const access = readForwardAuthIdentity(headers)?.apiKey;

        if (access === undefined) {
          return Effect.succeed(
            httpErrorResponse(HttpStatus.UNAUTHORIZED, {
              code: "AUTHENTICATION_REQUIRED",
              message: "Unauthorized",
            }),
          );
        }

        const operation = Context.getOrElse(
          endpoint.annotations,
          OpenApi.Identifier,
          () => endpoint.identifier,
        );

        if (!apiKeyAllowsOperation(access, service, operation)) {
          return Effect.succeed(
            httpErrorResponse(HttpStatus.FORBIDDEN, {
              code: "API_KEY_ACCESS_DENIED",
              message: "API key access denied",
            }),
          );
        }

        return httpEffect;
      }),
    ),
  );
