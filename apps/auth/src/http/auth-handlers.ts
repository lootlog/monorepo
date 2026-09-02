import { Effect, Layer, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { AuthService, HttpResponseError } from "#src/auth/auth-service";
import { AuthApi } from "#src/http-api/auth-api.generated";

const NonEmptyTrimmedString = Schema.Trim.check(Schema.isMinLength(1));
export const IdpTokenRequest = Schema.Struct({
  userId: NonEmptyTrimmedString,
  discordId: NonEmptyTrimmedString,
});
const responseHeaders = (
  headers: Readonly<Record<string, string | undefined>>,
) => {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) result.set(name, value);
  }
  return result;
};

const requestHeaders = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) => responseHeaders(request.headers),
);

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, HttpResponseError, R>,
  success: (value: A) => HttpServerResponse.HttpServerResponse,
) =>
  effect.pipe(
    Effect.map(success),
    Effect.catchTag("HttpResponseError", (error) =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(error.body, { status: error.status }),
      ),
    ),
  );

const verify = Effect.fn("AuthController_verify")(function* () {
  const auth = yield* AuthService;
  const headers = yield* requestHeaders;
  const identity = yield* auth.verifyRequestIdentity({
    headers,
    authorizationHeader: headers.get("authorization") ?? undefined,
    authDiscordId: headers.get("x-auth-discord-id") ?? undefined,
    authUserId: headers.get("x-auth-user-id") ?? undefined,
    credentialPurpose: headers.get("x-lootlog-credential-purpose") ?? undefined,
    websocketOrigin: headers.get("x-lootlog-websocket-origin") ?? undefined,
  });
  return { identity, body: { status: "OK" as const } };
});

const issueRealtimeTicket = Effect.fn("AuthController_issueRealtimeTicket")(
  function* () {
    const auth = yield* AuthService;
    const headers = yield* requestHeaders;
    return yield* auth.createRealtimeTicket(
      headers,
      headers.get("origin") ?? undefined,
    );
  },
);

const getScopes = Effect.fn("AuthController_getScopes")(function* () {
  const auth = yield* AuthService;
  return yield* auth.getCurrentUserScopes(yield* requestHeaders);
});

const getIdpToken = Effect.fn("AuthController_getIdpToken")(function* () {
  const auth = yield* AuthService;
  const decoded = yield* HttpServerRequest.schemaBodyJson(IdpTokenRequest, {
    onExcessProperty: "error",
  }).pipe(
    Effect.mapError(
      () =>
        new HttpResponseError({
          status: 400,
          body: {
            message: "Validation failed",
            error: "Bad Request",
            statusCode: 400,
          },
        }),
    ),
  );
  return yield* auth.getIdpTokenResponse(decoded);
});

export const AuthHandlers = Layer.merge(
  HttpApiBuilder.group(AuthApi, "health", (handlers) =>
    handlers.handle("HealthzControllerHealthCheck", () => Effect.void),
  ),
  HttpApiBuilder.group(AuthApi, "auth", (handlers) =>
    handlers
      .handleRaw("AuthControllerVerify", () =>
        toHttpResponse(verify(), ({ body, identity }) =>
          HttpServerResponse.jsonUnsafe(body, {
            headers: {
              "X-Auth-Discord-Id": identity.discordId,
              "X-Auth-User-Id": identity.userId,
            },
          }),
        ),
      )
      .handleRaw("AuthControllerIssueRealtimeTicket", () =>
        toHttpResponse(issueRealtimeTicket(), (ticket) =>
          HttpServerResponse.jsonUnsafe(ticket, {
            status: 201,
            headers: { "cache-control": "no-store" },
          }),
        ),
      )
      .handleRaw("AuthControllerGetScopes", () =>
        toHttpResponse(getScopes(), (scopes) =>
          HttpServerResponse.jsonUnsafe(scopes),
        ),
      )
      .handleRaw("AuthControllerGetIdpToken", () =>
        toHttpResponse(getIdpToken(), (token) =>
          HttpServerResponse.jsonUnsafe(token),
        ),
      ),
  ),
);
