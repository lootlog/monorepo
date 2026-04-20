import { HttpService } from "@nestjs/axios";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { firstValueFrom } from "rxjs";
import type { GetIdpTokenResponse } from "src/auth/types/get-idp-token-response.type";
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  AccountNotFoundError,
  AuthBadRequestError,
} from "src/auth/errors";
import { authConfig } from "src/config/auth.config";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  getAuthTokenCacheKey,
  AUTH_TOKEN_CACHE_TTL_SECONDS,
} from "src/shared/constants/cache.constant";

const DEFAULT_REQUEST_TIMEOUT = 5000;

@Injectable()
export class AuthService {
  private authServiceUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {
    this.authServiceUrl = authConfig.serviceUrl;
  }

  private async fetchIdpToken(
    userId: string,
    discordId: string,
  ): Promise<GetIdpTokenResponse> {
    try {
      const url = `${this.authServiceUrl}/auth/idp-token`;
      const response$ = this.httpService.post<GetIdpTokenResponse>(
        url,
        { userId, discordId },
        { timeout: DEFAULT_REQUEST_TIMEOUT },
      );

      const response = await firstValueFrom(response$);

      if (!response.data) {
        this.logger.log({
          level: "error",
          message: `Empty response from auth service for user ${userId}`,
        });
        throw new AuthServiceUnavailableError(
          "Empty response from auth service",
        );
      }

      return response.data;
    } catch (error) {
      if (this.isKnownAuthError(error)) {
        throw error;
      }

      if (this.isAccountNotFoundError(error)) {
        this.logger.log({
          level: "warn",
          message: `Account not found for user ${userId}`,
        });
        throw new AccountNotFoundError();
      }

      if (this.isTokenError(error)) {
        this.logger.log({
          level: "warn",
          message: `Token error for user ${userId}`,
        });
        throw new TokenExpiredError();
      }

      if (this.isClientError(error)) {
        const errorMessage = this.getErrorMessage(error);
        this.logger.log({
          level: "error",
          message: `Auth service returned client error for user ${userId}: ${errorMessage}`,
        });
        throw new AuthBadRequestError(errorMessage);
      }

      const errorMessage = this.getErrorMessage(error);
      this.logger.log({
        level: "error",
        message: `HTTP request failed for user ${userId}: ${errorMessage}`,
      });
      throw new AuthServiceUnavailableError(
        `Failed to connect to auth service: ${errorMessage}`,
      );
    }
  }

  async getIdpToken(
    userId: string,
    discordId: string,
  ): Promise<Extract<GetIdpTokenResponse, { accessToken: string }>> {
    const cacheKey = getAuthTokenCacheKey(userId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const response = await this.fetchIdpToken(userId, discordId);

      if ("error" in response) {
        if (response.error === "ACCOUNT_NOT_FOUND") {
          throw new AccountNotFoundError();
        }

        if (
          response.error === "TOKEN_NOT_FOUND" ||
          response.error === "TOKEN_EXPIRED"
        ) {
          this.logger.log({
            level: "warn",
            message: `Token error for user ${userId}: ${response.error}`,
          });
          throw new TokenExpiredError();
        }

        this.logger.log({
          level: "error",
          message: `Unknown error from auth service for user ${userId}: ${response.error}`,
        });
        throw new AuthServiceUnavailableError(
          `Auth service error: ${response.error}`,
        );
      }

      const tokenResponse = response as Extract<
        GetIdpTokenResponse,
        { accessToken: string }
      >;

      await this.redisService.set(
        cacheKey,
        JSON.stringify(tokenResponse),
        AUTH_TOKEN_CACHE_TTL_SECONDS,
      );

      return tokenResponse;
    } catch (error) {
      if (this.isKnownAuthError(error)) {
        throw error;
      }

      const errorMessage = this.getErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.log({
        level: "error",
        message: `Failed to fetch IDP token for user ${userId}: ${errorMessage}`,
        stack: errorStack,
      });
      throw new AuthServiceUnavailableError(
        `Failed to fetch IDP token: ${errorMessage}`,
      );
    }
  }

  async invalidateIdpTokenCache(userId: string): Promise<void> {
    const cacheKey = getAuthTokenCacheKey(userId);
    await this.redisService.del(cacheKey);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isKnownAuthError(error: unknown): boolean {
    return (
      error instanceof AuthServiceUnavailableError ||
      error instanceof AccountNotFoundError ||
      error instanceof TokenExpiredError ||
      error instanceof AuthBadRequestError
    );
  }

  private getErrorResponse(
    error: unknown,
  ): { status?: number; data?: unknown } | null {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof error.response === "object" &&
      error.response !== null
    ) {
      return error.response as { status?: number; data?: unknown };
    }

    return null;
  }

  private isAccountNotFoundError(error: unknown): boolean {
    const response = this.getErrorResponse(error);

    if (response?.status === 400 && response.data) {
      const data = response.data as { error?: string };
      return data.error === "ACCOUNT_NOT_FOUND";
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

    if (response?.data) {
      const data = response.data as { error?: string };
      return data.error === "TOKEN_NOT_FOUND" || data.error === "TOKEN_EXPIRED";
    }

    return false;
  }
}
