import { Effect } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import type { ApplicationError } from "@lootlog/protocol/http/errors";
import { ApiKeyService } from "#src/auth/api-key-service";
import { AuthApi } from "#src/http-api/auth-api";
import { noStore, requestHeaders, respond } from "./responses.js";

const apiKeys = <A>(
  run: (
    service: typeof ApiKeyService.Service,
    headers: Headers,
  ) => Effect.Effect<A, ApplicationError>,
) =>
  respond(
    Effect.gen(function* () {
      yield* noStore;
      const service = yield* ApiKeyService;

      return yield* run(service, yield* requestHeaders);
    }),
  );

export const ApiKeyHandlers = HttpApiBuilder.group(
  AuthApi,
  "apiKeys",
  (handlers) =>
    handlers
      .handle("ListApiKeys", () =>
        apiKeys((service, headers) =>
          Effect.flatMap(service.session(headers, false), service.list),
        ),
      )
      .handle("CreateApiKey", ({ payload }) =>
        apiKeys((service, headers) =>
          Effect.flatMap(service.session(headers), (userId) =>
            service.create(userId, payload),
          ),
        ),
      )
      .handle("RenameApiKey", ({ params, payload }) =>
        apiKeys((service, headers) =>
          Effect.flatMap(service.session(headers), (userId) =>
            service.rename(userId, params.id, payload.name),
          ),
        ),
      )
      .handle("DeleteApiKey", ({ params }) =>
        apiKeys((service, headers) =>
          Effect.flatMap(service.session(headers), (userId) =>
            service.remove(userId, params.id),
          ),
        ),
      )
      .handle("ApiKeyStatuses", ({ payload }) =>
        apiKeys((service, headers) =>
          service.statuses(headers, payload.keyIds),
        ),
      ),
);
