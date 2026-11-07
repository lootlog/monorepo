import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";
import { matchesServiceSecret } from "@lootlog/protocol/http/service-auth";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiMiddleware, HttpApiSchema, OpenApi } from "effect/http-api";
import { CatalogConfig } from "#src/config/catalog-config";

const PUBLIC_OPERATIONS = new Set(["HealthzController_healthCheck"]);

/**
 * Every catalog read needs a caller: a signed-in User or an API key, which
 * the edge's forward authentication turns into identity headers, or a
 * service holding the catalog token. The edge strips identity headers it did
 * not set, so a request without either reached the service some other way.
 */
export class CatalogAccess extends HttpApiMiddleware.Service<CatalogAccess>()(
  "@lootlog/catalog/CatalogAccess",
  {
    error: Schema.Struct({ message: Schema.String }).pipe(
      HttpApiSchema.status(401),
    ),
  },
) {
  static readonly layer = Layer.effect(
    CatalogAccess,
    Effect.map(CatalogConfig, ({ serviceToken }) =>
      CatalogAccess.of((httpEffect, { endpoint }) =>
        Effect.flatMap(HttpServerRequest.HttpServerRequest, ({ headers }) => {
          const operation = Context.getOrElse(
            endpoint.annotations,
            OpenApi.Identifier,
            () => endpoint.identifier,
          );

          if (
            PUBLIC_OPERATIONS.has(operation) ||
            matchesServiceSecret(
              headers[CATALOG_SERVICE_TOKEN_HEADER],
              serviceToken,
            ) ||
            headers["x-auth-user-id"]
          ) {
            return httpEffect;
          }

          return Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { message: "Unauthorized" },
              { status: 401 },
            ),
          );
        }),
      ),
    ),
  );
}
