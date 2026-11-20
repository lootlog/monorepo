import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";
import { matchesServiceSecret } from "@lootlog/protocol/http/service-auth";
import {
  HttpErrorResponse,
  HttpStatus,
  httpErrorResponse,
} from "@lootlog/protocol/http/errors";
import { readForwardAuthIdentity } from "@lootlog/schema/api-key-policy";
import { Context, Effect, Layer } from "effect";
import { HttpServerRequest } from "effect/http";
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
    error: HttpErrorResponse.pipe(
      HttpApiSchema.status(HttpStatus.UNAUTHORIZED),
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
            readForwardAuthIdentity(headers) !== undefined
          ) {
            return httpEffect;
          }

          return Effect.succeed(
            httpErrorResponse(HttpStatus.UNAUTHORIZED, {
              code: "AUTHENTICATION_REQUIRED",
              message: "Unauthorized",
            }),
          );
        }),
      ),
    ),
  );
}
