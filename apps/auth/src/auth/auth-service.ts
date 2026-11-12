import { ApiKeyService } from "#src/auth/api-key-service";
import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import type { ApiKeyAccess } from "@lootlog/schema/api-key-access";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import {
  Clock,
  Context,
  DateTime,
  Function,
  Effect,
  Layer,
  Option,
  Predicate,
  Result,
  Schema,
  type Redacted,
} from "effect";
import { AppConfig } from "#src/config/env";
import { AuthDatabase } from "#src/database/drizzle";
import { authAccounts } from "#src/database/drizzle.schema";
import {
  BetterAuthRuntime,
  type AppUserSession,
} from "#src/auth/provider/better-auth";

export interface VerifiedIdentity {
  readonly apiKeyAccess?: ApiKeyAccess;
  readonly userId: string;
  readonly discordId: string;
}

export interface AccessTokenRequest {
  readonly userId: string;
  readonly discordId: string;
}

interface IdpTokenResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly scopes: ReadonlyArray<string>;
}

export class HttpResponseError extends TaggedErrorClass<HttpResponseError>()(
  "HttpResponseError",
  {
    status: Schema.Int,
    body: Schema.Unknown,
  },
) {}

type SessionIdentity = {
  readonly user: Pick<AppUserSession["user"], "id" | "discordId">;
};

type AccessTokenPayload = {
  readonly accessToken?: string;
  readonly accessTokenExpiresAt?: string | number | Date;
  readonly scopes?: string | ReadonlyArray<unknown>;
} | null;

export interface AuthProvider {
  /** Resolved names of the session token cookie and the cookie cache cookie. */
  readonly sessionCookieNames: {
    readonly token: string;
    readonly data: string;
  };
  readonly api: {
    readonly getSession: (input: {
      headers: Headers;
    }) => Promise<SessionIdentity | null>;
    /**
     * The session plus the cookies Better Auth wants to write back, so a caller
     * can return the refreshed cookie cache to the browser.
     */
    readonly getSessionWithCookies: (input: { headers: Headers }) => Promise<{
      readonly session: SessionIdentity | null;
      readonly setCookie: ReadonlyArray<string>;
    }>;
    readonly getJwks: () => Promise<JSONWebKeySet>;
    readonly getAccessToken: (input: {
      body: { userId: string; accountId: string };
    }) => Promise<AccessTokenPayload>;
  };
}

type DiscordAccessTokenPayload = NonNullable<AccessTokenPayload> & {
  accessToken: string;
};

const hasDiscordAccessToken = (
  token: AccessTokenPayload,
): token is DiscordAccessTokenPayload =>
  Predicate.isObject(token) &&
  Predicate.isString(token.accessToken) &&
  token.accessToken.length > 0;

type AuthFailureBody =
  | { readonly message: string; readonly statusCode?: number }
  | { readonly error: string; readonly requiresReauth?: boolean };

const unauthorized = (
  body: AuthFailureBody = {
    message: "Unauthorized",
    statusCode: 401,
  },
) => new HttpResponseError({ status: 401, body });

const reauthenticationRequired = () =>
  unauthorized({
    error: "IDP_REAUTH_REQUIRED",
    requiresReauth: true,
  });

const internalServerError = (body: AuthFailureBody) =>
  new HttpResponseError({ status: 500, body });

const parseExpiresAt = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Union([Schema.String, Schema.Number, Schema.Date]),
  ),
  Option.flatMap(DateTime.make),
);

export const normalizeScopes = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Union([Schema.String, Schema.Array(Schema.Unknown)]),
  ),
  (result): ReadonlyArray<string> => {
    if (Option.isNone(result)) return [];
    const scopes = result.value;

    if (Predicate.isString(scopes)) return scopes.split(/\s+/).filter(Boolean);

    return scopes.filter(Predicate.isString);
  },
);

/**
 * How long a verified session cookie keeps its decision. One page load sends
 * the same cookie through Traefik a dozen times; a revoked session therefore
 * stays valid for at most this long on top of the cookie cache's own window.
 */
export const SESSION_DECISION_TTL_MS = 5_000;

const SESSION_DECISION_CAPACITY = 10_000;

const readCookie = (cookieHeader: string, name: string) => {
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");

    if (separator !== -1 && part.slice(0, separator).trim() === name)
      return part.slice(separator + 1).trim();
  }

  return undefined;
};

export const createAuthService = ({
  auth,
  appUrl,
  idpTokenSecret,
  findDiscordAccountId,
  verifyApiKey,
}: {
  readonly idpTokenSecret?: Redacted.Redacted<string>;
  readonly verifyApiKey?: (
    key: string,
  ) => Effect.Effect<VerifiedIdentity, HttpResponseError>;
  readonly auth: AuthProvider;
  readonly appUrl: string;
  readonly findDiscordAccountId: (
    request: AccessTokenRequest,
  ) => Effect.Effect<string | null, unknown>;
}) => {
  const getSession = Effect.fn("AuthService.getSession")((headers: Headers) =>
    Effect.tryPromise({
      try: () => auth.api.getSession({ headers }),
      catch: () => internalServerError({ message: "Internal server error" }),
    }),
  );

  const getSessionWithCookies = Effect.fn("AuthService.getSessionWithCookies")(
    (headers: Headers) =>
      Effect.tryPromise({
        try: () => auth.api.getSessionWithCookies({ headers }),
        catch: () => internalServerError({ message: "Internal server error" }),
      }),
  );

  /**
   * Without a session token cookie Better Auth has nothing to resolve, so the
   * lookup would always miss. Skipping it keeps API-key and bearer requests off
   * the session store entirely.
   */
  const hasSessionCookie = (headers: Headers) =>
    headers.get("cookie")?.includes(auth.sessionCookieNames.token) === true;

  const sessionDecisions = new Map<
    string,
    { readonly identity: VerifiedIdentity; readonly expiresAt: number }
  >();

  /** Hash of the session cookies, so the cache never holds a credential. */
  const sessionDecisionKey = (headers: Headers) => {
    const cookie = headers.get("cookie") ?? "";
    const token = readCookie(cookie, auth.sessionCookieNames.token);

    if (!token) return undefined;

    return new Bun.CryptoHasher("sha256")
      .update(token)
      .update("\0")
      .update(readCookie(cookie, auth.sessionCookieNames.data) ?? "")
      .digest("base64");
  };

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
          const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
            issuer: appUrl,
            audience: appUrl,
          });

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
  )(function* (session: SessionIdentity | null, authorizationHeader?: string) {
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
    }: {
      readonly headers: Headers;
      readonly authorizationHeader?: string;
      readonly authDiscordId?: string;
      readonly authUserId?: string;
    }) {
      if (authDiscordId || authUserId) {
        return yield* unauthorized();
      }

      if (headers.has("x-api-key")) {
        const key = headers.get("x-api-key")?.trim();

        if (!key || !verifyApiKey) return yield* unauthorized();

        return { identity: yield* verifyApiKey(key), setCookie: [] };
      }

      // Only a successful session decision is remembered, and only when it
      // carries no cookie refresh: a refusal must flip as soon as the user
      // signs in, and the refresh has to reach the browser.
      const decisionKey = authorizationHeader
        ? undefined
        : sessionDecisionKey(headers);

      const now = yield* Clock.currentTimeMillis;

      const remembered = decisionKey
        ? sessionDecisions.get(decisionKey)
        : undefined;

      if (remembered && remembered.expiresAt > now)
        return { identity: remembered.identity, setCookie: [] };

      // The cookie cache keeps the session store out of the common path. Its
      // refresh only reaches the browser when this response carries it back.
      const {
        session,
        setCookie,
      }: {
        readonly session: SessionIdentity | null;
        readonly setCookie: ReadonlyArray<string>;
      } = hasSessionCookie(headers)
        ? yield* getSessionWithCookies(headers)
        : { session: null, setCookie: [] };

      const verifiedIdentity = yield* buildVerifiedIdentityFromRequest(
        session,
        authorizationHeader,
      );

      if (!verifiedIdentity) {
        return yield* unauthorized();
      }

      const identity: VerifiedIdentity = verifiedIdentity;

      if (decisionKey && session && setCookie.length === 0) {
        if (sessionDecisions.size >= SESSION_DECISION_CAPACITY) {
          for (const [key, decision] of sessionDecisions)
            if (decision.expiresAt <= now) sessionDecisions.delete(key);

          if (sessionDecisions.size >= SESSION_DECISION_CAPACITY)
            sessionDecisions.clear();
        }

        sessionDecisions.set(decisionKey, {
          identity,
          expiresAt: now + SESSION_DECISION_TTL_MS,
        });
      }

      return { identity, setCookie };
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
            missing: reauthenticationRequired(),
            expired: reauthenticationRequired(),
          },
        ),
      );

      if (Result.isFailure(result)) {
        const error = result.failure;

        if (error instanceof HttpResponseError) {
          return yield* error;
        }

        if (error instanceof APIError) {
          return yield* reauthenticationRequired();
        }

        return yield* internalServerError({
          error: "Failed to retrieve IDP token",
        });
      }

      return normalizeScopes(result.success.scopes);
    },
  );

  const getIdpTokenResponse = Effect.fn("AuthService.getIdpTokenResponse")(
    function* (request: AccessTokenRequest, authorizationHeader?: string) {
      if (!hasServiceAuthorization(authorizationHeader, idpTokenSecret)) {
        return yield* unauthorized();
      }

      const result = yield* Effect.result(
        getDiscordAccessTokenOrThrow(request, {
          missing: new HttpResponseError({
            status: 400,
            body: { error: "TOKEN_NOT_FOUND" },
          }),
          expired: unauthorized({ error: "TOKEN_EXPIRED" }),
        }),
      );

      if (Result.isFailure(result)) {
        const error = result.failure;

        if (error instanceof HttpResponseError) {
          return yield* error;
        }

        if (error instanceof APIError) {
          return yield* new HttpResponseError({
            status: Schema.is(Schema.Number)(error.status) ? error.status : 400,
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
      const apiKeys = yield* ApiKeyService;
      const config = yield* AppConfig;
      const database = yield* AuthDatabase;

      return AuthService.of(
        createAuthService({
          auth,
          verifyApiKey: apiKeys.verify,
          appUrl: config.appUrl,
          idpTokenSecret: config.idpTokenSecret,
          findDiscordAccountId: (request) =>
            database
              .select({ id: authAccounts.id })
              .from(authAccounts)
              .where(
                and(
                  eq(authAccounts.userId, request.userId),
                  eq(authAccounts.providerId, "discord"),
                  eq(authAccounts.accountId, request.discordId),
                ),
              )
              .limit(1)
              .pipe(Effect.map((rows) => rows[0]?.id ?? null)),
        }),
      );
    }),
  );
}
