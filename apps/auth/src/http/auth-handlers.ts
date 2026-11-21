import { Effect, Layer } from "effect";
import {
  Cookies,
  HttpEffect,
  HttpMiddleware,
  HttpServerResponse,
} from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import {
  applicationErrorHttpResponse,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";
import { AuthService } from "#src/auth/auth-service";
import { AuthApi } from "#src/http-api/auth-api";
import { noStore, requestHeaders, respond } from "./responses.js";
import {
  API_KEY_ACCESS_HEADER,
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";
import {
  AUTH_ROLES_HEADER,
  formatPlatformRoles,
} from "@lootlog/schema/platform-roles";

const verify = Effect.fn("AuthController_verify")(function* () {
  const auth = yield* AuthService;
  const headers = yield* requestHeaders;

  const { identity, setCookie } = yield* auth.verifyRequestIdentity({
    headers,
    authorizationHeader: headers.get("authorization") ?? undefined,
    authDiscordId: headers.get(AUTH_DISCORD_ID_HEADER) ?? undefined,
    authUserId: headers.get(AUTH_USER_ID_HEADER) ?? undefined,
  });

  // Traefik copies these headers onto the request it forwards.
  yield* HttpEffect.appendPreResponseHandler((_request, response) => {
    const withIdentity = HttpServerResponse.setHeaders(response, {
      [AUTH_DISCORD_ID_HEADER]: identity.discordId,
      [AUTH_USER_ID_HEADER]: identity.userId,
      [AUTH_ROLES_HEADER]: formatPlatformRoles(identity.roles ?? []),
      [API_KEY_ACCESS_HEADER]: identity.apiKeyAccess
        ? JSON.stringify(identity.apiKeyAccess)
        : "",
    });

    return Effect.succeed(
      setCookie.length === 0
        ? withIdentity
        : HttpServerResponse.mergeCookies(
            withIdentity,
            Cookies.fromSetCookie(setCookie),
          ),
    );
  });

  return { status: "OK" as const };
});

const getScopes = Effect.fn("AuthController_getScopes")(function* () {
  const auth = yield* AuthService;

  return yield* auth.getCurrentUserScopes(yield* requestHeaders);
});

export const AuthHandlers = Layer.merge(
  HttpApiBuilder.group(AuthApi, "health", (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
  ),
  HttpApiBuilder.group(AuthApi, "auth", (handlers) =>
    handlers
      .handle("AuthControllerVerify", () =>
        respond(verify()).pipe(
          // Traefik calls this once per proxied request; a log line per
          // answer tells nothing and dominated the service's log volume. A
          // defect still fails the handler and is logged.
          Effect.tap(() => HttpMiddleware.withLoggerDisabled(Effect.void)),
        ),
      )
      .handle("AuthControllerGetScopes", () =>
        getScopes().pipe(
          Effect.catchTags({
            ApplicationError: applicationErrorHttpResponse,
            ReauthenticationRequired: reauthenticationRequiredResponse,
          }),
        ),
      )
      .handle("AuthControllerGetIdpToken", ({ payload, headers }) =>
        Effect.gen(function* () {
          const auth = yield* AuthService;
          yield* noStore;

          return yield* respond(
            auth.getIdpTokenResponse(payload, headers.authorization),
          );
        }),
      ),
  ),
);
