import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import type { AuthRpcGroup } from "@lootlog/rpc/auth";
import type { ServiceRpcClient } from "@lootlog/rpc/client";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { Effect, Schema } from "effect";
import {
  AccountNotFoundError,
  AuthBadRequestError,
  AuthServiceUnavailableError,
  DiscordTokenRejectedError,
  InvalidScopesError,
  TokenExpiredError,
  type AuthServiceError,
} from "#src/auth/auth-errors";
import type { RedisService } from "#src/redis/redis.service";
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
  expiresIn: Schema.Finite,
  scopes: Schema.mutable(Schema.Array(Schema.String)),
});

const cachedIdpTokenCodec = makeJsonCodec(IdpTokenSuccess);

type IdpToken = typeof IdpTokenSuccess.Type;

export interface AuthService {
  readonly getIdpToken: (
    userId: string,
    discordId: string,
  ) => Effect.Effect<IdpToken, AuthServiceError>;
  readonly rejectIdpToken: (
    userId: string,
    discordId: string,
    accessToken: string,
  ) => Effect.Effect<void>;
}

type AuthIdpRpcClient = Pick<
  ServiceRpcClient<typeof AuthRpcGroup>,
  "getIdpToken"
>;

export const fingerprintAccessToken = (accessToken: string) =>
  new Bun.CryptoHasher("sha256").update(accessToken).digest("hex");

const hasRequiredScopes = (token: IdpToken) =>
  DISCORD_AUTH_SCOPES.every((scope) => token.scopes.includes(scope));

const isTokenErrorCode = (reason: string | undefined) =>
  reason === "TOKEN_NOT_FOUND" || reason === "TOKEN_EXPIRED";

const connectionFailure = (userId: string, message: string) =>
  Effect.logError({
    message: `RPC request failed for user ${userId}: ${message}`,
  }).pipe(
    Effect.andThen(
      Effect.fail(
        new AuthServiceUnavailableError({
          message: `Failed to connect to auth service: ${message}`,
        }),
      ),
    ),
  );

export const makeAuthService = (options: {
  readonly redis: Pick<
    RedisService,
    "get" | "set" | "getJson" | "setJson" | "del"
  >;
  readonly authRpc: AuthIdpRpcClient;
}): AuthService => {
  const { redis, authRpc } = options;

  const fetchIdpToken = (
    userId: string,
    discordId: string,
  ): Effect.Effect<IdpToken, AuthServiceError> =>
    authRpc.getIdpToken({ userId, discordId }).pipe(
      Effect.timeout(`${DEFAULT_REQUEST_TIMEOUT} millis`),
      Effect.map((result): IdpToken => ({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        scopes: [...result.scopes],
      })),
      Effect.catchTags({
        RpcBadRequestError: (error) => {
          if (error.message === "ACCOUNT_NOT_FOUND") {
            return Effect.fail(new AccountNotFoundError());
          }

          if (isTokenErrorCode(error.message)) {
            return Effect.fail(new TokenExpiredError());
          }

          return Effect.fail(
            new AuthBadRequestError({
              message: error.message ?? "Bad request",
            }),
          );
        },
        RpcUnauthorizedError: (error) => {
          if (isTokenErrorCode(error.message)) {
            return Effect.fail(new TokenExpiredError());
          }

          return Effect.fail(
            new AuthServiceUnavailableError({
              message: error.message ?? "Auth service rejected request",
            }),
          );
        },
        TimeoutError: () => connectionFailure(userId, "Request timed out"),
        RpcUnavailableError: (error) =>
          connectionFailure(
            userId,
            error.message ?? "Auth service unavailable",
          ),
        RpcCallerRejectedError: () =>
          connectionFailure(userId, "Auth service rejected the API as caller"),
        RpcClientError: (error) =>
          connectionFailure(userId, error.message || "Auth RPC error"),
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

      if (cached) {
        yield* redis.del(cacheKey);
      }

      const response = yield* fetchIdpToken(userId, discordId);

      if (!hasRequiredScopes(response)) {
        return yield* new InvalidScopesError({
          required: DISCORD_AUTH_SCOPES,
          actual: response.scopes,
        });
      }

      if (yield* isRejected(response)) {
        return yield* new DiscordTokenRejectedError();
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
