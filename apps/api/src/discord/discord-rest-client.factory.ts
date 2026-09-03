import { REST } from "@discordjs/rest";
import {
  InvalidRequestError,
  DependencyUnavailableError,
  AuthenticationRequiredError,
} from "#src/shared/http/http-errors";
import { createHash } from "node:crypto";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { AuthService } from "#src/auth/auth.service";
import { AccountNotFoundError } from "#src/auth/errors/account-not-found.error";
import { AuthBadRequestError } from "#src/auth/errors/auth-bad-request.error";
import { AuthServiceUnavailableError } from "#src/auth/errors/auth-service-unavailable.error";
import { InvalidScopesError } from "#src/auth/errors/invalid-scopes.error";
import { TokenExpiredError } from "#src/auth/errors/token-expired.error";
import { Clock, Effect } from "effect";

interface CachedDiscordRestClient {
  expiresAt: number;
  rest: REST;
}

export class DiscordRestClientFactory {
  private readonly restTimeout = 5000;
  private readonly restClientCacheTtlMs = 60_000;
  private readonly restClients = new Map<string, CachedDiscordRestClient>();

  constructor(private readonly authService: AuthService) {}

  async getRestClient(userId: string, discordId: string): Promise<REST> {
    try {
      const { now, token } = await Effect.runPromise(
        Effect.all({
          now: Clock.currentTimeMillis,
          token: this.authService.getIdpToken(userId, discordId),
        }),
      );

      if (!DISCORD_AUTH_SCOPES.every((scope) => token.scopes.includes(scope))) {
        throw new InvalidScopesError(DISCORD_AUTH_SCOPES, token.scopes);
      }

      const cacheKey = this.getRestClientCacheKey(
        userId,
        discordId,
        token.accessToken,
      );
      const cachedClient = this.restClients.get(cacheKey);
      if (cachedClient && cachedClient.expiresAt > now) {
        return cachedClient.rest;
      }

      const rest = this.createRestClient(token.accessToken);

      this.restClients.set(cacheKey, {
        expiresAt: now + this.restClientCacheTtlMs,
        rest,
      });
      this.pruneExpiredRestClients(now);

      return rest;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AuthenticationRequiredError({
          message: "TOKEN_EXPIRED",
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

  private createRestClient(accessToken: string): REST {
    return new REST({
      version: "10",
      authPrefix: "Bearer",
      timeout: this.restTimeout,
      rejectOnRateLimit: ["/users"],
    }).setToken(accessToken);
  }

  private getRestClientCacheKey(
    userId: string,
    discordId: string,
    accessToken: string,
  ): string {
    const tokenHash = createHash("sha256").update(accessToken).digest("hex");

    return `${userId}:${discordId}:${tokenHash}`;
  }

  private pruneExpiredRestClients(now: number): void {
    for (const [cacheKey, cachedClient] of this.restClients.entries()) {
      if (cachedClient.expiresAt <= now) {
        this.restClients.delete(cacheKey);
      }
    }
  }
}
