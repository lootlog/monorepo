import { REST } from "@discordjs/rest";
import {
  InvalidRequestError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "#src/shared/http/http-errors";
import {
  fingerprintAccessToken,
  type AuthService,
} from "#src/auth/auth.service";
import { AccountNotFoundError } from "#src/auth/errors/account-not-found.error";
import { AuthBadRequestError } from "#src/auth/errors/auth-bad-request.error";
import { AuthServiceUnavailableError } from "#src/auth/errors/auth-service-unavailable.error";
import { DiscordTokenRejectedError } from "#src/auth/errors/discord-token-rejected.error";
import { InvalidScopesError } from "#src/auth/errors/invalid-scopes.error";
import { TokenExpiredError } from "#src/auth/errors/token-expired.error";
import { Clock, Effect } from "effect";
import { isDiscordUnauthorizedError } from "./discord-error.util.js";

interface CachedDiscordRestClient {
  expiresAt: number;
  rest: REST;
}

export class DiscordRestClientFactory {
  private readonly restTimeout = 5000;
  private readonly restClientCacheTtlMs = 60_000;
  private readonly restClients = new Map<string, CachedDiscordRestClient>();

  constructor(
    private readonly authService: Pick<
      AuthService,
      "getIdpToken" | "rejectIdpToken"
    >,
    private readonly runPromise = Effect.runPromise,
  ) {}

  /**
   * Runs Discord requests with the user's token. When Discord answers 401 the
   * token is rejected, so later requests neither reuse it nor call Discord
   * with it again, while a token from a new sign-in is used immediately.
   */
  async withRestClient<A>(
    userId: string,
    discordId: string,
    request: (rest: REST) => Promise<A>,
  ): Promise<A> {
    const { accessToken, rest } = await this.getRestClient(userId, discordId);

    try {
      return await request(rest);
    } catch (error) {
      if (isDiscordUnauthorizedError(error)) {
        this.restClients.delete(
          this.getRestClientCacheKey(userId, discordId, accessToken),
        );
        await this.runPromise(
          this.authService.rejectIdpToken(userId, discordId, accessToken),
        );
      }

      throw error;
    }
  }

  private async getRestClient(
    userId: string,
    discordId: string,
  ): Promise<{ readonly accessToken: string; readonly rest: REST }> {
    try {
      const { now, token } = await this.runPromise(
        Effect.all(
          {
            now: Clock.currentTimeMillis,
            token: this.authService.getIdpToken(userId, discordId),
          },
          { concurrency: "unbounded" },
        ),
      );

      const cacheKey = this.getRestClientCacheKey(
        userId,
        discordId,
        token.accessToken,
      );

      const cachedClient = this.restClients.get(cacheKey);

      if (cachedClient && cachedClient.expiresAt > now) {
        return { accessToken: token.accessToken, rest: cachedClient.rest };
      }

      const rest = this.createRestClient(token.accessToken);

      this.restClients.set(cacheKey, {
        expiresAt: now + this.restClientCacheTtlMs,
        rest,
      });
      this.pruneExpiredRestClients(now);

      return { accessToken: token.accessToken, rest };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AuthenticationRequiredError({
          message: "TOKEN_EXPIRED",
          requiresReauth: true,
        });
      }

      if (error instanceof DiscordTokenRejectedError) {
        throw new AuthenticationRequiredError({
          message: "DISCORD_UNAUTHORIZED",
          requiresReauth: true,
        });
      }

      if (error instanceof AccountNotFoundError) {
        throw new AuthenticationRequiredError({
          message: "ACCOUNT_NOT_FOUND",
          requiresReauth: true,
        });
      }

      if (error instanceof InvalidScopesError) {
        throw new AuthenticationRequiredError({
          message: "INVALID_SCOPES",
          requiresReauth: true,
          required: error.required,
          actual: error.actual,
        });
      }

      if (error instanceof AuthBadRequestError) {
        throw new InvalidRequestError({
          message: "AUTH_BAD_REQUEST",
        });
      }

      if (error instanceof AuthServiceUnavailableError) {
        throw new DependencyUnavailableError({
          message: "AUTH_SERVICE_UNAVAILABLE",
          retryAfter: 60,
        });
      }

      throw error;
    }
  }

  /**
   * A REST instance registers two `setInterval` sweepers in its constructor
   * and only `clearHashSweeper`/`clearHandlerSweeper` remove them. The timers
   * keep every instance, its route caches and its bearer token reachable for
   * the process lifetime, while this factory creates one instance per user per
   * cache window. The sweepers are disabled: these clients live for
   * {@link restClientCacheTtlMs} and are pruned, so nothing needs sweeping.
   */
  private createRestClient(accessToken: string): REST {
    return new REST({
      version: "10",
      authPrefix: "Bearer",
      timeout: this.restTimeout,
      rejectOnRateLimit: ["/users"],
      hashSweepInterval: 0,
      handlerSweepInterval: 0,
    }).setToken(accessToken);
  }

  private getRestClientCacheKey(
    userId: string,
    discordId: string,
    accessToken: string,
  ): string {
    return `${userId}:${discordId}:${fingerprintAccessToken(accessToken)}`;
  }

  private pruneExpiredRestClients(now: number): void {
    for (const [cacheKey, cachedClient] of this.restClients.entries()) {
      if (cachedClient.expiresAt <= now) {
        this.restClients.delete(cacheKey);
      }
    }
  }
}
