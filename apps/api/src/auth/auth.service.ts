import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { GetIdpTokenResponse } from "#src/auth/get-idp-token-response";
import { AccountNotFoundError } from "#src/auth/errors/account-not-found.error";
import { AuthBadRequestError } from "#src/auth/errors/auth-bad-request.error";
import { AuthServiceUnavailableError } from "#src/auth/errors/auth-service-unavailable.error";
import { TokenExpiredError } from "#src/auth/errors/token-expired.error";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import {
  getAuthTokenCacheKey,
  getAuthTokenCachePattern,
  getLegacyAuthTokenCacheKey,
  AUTH_TOKEN_CACHE_TTL_SECONDS,
} from "#src/shared/cache";

const DEFAULT_REQUEST_TIMEOUT = 5000;
const IdpTokenSuccess = Schema.Struct({
  accessToken: Schema.String,
  expiresIn: Schema.Number,
  scopes: Schema.mutable(Schema.Array(Schema.String)),
});
const IdpTokenResponseJson = Schema.fromJsonString(
  Schema.Union([IdpTokenSuccess, Schema.Struct({ error: Schema.String })]),
);
const decodeIdpTokenResponse = Schema.decodeUnknownSync(IdpTokenResponseJson);
const cachedIdpTokenCodec = makeJsonCodec(IdpTokenSuccess);

type IdpToken = Extract<GetIdpTokenResponse, { accessToken: string }>;
type AuthServiceError =
  | AccountNotFoundError
  | AuthBadRequestError
  | AuthServiceUnavailableError
  | TokenExpiredError;

class AuthHttpResponseError extends Error {
  constructor(
    readonly response: {
      readonly status: number;
      readonly data: GetIdpTokenResponse | undefined;
    },
  ) {
    super(`Request failed with status code ${response.status}`);
  }
}

export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly httpClient: HttpClientValue,
    authServiceUrl: URL,
  ) {
    this.authServiceUrl = authServiceUrl.toString().replace(/\/$/, "");
  }

  private fetchIdpToken(
    userId: string,
    discordId: string,
  ): Effect.Effect<GetIdpTokenResponse, AuthServiceError> {
    return Effect.gen({ self: this }, function* () {
      const url = `${this.authServiceUrl}/auth/idp-token`;
      const response = yield* outboundHttpRequest(this.httpClient, {
        adapter: "auth-idp-token",
        body: JSON.stringify({ userId, discordId }),
        headers: { "content-type": "application/json" },
        method: "POST",
        responseLimitBytes: 1024 * 1024,
        retryTimes: 0,
        timeout: `${DEFAULT_REQUEST_TIMEOUT} millis`,
        url,
      });
      const responseBody = new TextDecoder().decode(response.body);
      let data: GetIdpTokenResponse | undefined;
      if (responseBody) {
        try {
          data = decodeIdpTokenResponse(responseBody);
        } catch {
          data = undefined;
        }
      }
      if (response.status < 200 || response.status >= 300) {
        return yield* Effect.fail(
          new AuthHttpResponseError({
            status: response.status,
            data,
          }),
        );
      }

      if (!data) {
        this.logger.log({
          level: "error",
          message: `Empty response from auth service for user ${userId}`,
        });
        return yield* Effect.fail(
          new AuthServiceUnavailableError("Empty response from auth service"),
        );
      }

      return data;
    }).pipe(
      Effect.catch((error) => Effect.fail(this.mapFetchError(userId, error))),
    );
  }

  getIdpToken(
    userId: string,
    discordId: string,
  ): Effect.Effect<IdpToken, AuthServiceError> {
    return Effect.gen({ self: this }, function* () {
      const cacheKey = getAuthTokenCacheKey(userId, discordId);
      const cached = yield* Effect.tryPromise(() =>
        this.redisService.getJson(cacheKey, cachedIdpTokenCodec),
      );

      if (cached) {
        return cached;
      }

      const response = yield* this.fetchIdpToken(userId, discordId);

      if ("error" in response) {
        if (response.error === "ACCOUNT_NOT_FOUND") {
          return yield* Effect.fail(new AccountNotFoundError());
        }

        if (
          response.error === "TOKEN_NOT_FOUND" ||
          response.error === "TOKEN_EXPIRED"
        ) {
          this.logger.log({
            level: "warn",
            message: `Token error for user ${userId}: ${response.error}`,
          });
          return yield* Effect.fail(new TokenExpiredError());
        }

        this.logger.log({
          level: "error",
          message: `Unknown error from auth service for user ${userId}: ${response.error}`,
        });
        return yield* Effect.fail(
          new AuthServiceUnavailableError(
            `Auth service error: ${response.error}`,
          ),
        );
      }

      yield* Effect.tryPromise(() =>
        this.redisService.setJson(
          cacheKey,
          response,
          AUTH_TOKEN_CACHE_TTL_SECONDS,
          cachedIdpTokenCodec,
        ),
      );

      return response;
    }).pipe(
      Effect.catch((error) => Effect.fail(this.mapTokenError(userId, error))),
    );
  }

  invalidateIdpTokenCache(
    userId: string,
    discordId?: string,
  ): Effect.Effect<void, AuthServiceUnavailableError> {
    const invalidate = discordId
      ? Effect.tryPromise(() =>
          this.redisService.del(getAuthTokenCacheKey(userId, discordId)),
        )
      : Effect.tryPromise(() =>
          Promise.all([
            this.redisService.deleteByPattern(getAuthTokenCachePattern(userId)),
            this.redisService.del(getLegacyAuthTokenCacheKey(userId)),
          ]),
        ).pipe(Effect.asVoid);

    return invalidate.pipe(
      Effect.mapError(
        (error) =>
          new AuthServiceUnavailableError(
            `Failed to invalidate IDP token cache: ${this.getErrorMessage(error)}`,
          ),
      ),
    );
  }

  private mapFetchError(userId: string, error: unknown): AuthServiceError {
    if (this.isKnownAuthError(error)) {
      return error;
    }

    if (this.isAccountNotFoundError(error)) {
      this.logger.log({
        level: "warn",
        message: `Account not found for user ${userId}`,
      });
      return new AccountNotFoundError();
    }

    if (this.isTokenError(error)) {
      this.logger.log({
        level: "warn",
        message: `Token error for user ${userId}`,
      });
      return new TokenExpiredError();
    }

    if (this.isClientError(error)) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.log({
        level: "error",
        message: `Auth service returned client error for user ${userId}: ${errorMessage}`,
      });
      return new AuthBadRequestError(errorMessage);
    }

    const errorMessage = this.getErrorMessage(error);
    this.logger.log({
      level: "error",
      message: `HTTP request failed for user ${userId}: ${errorMessage}`,
    });
    return new AuthServiceUnavailableError(
      `Failed to connect to auth service: ${errorMessage}`,
    );
  }

  private mapTokenError(userId: string, error: unknown): AuthServiceError {
    if (this.isKnownAuthError(error)) {
      return error;
    }

    const errorMessage = this.getErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.log({
      level: "error",
      message: `Failed to fetch IDP token for user ${userId}: ${errorMessage}`,
      stack: errorStack,
    });
    return new AuthServiceUnavailableError(
      `Failed to fetch IDP token: ${errorMessage}`,
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isKnownAuthError(error: unknown): error is AuthServiceError {
    return (
      error instanceof AuthServiceUnavailableError ||
      error instanceof AccountNotFoundError ||
      error instanceof TokenExpiredError ||
      error instanceof AuthBadRequestError
    );
  }

  private getErrorResponse(
    error: unknown,
  ): AuthHttpResponseError["response"] | undefined {
    return error instanceof AuthHttpResponseError ? error.response : undefined;
  }

  private isAccountNotFoundError(error: unknown): boolean {
    const response = this.getErrorResponse(error);

    if (response?.status === 400 && response.data && "error" in response.data) {
      return response.data.error === "ACCOUNT_NOT_FOUND";
    }

    return false;
  }

  private isClientError(error: unknown): boolean {
    const response = this.getErrorResponse(error);

    return (
      response?.status !== undefined &&
      response.status >= 400 &&
      response.status < 500
    );
  }

  private isTokenError(error: unknown): boolean {
    const response = this.getErrorResponse(error);

    if (response?.data && "error" in response.data) {
      return (
        response.data.error === "TOKEN_NOT_FOUND" ||
        response.data.error === "TOKEN_EXPIRED"
      );
    }

    return false;
  }
}
