import { OperationError } from "@lootlog/instrumentation/operation";
import { ApiKeyService } from "#src/auth/api-key-service";
import {
  hasServiceAuthorization,
  readBearerToken,
} from "@lootlog/protocol/http/service-auth";
import {
  API_KEY_HEADER,
  type ApiKeyAccess,
} from "@lootlog/schema/api-key-access";
import {
  ApplicationError,
  AuthenticationRequiredError,
  InvalidRequestError,
  ReauthenticationRequired,
  UnexpectedApplicationError,
} from "@lootlog/protocol/http/errors";
import {
  parsePlatformRoles,
  type PlatformRole,
} from "@lootlog/schema/platform-roles";
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
  readonly roles?: ReadonlyArray<PlatformRole>;
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

type SessionIdentity = {
  readonly user: Pick<AppUserSession["user"], "id" | "discordId"> & {
    readonly role?: string | null | undefined;
  };
};

type AccessTokenPayload = {
  readonly accessToken?: string;
  readonly accessTokenExpiresAt?: string | number | Date;
  readonly scopes?: string | ReadonlyArray<unknown>;
} | null;

export interface AuthProvider {
  readonly sessionCookieNames: {
    readonly token: string;
    readonly data: string;
  };
  readonly api: {
    readonly getSession: (input: {
      headers: Headers;
    }) => Promise<SessionIdentity | null>;
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

const unauthorized = () => new AuthenticationRequiredError();

const tokenExpired = () =>
  new AuthenticationRequiredError({ code: "TOKEN_EXPIRED" });

const reauthenticationRequired = () =>
  new ReauthenticationRequired({
    code: "IDP_REAUTH_REQUIRED",
    requiresReauth: true,
  });

const internalServerError = (message: string) =>
  new UnexpectedApplicationError({ message });

const parseExpiresAt = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Union([Schema.String, Schema.Finite, Schema.Date]),
  ),
  Option.flatMap(DateTime.make),
);

const normalizeScopes = Function.compose(
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
  ) => Effect.Effect<VerifiedIdentity, ApplicationError>;
  readonly auth: AuthProvider;
  readonly appUrl: string;
  readonly findDiscordAccountId: (
    request: AccessTokenRequest,
  ) => Effect.Effect<string | null, unknown>;
}) => {
  const getSession = Effect.fn("AuthService.getSession")((headers: Headers) =>
    Effect.tryPromise({
      try: () => auth.api.getSession({ headers }),
      catch: () => internalServerError("Session lookup failed"),
    }),
  );

  const getSessionWithCookies = Effect.fn("AuthService.getSessionWithCookies")(
    (headers: Headers) =>
      Effect.tryPromise({
        try: () => auth.api.getSessionWithCookies({ headers }),
        catch: () => internalServerError("Session lookup failed"),
      }),
  );

  const hasSessionCookie = (headers: Headers) =>
    headers.get("cookie")?.includes(auth.sessionCookieNames.token) === true;

  const sessionDecisions = new Map<
    string,
    { readonly identity: VerifiedIdentity; readonly expiresAt: number }
  >();

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
      const jwks = yield* Effect.tryPromise(() => auth.api.getJwks()).pipe(
        Effect.orElseSucceed(() => null),
      );

      if (!jwks) {
        return null;
      }

      return yield* Effect.tryPromise(async () => {
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
          roles: parsePlatformRoles(
            Predicate.isString(payload.role) ? payload.role : undefined,
          ),
        } satisfies VerifiedIdentity;
      }).pipe(Effect.orElseSucceed(() => null));
    },
  );

  const buildVerifiedIdentityFromRequest = Effect.fn(
    "AuthService.buildVerifiedIdentityFromRequest",
  )(function* (session: SessionIdentity | null, authorizationHeader?: string) {
    if (session) {
      return {
        userId: session.user.id,
        discordId: session.user.discordId,
        roles: parsePlatformRoles(session.user.role),
      } satisfies VerifiedIdentity;
    }

    const token = readBearerToken(authorizationHeader);

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

      if (headers.has(API_KEY_HEADER)) {
        const key = headers.get(API_KEY_HEADER)?.trim();

        if (!key || !verifyApiKey) return yield* unauthorized();

        return { identity: yield* verifyApiKey(key), setCookie: [] };
      }

      const decisionKey = authorizationHeader
        ? undefined
        : sessionDecisionKey(headers);

      const now = yield* Clock.currentTimeMillis;

      const remembered = decisionKey
        ? sessionDecisions.get(decisionKey)
        : undefined;

      if (remembered && remembered.expiresAt > now)
        return { identity: remembered.identity, setCookie: [] };

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
        catch: (cause) =>
          cause instanceof APIError
            ? cause
            : new OperationError({
                operation: "auth.discord.getAccessToken",
                cause,
              }),
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
      readonly missing: ApplicationError | ReauthenticationRequired;
      readonly expired: ApplicationError | ReauthenticationRequired;
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

        if (
          error instanceof ApplicationError ||
          error instanceof ReauthenticationRequired
        ) {
          return yield* error;
        }

        if (error instanceof APIError) {
          return yield* reauthenticationRequired();
        }

        return yield* internalServerError("Failed to retrieve IDP token");
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
          missing: new InvalidRequestError({ code: "TOKEN_NOT_FOUND" }),
          expired: tokenExpired(),
        }),
      );

      if (Result.isFailure(result)) {
        const error = result.failure;

        if (error instanceof ApplicationError) {
          return yield* error;
        }

        if (error instanceof APIError) {
          const code = error.body?.code;

          if (code === "ACCOUNT_NOT_FOUND") {
            return yield* new InvalidRequestError({
              code: "ACCOUNT_NOT_FOUND",
            });
          }

          if (code === "FAILED_TO_GET_ACCESS_TOKEN") {
            return yield* tokenExpired();
          }
        }

        return yield* internalServerError("Failed to retrieve IDP token");
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
