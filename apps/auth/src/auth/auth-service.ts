import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import {
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
} from "effect";
import { AppConfig } from "#src/config/env";
import { AuthDatabase } from "#src/database/drizzle";
import { authAccounts } from "#src/database/drizzle.schema";
import { AuthRedisStorage } from "./auth-redis-storage.js";
import {
  BetterAuthRuntime,
  type AppUserSession,
  type LootlogAuth,
} from "./better-auth.js";
import {
  consumeRealtimeTicket,
  issueRealtimeTicket,
  type RealtimeTicketRedis,
} from "./realtime-ticket.js";

export interface VerifiedIdentity {
  readonly userId: string;
  readonly discordId: string;
}

export interface AccessTokenRequest {
  readonly userId: string;
  readonly discordId: string;
}

export interface IdpTokenResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly scopes: ReadonlyArray<string>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class HttpResponseError extends Schema.TaggedError<HttpResponseError>()(
  "HttpResponseError",
  {
    status: Schema.Int,
    body: Schema.Unknown,
  },
) {}

type AccessTokenPayload = Awaited<
  ReturnType<LootlogAuth["api"]["getAccessToken"]>
>;
type DiscordAccessTokenPayload = AccessTokenPayload & { accessToken: string };

const hasDiscordAccessToken = (
  token: AccessTokenPayload,
): token is DiscordAccessTokenPayload =>
  Predicate.isObject(token) &&
  Predicate.isString(token.accessToken) &&
  token.accessToken.length > 0;

const unauthorized = (
  body: unknown = {
    message: "Unauthorized",
    statusCode: 401,
  },
) => new HttpResponseError({ status: 401, body });

const internalServerError = (body: unknown) =>
  new HttpResponseError({ status: 500, body });

const parseExpiresAt = (input: unknown): Option.Option<DateTime.Utc> => {
  if (
    !Predicate.isString(input) &&
    !Predicate.isNumber(input) &&
    !(input instanceof Date)
  ) {
    return Option.none();
  }

  return DateTime.make(input);
};

export const normalizeScopes = (scopes: unknown): ReadonlyArray<string> => {
  if (globalThis.Array.isArray(scopes)) {
    return scopes.filter(Predicate.isString);
  }

  if (Predicate.isString(scopes)) {
    return scopes.split(/\s+/).filter(Boolean);
  }

  return [];
};

export const createAuthService = ({
  auth,
  appUrl,
  findDiscordAccountId,
  realtimeTicketRedis,
}: {
  readonly auth: LootlogAuth;
  readonly appUrl: string;
  readonly findDiscordAccountId: (
    request: AccessTokenRequest,
  ) => Effect.Effect<string | null, unknown>;
  readonly realtimeTicketRedis: RealtimeTicketRedis;
}) => {
  const getSession = Effect.fn("AuthService.getSession")((headers: Headers) =>
    Effect.tryPromise({
      try: () => auth.api.getSession({ headers }),
      catch: () => internalServerError({ message: "Internal server error" }),
    }),
  );

  const validateBearerToken = Effect.fn("AuthService.validateBearerToken")(
    function* (token: string) {
      const jwks = yield* Effect.tryPromise({
        try: () => auth.api.getJwks(),
        catch: (cause) => cause,
      }).pipe(Effect.catch(() => Effect.succeed(null)));

      if (!jwks) {
        return null;
      }

      return yield* Effect.tryPromise({
        try: async () => {
          const { payload } = await jwtVerify(
            token,
            createLocalJWKSet(jwks as JSONWebKeySet),
            { issuer: appUrl, audience: appUrl },
          );

          if (
            !Predicate.isString(payload.sub) ||
            !Predicate.isString(payload.discordId)
          ) {
            return null;
          }

          return {
            userId: payload.sub,
            discordId: payload.discordId,
          } satisfies VerifiedIdentity;
        },
        catch: (cause) => cause,
      }).pipe(Effect.catch(() => Effect.succeed(null)));
    },
  );

  const buildVerifiedIdentityFromRequest = Effect.fn(
    "AuthService.buildVerifiedIdentityFromRequest",
  )(function* (session: AppUserSession | null, authorizationHeader?: string) {
    if (session) {
      return {
        userId: session.user.id,
        discordId: session.user.discordId,
      } satisfies VerifiedIdentity;
    }

    if (!authorizationHeader) {
      return null;
    }

    const token = authorizationHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return null;
    }

    return yield* validateBearerToken(token);
  });

  const verifyRequestIdentity = Effect.fn("AuthService.verifyRequestIdentity")(
    function* ({
      headers,
      authorizationHeader,
      authDiscordId,
      authUserId,
      credentialPurpose,
      websocketOrigin,
    }: {
      readonly headers: Headers;
      readonly authorizationHeader?: string;
      readonly authDiscordId?: string;
      readonly authUserId?: string;
      readonly credentialPurpose?: string;
      readonly websocketOrigin?: string;
    }) {
      if (authDiscordId || authUserId) {
        return yield* unauthorized();
      }

      if (credentialPurpose === "websocket-ticket") {
        const ticket = authorizationHeader?.replace(/^Bearer\s+/i, "");
        if (!ticket || !websocketOrigin) return yield* unauthorized();
        const identity = yield* Effect.tryPromise({
          try: () =>
            consumeRealtimeTicket(realtimeTicketRedis, ticket, websocketOrigin),
          catch: () => unauthorized(),
        });
        if (!identity) return yield* unauthorized();
        return identity;
      }

      const session = yield* getSession(headers);
      const verifiedIdentity = yield* buildVerifiedIdentityFromRequest(
        session,
        authorizationHeader,
      );

      if (!verifiedIdentity) {
        return yield* unauthorized();
      }

      return verifiedIdentity;
    },
  );

  const getDiscordAccessToken = Effect.fn("AuthService.getDiscordAccessToken")(
    function* (request: AccessTokenRequest) {
      const accountId = yield* findDiscordAccountId(request);
      if (accountId === null) {
        return yield* Effect.fail(
          new APIError("BAD_REQUEST", { code: "ACCOUNT_NOT_FOUND" }),
        );
      }

      return yield* Effect.tryPromise({
        try: () =>
          auth.api.getAccessToken({
            body: {
              userId: request.userId,
              accountId,
            },
          }),
        catch: (cause) => cause,
      });
    },
  );

  const getRequiredSession = Effect.fn("AuthService.getRequiredSession")(
    function* (headers: Headers) {
      const session = yield* getSession(headers);

      if (!session) {
        return yield* unauthorized();
      }

      return session;
    },
  );

  const createRealtimeTicket = Effect.fn("AuthService.createRealtimeTicket")(
    function* (headers: Headers, origin: string | undefined) {
      if (!origin) return yield* unauthorized();
      const session = yield* getRequiredSession(headers);
      return yield* Effect.tryPromise({
        try: () =>
          issueRealtimeTicket(
            realtimeTicketRedis,
            { userId: session.user.id, discordId: session.user.discordId },
            origin,
          ),
        catch: () =>
          new HttpResponseError({
            status: 503,
            body: { message: "Realtime ticket service unavailable" },
          }),
      });
    },
  );

  const getDiscordAccessTokenOrThrow = Effect.fn(
    "AuthService.getDiscordAccessTokenOrThrow",
  )(function* (
    request: AccessTokenRequest,
    errors: {
      readonly missing: HttpResponseError;
      readonly expired: HttpResponseError;
    },
  ) {
    const token = yield* getDiscordAccessToken(request);

    if (!hasDiscordAccessToken(token)) {
      return yield* errors.missing;
    }

    const now = yield* DateTime.now;
    const expiresAt = parseExpiresAt(token.accessTokenExpiresAt);

    if (
      Option.isSome(expiresAt) &&
      DateTime.toEpochMillis(expiresAt.value) < DateTime.toEpochMillis(now)
    ) {
      return yield* errors.expired;
    }

    return token;
  });

  const getCurrentUserScopes = Effect.fn("AuthService.getCurrentUserScopes")(
    function* (headers: Headers) {
      const session = yield* getRequiredSession(headers);

      const result = yield* Effect.result(
        getDiscordAccessTokenOrThrow(
          {
            userId: session.user.id,
            discordId: session.user.discordId,
          },
          {
            missing: new HttpResponseError({
              status: 400,
              body: { error: "Failed to retrieve IDP token" },
            }),
            expired: unauthorized({
              error: "IDP token has expired. Please reconnect your account.",
            }),
          },
        ),
      );

      if (result._tag === "Failure") {
        const error = result.failure;

        if (error instanceof HttpResponseError) {
          return yield* error;
        }

        if (error instanceof APIError) {
          return yield* new HttpResponseError({
            status: typeof error.status === "number" ? error.status : 500,
            body: { error: error.message },
          });
        }

        return yield* internalServerError({
          error: "Failed to retrieve IDP token",
        });
      }

      return normalizeScopes(result.success.scopes);
    },
  );

  const getIdpTokenResponse = Effect.fn("AuthService.getIdpTokenResponse")(
    function* (request: AccessTokenRequest) {
      const result = yield* Effect.result(
        getDiscordAccessTokenOrThrow(request, {
          missing: new HttpResponseError({
            status: 400,
            body: { error: "TOKEN_NOT_FOUND" },
          }),
          expired: unauthorized({ error: "TOKEN_EXPIRED" }),
        }),
      );

      if (result._tag === "Failure") {
        const error = result.failure;

        if (error instanceof HttpResponseError) {
          return yield* error;
        }

        if (error instanceof APIError) {
          return yield* new HttpResponseError({
            status: typeof error.status === "number" ? error.status : 400,
            body: { error: "ACCOUNT_NOT_FOUND" },
          });
        }

        return yield* internalServerError({ error: "INTERNAL_ERROR" });
      }

      const now = yield* DateTime.now;
      const expiresAt = parseExpiresAt(result.success.accessTokenExpiresAt);
      const expiresIn = Option.isSome(expiresAt)
        ? Math.floor(
            (DateTime.toEpochMillis(expiresAt.value) -
              DateTime.toEpochMillis(now)) /
              1_000,
          )
        : 0;

      return {
        accessToken: result.success.accessToken,
        expiresIn,
        scopes: normalizeScopes(result.success.scopes),
      } satisfies IdpTokenResponse;
    },
  );

  return {
    buildVerifiedIdentityFromRequest,
    createRealtimeTicket,
    getCurrentUserScopes,
    getIdpTokenResponse,
    verifyRequestIdentity,
  } as const;
};

export class AuthService extends Context.Service<
  AuthService,
  ReturnType<typeof createAuthService>
>()("@lootlog/auth/AuthService") {
  static readonly layer = Layer.effect(
    AuthService,
    Effect.gen(function* () {
      const auth = yield* BetterAuthRuntime;
      const config = yield* AppConfig;
      const database = yield* AuthDatabase;
      const redis = yield* AuthRedisStorage;

      return AuthService.of(
        createAuthService({
          auth,
          appUrl: config.appUrl,
          findDiscordAccountId: (request) =>
            Effect.tryPromise({
              try: async () => {
                const rows = await database.db
                  .select({ id: authAccounts.id })
                  .from(authAccounts)
                  .where(
                    and(
                      eq(authAccounts.userId, request.userId),
                      eq(authAccounts.providerId, "discord"),
                      eq(authAccounts.accountId, request.discordId),
                    ),
                  )
                  .limit(1);
                return rows[0]?.id ?? null;
              },
              catch: (cause) => cause,
            }),
          realtimeTicketRedis: redis.client,
        }),
      );
    }),
  );
}
