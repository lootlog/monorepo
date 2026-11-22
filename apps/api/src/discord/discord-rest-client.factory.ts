import { REST } from "@discordjs/rest";
import {
  InvalidRequestError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "@lootlog/protocol/http/errors";
import {
  fingerprintAccessToken,
  type AuthService,
} from "#src/auth/auth.service";
import type { AuthServiceError } from "#src/auth/auth-errors";
import { Clock, Effect, Match } from "effect";
import { isDiscordUnauthorizedError } from "./discord-error.util.js";

const REST_TIMEOUT_MS = 5000;

const REST_CLIENT_CACHE_TTL_MS = 60_000;

interface CachedDiscordRestClient {
  expiresAt: number;
  rest: REST;
}

export interface DiscordRestClients {
  readonly withRestClient: <A, E>(
    userId: string,
    discordId: string,
    request: (rest: REST) => Effect.Effect<A, E>,
  ) => Effect.Effect<
    A,
    | E
    | AuthenticationRequiredError
    | InvalidRequestError
    | DependencyUnavailableError
  >;
}

const toHttpError = (error: AuthServiceError) =>
  Match.valueTags(error, {
    TokenExpiredError: () =>
      new AuthenticationRequiredError({ code: "TOKEN_EXPIRED" }),
    DiscordTokenRejectedError: () =>
      new AuthenticationRequiredError({ code: "DISCORD_UNAUTHORIZED" }),
    AccountNotFoundError: () =>
      new AuthenticationRequiredError({ code: "ACCOUNT_NOT_FOUND" }),
    InvalidScopesError: () =>
      new AuthenticationRequiredError({ code: "INVALID_SCOPES" }),
    AuthBadRequestError: () =>
      new InvalidRequestError({ code: "AUTH_BAD_REQUEST" }),
    AuthServiceUnavailableError: () =>
      new DependencyUnavailableError({
        code: "AUTH_SERVICE_UNAVAILABLE",
        retryAfterMs: 60_000,
      }),
  });

const createRestClient = (accessToken: string): REST =>
  new REST({
    version: "10",
    authPrefix: "Bearer",
    timeout: REST_TIMEOUT_MS,
    rejectOnRateLimit: ["/users"],
    hashSweepInterval: 0,
    handlerSweepInterval: 0,
  }).setToken(accessToken);

const getRestClientCacheKey = (
  userId: string,
  discordId: string,
  accessToken: string,
): string => `${userId}:${discordId}:${fingerprintAccessToken(accessToken)}`;

export const makeDiscordRestClients = (
  authService: Pick<AuthService, "getIdpToken" | "rejectIdpToken">,
): DiscordRestClients => {
  const restClients = new Map<string, CachedDiscordRestClient>();

  const pruneExpiredRestClients = (now: number): void => {
    for (const [cacheKey, cachedClient] of restClients.entries()) {
      if (cachedClient.expiresAt <= now) {
        restClients.delete(cacheKey);
      }
    }
  };

  const getRestClient = (userId: string, discordId: string) =>
    Effect.all(
      {
        now: Clock.currentTimeMillis,
        token: authService.getIdpToken(userId, discordId),
      },
      { concurrency: "unbounded" },
    ).pipe(
      Effect.mapBoth({
        onFailure: toHttpError,
        onSuccess: ({ now, token }) => {
          const cacheKey = getRestClientCacheKey(
            userId,
            discordId,
            token.accessToken,
          );

          const cachedClient = restClients.get(cacheKey);

          if (cachedClient && cachedClient.expiresAt > now) {
            return { accessToken: token.accessToken, rest: cachedClient.rest };
          }

          const rest = createRestClient(token.accessToken);

          restClients.set(cacheKey, {
            expiresAt: now + REST_CLIENT_CACHE_TTL_MS,
            rest,
          });
          pruneExpiredRestClients(now);

          return { accessToken: token.accessToken, rest };
        },
      }),
    );

  return {
    withRestClient: (userId, discordId, request) =>
      Effect.gen(function* () {
        const { accessToken, rest } = yield* getRestClient(userId, discordId);

        return yield* request(rest).pipe(
          Effect.tapError((error) =>
            isDiscordUnauthorizedError(error)
              ? Effect.sync(() =>
                  restClients.delete(
                    getRestClientCacheKey(userId, discordId, accessToken),
                  ),
                ).pipe(
                  Effect.andThen(
                    authService.rejectIdpToken(userId, discordId, accessToken),
                  ),
                )
              : Effect.void,
          ),
        );
      }),
  };
};
