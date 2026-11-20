import { Effect, Redacted, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import {
  AccountNotFoundError,
  AuthBadRequestError,
  AuthServiceUnavailableError,
  DiscordTokenRejectedError,
  InvalidScopesError,
  TokenExpiredError,
  type AuthServiceError,
} from "#src/auth/auth-errors";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import {
  getAuthTokenCacheKey,
  getRejectedAuthTokenKey,
  AUTH_TOKEN_CACHE_TTL_SECONDS,
  AUTH_TOKEN_EXPIRY_MARGIN_SECONDS,
  REJECTED_AUTH_TOKEN_TTL_SECONDS,
} from "#src/shared/cache";

const DEFAULT_REQUEST_TIMEOUT = 5000;

const IdpTokenSuccess = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: Schema.Number,
  scopes: Schema.mutable(Schema.Array(Schema.String)),
});

const IdpTokenResponse = Schema.Union([
  IdpTokenSuccess,
  Schema.Struct({ error: Schema.String }),
]);

const decodeIdpTokenResponse = Schema.decodeUnknownSync(
  Schema.fromJsonString(IdpTokenResponse),
);

const cachedIdpTokenCodec = makeJsonCodec(IdpTokenSuccess);

type IdpToken = typeof IdpTokenSuccess.Type;

/** The user's Discord access token, issued and refreshed by the auth service. */
export interface AuthService {
  readonly getIdpToken: (
    userId: string,
    discordId: string,
  ) => Effect.Effect<IdpToken, AuthServiceError>;
  /**
   * Stops serving a token Discord answered with 401 while the auth service
   * keeps returning it. Each token has its own marker, so a late rejection of
   * an older token cannot clear a newer one's, and reading the cache drops
   * only a token that is marked. A failure is logged and does not replace the
   * Discord error the caller is about to report.
   */
  readonly rejectIdpToken: (
    userId: string,
    discordId: string,
    accessToken: string,
  ) => Effect.Effect<void>;
}

export const fingerprintAccessToken = (accessToken: string) =>
  new Bun.CryptoHasher("sha256").update(accessToken).digest("hex");

const hasRequiredScopes = (token: IdpToken) =>
  DISCORD_AUTH_SCOPES.every((scope) => token.scopes.includes(scope));

class AuthHttpResponseError extends TaggedErrorClass<AuthHttpResponseError>()(
  "AuthHttpResponseError",
  {
    status: Schema.Number,
    data: Schema.UndefinedOr(IdpTokenResponse),
  },
) {
  override get message() {
    return `Request failed with status code ${this.status}`;
  }
}

const isTokenErrorCode = (data: AuthHttpResponseError["data"]) =>
  data !== undefined &&
  "error" in data &&
  (data.error === "TOKEN_NOT_FOUND" || data.error === "TOKEN_EXPIRED");

const connectionFailure = (userId: string, message: string) =>
  Effect.logError({
    message: `HTTP request failed for user ${userId}: ${message}`,
  }).pipe(
    Effect.andThen(
      Effect.fail(
        new AuthServiceUnavailableError({
          message: `Failed to connect to auth service: ${message}`,
        }),
      ),
    ),
  );

const mapResponseError = (
  userId: string,
  error: AuthHttpResponseError,
): Effect.Effect<never, AuthServiceError> =>
  Effect.gen(function* () {
    const { status, data } = error;

    if (
      status === 400 &&
      data !== undefined &&
      "error" in data &&
      data.error === "ACCOUNT_NOT_FOUND"
    ) {
      yield* Effect.logDebug({
        message: `Account not found for user ${userId}`,
      });

      return yield* Effect.fail(new AccountNotFoundError());
    }

    if (isTokenErrorCode(data)) {
      yield* Effect.logDebug({ message: `Token error for user ${userId}` });

      return yield* Effect.fail(new TokenExpiredError());
    }

    if (status === 401) {
      return yield* Effect.fail(
        new AuthServiceUnavailableError({
          message: "Auth service rejected the internal service credential",
        }),
      );
    }

    if (status >= 400 && status < 500) {
      yield* Effect.logError({
        message: `Auth service returned client error for user ${userId}: ${error.message}`,
      });

      return yield* Effect.fail(
        new AuthBadRequestError({ message: error.message }),
      );
    }

    return yield* connectionFailure(userId, error.message);
  });

export const makeAuthService = (options: {
  readonly redis: Pick<
    RedisService,
    "get" | "set" | "getJson" | "setJson" | "del"
  >;
  readonly httpClient: HttpClientValue;
  readonly authServiceUrl: URL;
  readonly idpTokenSecret?: Redacted.Redacted<string>;
}): AuthService => {
  const { redis, httpClient, idpTokenSecret } = options;
  const authServiceUrl = options.authServiceUrl.toString().replace(/\/$/, "");

  const fetchIdpToken = (userId: string, discordId: string) =>
    Effect.gen(function* () {
      const response = yield* outboundHttpRequest(httpClient, {
        adapter: "auth-idp-token",
        body: JSON.stringify({ userId, discordId }),
        headers: {
          "content-type": "application/json",
          authorization: idpTokenSecret
            ? `Bearer ${Redacted.value(idpTokenSecret)}`
            : "",
        },
        method: "POST",
        responseLimitBytes: 1024 * 1024,
        retryTimes: 0,
        timeout: `${DEFAULT_REQUEST_TIMEOUT} millis`,
        url: `${authServiceUrl}/auth/idp-token`,
      });

      const responseBody = new TextDecoder().decode(response.body);

      const data = responseBody
        ? yield* Effect.try(() => decodeIdpTokenResponse(responseBody)).pipe(
            Effect.orElseSucceed(() => undefined),
          )
        : undefined;

      if (response.status < 200 || response.status >= 300) {
        return yield* Effect.fail(
          new AuthHttpResponseError({ status: response.status, data }),
        );
      }

      if (!data) {
        yield* Effect.logError({
          message: `Empty response from auth service for user ${userId}`,
        });

        return yield* Effect.fail(
          new AuthServiceUnavailableError({
            message: "Empty response from auth service",
          }),
        );
      }

      return data;
    }).pipe(
      Effect.catchTags({
        AuthHttpResponseError: (error) => mapResponseError(userId, error),
        OutboundHttpFailure: (error) =>
          connectionFailure(userId, error.message),
      }),
    );

  const getIdpToken: AuthService["getIdpToken"] = (userId, discordId) =>
    Effect.gen(function* () {
      const cacheKey = getAuthTokenCacheKey(userId, discordId);

      const isRejected = (token: IdpToken) =>
        redis
          .get(
            getRejectedAuthTokenKey(
              userId,
              discordId,
              fingerprintAccessToken(token.accessToken),
            ),
          )
          .pipe(Effect.map((marker) => marker !== null));

      const cached = yield* redis.getJson(cacheKey, cachedIdpTokenCodec);

      if (cached && hasRequiredScopes(cached) && !(yield* isRejected(cached))) {
        return cached;
      }

      // The auth service holds the token issued by the user's latest sign-in,
      // which replaces a rejected or under-scoped one at once.
      if (cached) {
        yield* redis.del(cacheKey);
      }

      const response = yield* fetchIdpToken(userId, discordId);

      if ("error" in response) {
        if (response.error === "ACCOUNT_NOT_FOUND") {
          return yield* Effect.fail(new AccountNotFoundError());
        }

        if (
          response.error === "TOKEN_NOT_FOUND" ||
          response.error === "TOKEN_EXPIRED"
        ) {
          yield* Effect.logDebug({
            message: `Token error for user ${userId}: ${response.error}`,
          });

          return yield* Effect.fail(new TokenExpiredError());
        }

        yield* Effect.logError({
          message: `Unknown error from auth service for user ${userId}: ${response.error}`,
        });

        return yield* Effect.fail(
          new AuthServiceUnavailableError({
            message: `Auth service error: ${response.error}`,
          }),
        );
      }

      if (!hasRequiredScopes(response)) {
        return yield* Effect.fail(
          new InvalidScopesError({
            required: DISCORD_AUTH_SCOPES,
            actual: response.scopes,
          }),
        );
      }

      if (yield* isRejected(response)) {
        return yield* Effect.fail(new DiscordTokenRejectedError());
      }

      const cacheTtl = Math.min(
        AUTH_TOKEN_CACHE_TTL_SECONDS,
        response.expiresIn - AUTH_TOKEN_EXPIRY_MARGIN_SECONDS,
      );

      if (cacheTtl > 0) {
        yield* redis.setJson(cacheKey, response, cacheTtl, cachedIdpTokenCodec);
      }

      return response;
    }).pipe(
      Effect.catchTag("RedisError", (error) =>
        Effect.logError({
          message: `Failed to fetch IDP token for user ${userId}: ${error.message}`,
          stack: error.stack,
        }).pipe(
          Effect.andThen(
            Effect.fail(
              new AuthServiceUnavailableError({
                message: `Failed to fetch IDP token: ${error.message}`,
              }),
            ),
          ),
        ),
      ),
    );

  return {
    getIdpToken,
    rejectIdpToken: (userId, discordId, accessToken) =>
      redis
        .set(
          getRejectedAuthTokenKey(
            userId,
            discordId,
            fingerprintAccessToken(accessToken),
          ),
          "1",
          REJECTED_AUTH_TOKEN_TTL_SECONDS,
        )
        .pipe(
          Effect.catch((error) =>
            Effect.logWarning({
              message: `Failed to record the rejected Discord token for user ${userId}: ${error.message}`,
            }),
          ),
        ),
  };
};
