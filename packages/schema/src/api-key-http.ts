import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import {
  HttpApiMiddleware,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { apiKeyAllowsOperation, readApiKeyAccess } from "./api-key-policy.js";

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
        const access = readApiKeyAccess(headers);

        if (access === undefined) return httpEffect;

        if (
          access === null ||
          !headers["x-auth-user-id"] ||
          !headers["x-auth-discord-id"]
        ) {
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
