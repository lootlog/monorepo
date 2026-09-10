import { Effect } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  ApiKeyService,
  ApiKeyStatusRequest,
  CreateApiKey,
  RenameApiKey,
} from "#src/auth/api-key-service";
import { HttpResponseError } from "#src/auth/auth-service";
import { AuthApi } from "#src/http-api/auth-api";

const headers = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) =>
    new Headers(
      Object.entries(request.headers).flatMap(([name, value]) =>
        value === undefined ? [] : [[name, value]],
      ),
    ),
);
const respond = <A, R>(effect: Effect.Effect<A, HttpResponseError, R>) =>
  effect.pipe(
    Effect.map((body) =>
      HttpServerResponse.jsonUnsafe(body, {
        headers: { "cache-control": "no-store" },
      }),
    ),
    Effect.catchTag("HttpResponseError", ({ status, body }) =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(body, {
          status,
          headers: { "cache-control": "no-store" },
        }),
      ),
    ),
  );
const invalid = () =>
  new HttpResponseError({
    status: 400,
    body: { message: "Invalid API key request" },
  });

export const ApiKeyHandlers = HttpApiBuilder.group(
  AuthApi,
  "apiKeys",
  (handlers) =>
    handlers
      .handleRaw("ListApiKeys", () =>
        respond(
          Effect.gen(function* () {
            const service = yield* ApiKeyService;
            return yield* service.list(
              yield* service.session(yield* headers, false),
            );
          }),
        ),
      )
      .handleRaw("CreateApiKey", () =>
        respond(
          Effect.gen(function* () {
            const service = yield* ApiKeyService;
            const userId = yield* service.session(yield* headers);
            const payload = yield* HttpServerRequest.schemaBodyJson(
              CreateApiKey,
              { onExcessProperty: "error" },
            ).pipe(Effect.mapError(invalid));
            return yield* service.create(userId, payload);
          }),
        ),
      )
      .handleRaw("RenameApiKey", ({ params }) =>
        respond(
          Effect.gen(function* () {
            const service = yield* ApiKeyService;
            const userId = yield* service.session(yield* headers);
            const payload = yield* HttpServerRequest.schemaBodyJson(
              RenameApiKey,
              { onExcessProperty: "error" },
            ).pipe(Effect.mapError(invalid));
            return yield* service.rename(userId, params.id, payload.name);
          }),
        ),
      )
      .handleRaw("DeleteApiKey", ({ params }) =>
        respond(
          Effect.gen(function* () {
            const service = yield* ApiKeyService;
            return yield* service.remove(
              yield* service.session(yield* headers),
              params.id,
            );
          }),
        ),
      )
      .handleRaw("ApiKeyStatuses", () =>
        respond(
          Effect.gen(function* () {
            const service = yield* ApiKeyService;
            const payload = yield* HttpServerRequest.schemaBodyJson(
              ApiKeyStatusRequest,
              { onExcessProperty: "error" },
            ).pipe(Effect.mapError(invalid));
            return yield* service.statuses(yield* headers, payload.keyIds);
          }),
        ),
      ),
);
