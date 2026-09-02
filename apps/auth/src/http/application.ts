import { Effect, Schema } from "effect";
import { AuthService, HttpResponseError } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/better-auth";

const NonEmptyTrimmedString = Schema.Trim.check(Schema.isMinLength(1));

export const IdpTokenRequest = Schema.Struct({
  userId: NonEmptyTrimmedString,
  discordId: NonEmptyTrimmedString,
});

const decodeIdpTokenRequest = Schema.decodeUnknownEffect(IdpTokenRequest, {
  onExcessProperty: "error",
});

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  Response.json(body, init);

const getOptionalHeader = (headers: Headers, name: string) => {
  const value = headers.get(name);
  return value === null ? undefined : value;
};

export const normalizeBetterAuthRequest = (request: Request): Request => {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (!forwardedProtocol) {
    return request;
  }

  const url = new URL(request.url);
  url.protocol = `${forwardedProtocol}:`;

  return new Request(url, request);
};

const requestBody = Effect.fn("AuthHttp.requestBody")((request: Request) =>
  Effect.tryPromise({
    try: () => request.json() as Promise<unknown>,
    catch: () =>
      new HttpResponseError({
        status: 400,
        body: {
          message: "Invalid request body",
          error: "Bad Request",
          statusCode: 400,
        },
      }),
  }),
);

const routeNotFound = (request: Request) =>
  new HttpResponseError({
    status: 404,
    body: {
      message: `Cannot ${request.method} ${new URL(request.url).pathname}`,
      error: "Not Found",
      statusCode: 404,
    },
  });

export const handleAuthRequest = Effect.fn("AuthHttp.handleRequest")(
  function* (request: Request) {
    const authService = yield* AuthService;
    const auth = yield* BetterAuthRuntime;
    const url = new URL(request.url);

    if (url.pathname === "/idp" || url.pathname.startsWith("/idp/")) {
      return yield* Effect.tryPromise({
        try: () => auth.handler(normalizeBetterAuthRequest(request)),
        catch: () =>
          new HttpResponseError({
            status: 500,
            body: { message: "Internal server error" },
          }),
      });
    }

    if (url.pathname === "/healthz") {
      if (request.method !== "GET") {
        return yield* routeNotFound(request);
      }

      return jsonResponse({ status: "ok" });
    }

    if (url.pathname === "/auth/verify") {
      if (request.method !== "GET") {
        return yield* routeNotFound(request);
      }

      const identity = yield* authService.verifyRequestIdentity({
        headers: request.headers,
        authorizationHeader: getOptionalHeader(
          request.headers,
          "authorization",
        ),
        authDiscordId: getOptionalHeader(request.headers, "x-auth-discord-id"),
        authUserId: getOptionalHeader(request.headers, "x-auth-user-id"),
        credentialPurpose: getOptionalHeader(
          request.headers,
          "x-lootlog-credential-purpose",
        ),
        websocketOrigin: getOptionalHeader(
          request.headers,
          "x-lootlog-websocket-origin",
        ),
      });
      const response = jsonResponse({ status: "OK" });
      response.headers.set("X-Auth-Discord-Id", identity.discordId);
      response.headers.set("X-Auth-User-Id", identity.userId);
      return response;
    }

    if (url.pathname === "/auth/realtime-ticket") {
      if (request.method !== "POST") {
        return yield* routeNotFound(request);
      }
      const ticket = yield* authService.createRealtimeTicket(
        request.headers,
        getOptionalHeader(request.headers, "origin"),
      );
      return jsonResponse(ticket, {
        status: 201,
        headers: { "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/auth/@me/scopes") {
      if (request.method !== "GET") {
        return yield* routeNotFound(request);
      }

      const scopes = yield* authService.getCurrentUserScopes(request.headers);
      return jsonResponse(scopes);
    }

    if (url.pathname === "/auth/idp-token") {
      if (request.method !== "POST") {
        return yield* routeNotFound(request);
      }

      const input = yield* requestBody(request);
      const decoded = yield* decodeIdpTokenRequest(input).pipe(
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
      const token = yield* authService.getIdpTokenResponse(decoded);
      return jsonResponse(token);
    }

    return yield* routeNotFound(request);
  },
  Effect.catchTag("HttpResponseError", (error) =>
    Effect.succeed(jsonResponse(error.body, { status: error.status })),
  ),
  Effect.withSpan("AuthHttp.request", {
    attributes: { service: "auth" },
  }),
);
