import { BunHttpServer } from "@effect/platform-bun";
import { httpServerMetrics } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  BetterAuthRuntime,
  type LootlogAuth,
} from "#src/auth/provider/better-auth";
import { BETTER_AUTH_INTERNAL_PATH } from "#src/auth/provider/better-auth-url";
import { AppConfig } from "#src/config/env";
import { AuthApi } from "#src/http-api/auth-api";
import { normalizeBetterAuthRequest } from "./application.js";
import { AuthHandlers } from "./auth-handlers.js";

const makeBetterAuthHandler = (auth: LootlogAuth) =>
  Effect.fn("BetterAuth.rawHandler")(
    function* (request: HttpServerRequest.HttpServerRequest) {
      const webRequest = yield* HttpServerRequest.toWeb(request);
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
// oxlint-disable-next-line react-hooks/rules-of-hooks -- Effect router constructor, not React.
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
  HttpApiBuilder.layer(AuthApi, { openapiPath: "/openapi.json" }).pipe(
    Layer.provide(AuthHandlers),
  ),
  BetterAuthRawRoutes,
);

export const AuthHttpServer = Layer.unwrap(
  Effect.map(AppConfig, ({ port }) =>
    HttpRouter.serve(AuthRoutes, { middleware: httpServerMetrics }).pipe(
      Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port })),
    ),
  ),
).pipe(Layer.provide(AppConfig.layer));
