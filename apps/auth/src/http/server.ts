import { AdminHandlers } from "./admin-handlers.js";
import { ApiKeyHandlers } from "./api-key-handlers.js";
import {
  serviceApiRoutes,
  serviceHttpServer,
} from "@lootlog/instrumentation/service";
import { Effect, Layer } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { BETTER_AUTH_INTERNAL_PATH } from "#src/auth/provider/better-auth-url";
import { AppConfig } from "#src/config/env";
import { AuthApi } from "#src/http-api/auth-api";
import { normalizeBetterAuthRequest } from "./application.js";
import { AuthHandlers } from "./auth-handlers.js";
import { SchemaErrorResponseLive } from "@lootlog/protocol/http/schema-error-response";

const makeBetterAuthHandler = (auth: typeof BetterAuthRuntime.Service) =>
  Effect.fn("BetterAuth.rawHandler")(
    function* (request: HttpServerRequest.HttpServerRequest) {
      const webRequest = yield* HttpServerRequest.toWeb(request);

      const { pathname } = new URL(webRequest.url);

      // The admin plugin enforces bans; its endpoints would let anyone holding
      // the `admin` role impersonate Users, so only the admin API manages them.
      if (
        pathname.includes("/api-key/") ||
        pathname.startsWith(`${BETTER_AUTH_INTERNAL_PATH}/admin/`)
      )
        return HttpServerResponse.empty({ status: 404 });

      const response = yield* Effect.tryPromise({
        try: () =>
          auth.handler(
            normalizeBetterAuthRequest(webRequest, auth.options.baseURL),
          ),
        catch: (cause) => cause,
      });

      return HttpServerResponse.fromWeb(response);
    },
    Effect.catchCause(() =>
      Effect.logError("Better Auth raw handler failed").pipe(
        Effect.as(
          HttpServerResponse.jsonUnsafe(
            { message: "Internal server error" },
            { status: 500 },
          ),
        ),
      ),
    ),
  );

const betterAuthMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;

const BetterAuthRawRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const auth = yield* BetterAuthRuntime;
    const handler = makeBetterAuthHandler(auth);
    yield* router.addAll(
      betterAuthMethods.map((method) =>
        HttpRouter.route(method, `${BETTER_AUTH_INTERNAL_PATH}/*`, handler),
      ),
    );
  }),
);

export const AuthRoutes = Layer.merge(
  serviceApiRoutes(AuthApi).pipe(
    Layer.provide(Layer.mergeAll(AuthHandlers, ApiKeyHandlers, AdminHandlers)),
    Layer.provide(SchemaErrorResponseLive),
  ),
  BetterAuthRawRoutes,
);

// Traefik's forwardAuth calls /auth/verify once per proxied request. Its spans
// carry no information and outnumber every other trace in the platform.
const TracingLive = HttpMiddleware.layerTracerDisabledForUrls(["/auth/verify"]);

export const AuthHttpServer = Layer.unwrap(
  Effect.map(AppConfig, ({ port }) =>
    serviceHttpServer({ routes: AuthRoutes, port }).pipe(
      Layer.provide(TracingLive),
    ),
  ),
).pipe(Layer.provide(AppConfig.layer));
