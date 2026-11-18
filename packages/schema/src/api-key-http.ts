import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiMiddleware, HttpApiSchema, OpenApi } from "effect/http-api";
import { API_KEY_ACCESS_HEADER } from "./api-key-access.js";
import {
  apiKeyAllowsOperation,
  readForwardAuthIdentity,
} from "./api-key-policy.js";

const ApiKeyHttpErrors = [401, 403, 429].map((status) =>
  Schema.Struct({ message: Schema.String }).pipe(HttpApiSchema.status(status)),
);

/** Additional credential restrictions; ordinary session authorization remains with each service. */
export class ApiKeyEndpointPolicy extends HttpApiMiddleware.Service<ApiKeyEndpointPolicy>()(
  "@lootlog/schema/ApiKeyEndpointPolicy",
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
            HttpServerResponse.jsonUnsafe(
              { message: "Unauthorized" },
              { status: 401 },
            ),
          );
        }

        const operation = Context.getOrElse(
          endpoint.annotations,
          OpenApi.Identifier,
          () => endpoint.identifier,
        );

        if (!apiKeyAllowsOperation(access, service, operation)) {
          return Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { message: "API key access denied" },
              { status: 403 },
            ),
          );
        }

        return httpEffect;
      }),
    ),
  );
